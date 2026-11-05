import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService, errorText } from '../core/api.service';
import { Device } from '../core/models';

@Component({
  selector: 'app-devices',
  imports: [DatePipe],
  template: `
    <div class="row spread"><h1>Devices</h1>
      <div class="row"><button class="ghost" (click)="load()">Refresh</button><button (click)="newCode()">New pairing code</button></div>
    </div>
    @if (error()) { <div class="msg err">{{ error() }}</div> }
    @if (code()) {
      <div class="msg ok">Pairing code: <b style="font-size:1.3rem;letter-spacing:2px">{{ code() }}</b>
        (valid until {{ expires() | date: 'shortTime' }}). On the phone: Pair this device, then enter this code.</div>
    }
    <div class="card scroll">
      @if (!devices().length) { <p class="muted">No phone is paired yet. Create a pairing code and enter it in the Veylora Device app.</p> }
      <table>
        <tr><th>Name</th><th>Status</th><th>Last seen</th><th></th></tr>
        @for (d of devices(); track d.id) {
          <tr>
            <td>{{ d.name }}<br><span class="muted">{{ d.manufacturer }} {{ d.model }} · id {{ d.id }}</span></td>
            <td><span class="badge" [class]="'badge ' + shown(d)">{{ shown(d) }}</span></td>
            <td>{{ d.lastSeenAt ? (d.lastSeenAt | date: 'medium') : 'never' }}</td>
            <td class="row">
              @if (d.status !== 'DISABLED') { <button class="ghost" (click)="disable(d)">Disable</button> }
              <button class="danger" (click)="remove(d)">Delete</button>
            </td>
          </tr>
        }
      </table>
      <p class="muted">A phone counts as online if it contacted the server in the last 90 seconds. The agent on the phone must be ON.</p>
    </div>`
})
export class DevicesPage implements OnInit, OnDestroy {
  private api = inject(ApiService);
  devices = signal<Device[]>([]);
  error = signal('');
  code = signal('');
  expires = signal('');
  private timer?: any;

  ngOnInit() { this.load(); this.timer = setInterval(() => this.load(), 15000); }
  ngOnDestroy() { clearInterval(this.timer); }

  /** The status in the database can lag behind, so judge by the last heartbeat. */
  shown(d: Device): string {
    if (d.status === 'DISABLED') return 'DISABLED';
    if (!d.lastSeenAt) return 'OFFLINE';
    // The server sends its local time without a zone, so this is right when the browser and server share a time zone.
    const last = new Date(d.lastSeenAt).getTime();
    return Date.now() - last < 90_000 ? 'ONLINE' : 'OFFLINE';
  }

  load() { this.api.devices().subscribe({ next: v => { this.devices.set(v); this.error.set(''); }, error: e => this.error.set(errorText(e)) }); }
  newCode() { this.api.pairingCode().subscribe({ next: r => { this.code.set(r.code); this.expires.set(r.expiresAt); }, error: e => this.error.set(errorText(e)) }); }
  disable(d: Device) { if (confirm(`Disable ${d.name}? It will stop receiving tasks.`)) this.api.disableDevice(d.id).subscribe({ next: () => this.load(), error: e => this.error.set(errorText(e)) }); }
  remove(d: Device) { if (confirm(`Delete ${d.name}? The phone must be paired again.`)) this.api.deleteDevice(d.id).subscribe({ next: () => this.load(), error: e => this.error.set(errorText(e)) }); }
}
