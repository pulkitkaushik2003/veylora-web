import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService, errorText } from '../core/api.service';
import { CallLog, Email, Sms } from '../core/models';

@Component({
  selector: 'app-logs',
  imports: [DatePipe],
  template: `
    <div class="row spread"><h1>Logs</h1><button class="ghost" (click)="load()">Refresh</button></div>
    @if (error()) { <div class="msg err">{{ error() }}</div> }
    <div class="tabs">
      <button [class.ghost]="tab() !== 'sms'" (click)="tab.set('sms')">SMS</button>
      <button [class.ghost]="tab() !== 'calls'" (click)="tab.set('calls')">Calls</button>
      <button [class.ghost]="tab() !== 'emails'" (click)="tab.set('emails')">Emails</button>
    </div>
    <div class="card scroll">
      @if (tab() === 'sms') {
        <table><tr><th>Time</th><th>To</th><th>Message</th><th>Status</th></tr>
          @for (m of sms(); track m.id) { <tr><td>{{ m.createdAt | date: 'short' }}</td><td>{{ m.recipientPhone }}</td><td>{{ m.messageBody }}<br><span class="muted">{{ m.errorMessage }}</span></td><td><span class="badge" [class]="'badge ' + m.status">{{ m.status }}</span></td></tr> }
        </table>
      }
      @if (tab() === 'calls') {
        <table><tr><th>Time</th><th>Number</th><th>Direction</th><th>Duration</th><th>Status</th></tr>
          @for (c of calls(); track c.id) { <tr><td>{{ c.createdAt | date: 'short' }}</td><td>{{ c.phoneNumber }}</td><td>{{ c.callType }}</td><td>{{ c.durationSeconds ?? 0 }}s</td><td><span class="badge" [class]="'badge ' + c.status">{{ c.status }}</span></td></tr> }
        </table>
      }
      @if (tab() === 'emails') {
        <table><tr><th>Time</th><th>To</th><th>Subject</th><th>Status</th></tr>
          @for (e of emails(); track e.id) { <tr><td>{{ e.createdAt | date: 'short' }}</td><td>{{ e.recipientEmail }}</td><td>{{ e.subject }}<br><span class="muted">{{ e.errorMessage }}</span></td><td><span class="badge" [class]="'badge ' + e.status">{{ e.status }}</span></td></tr> }
        </table>
      }
    </div>`
})
export class LogsPage implements OnInit {
  private api = inject(ApiService);
  tab = signal<'sms' | 'calls' | 'emails'>('sms');
  sms = signal<Sms[]>([]); calls = signal<CallLog[]>([]); emails = signal<Email[]>([]);
  error = signal('');
  ngOnInit() { this.load(); }
  load() {
    const fail = (e: any) => this.error.set(errorText(e));
    this.api.sms().subscribe({ next: v => this.sms.set(v), error: fail });
    this.api.calls().subscribe({ next: v => this.calls.set(v), error: fail });
    this.api.emails().subscribe({ next: v => this.emails.set(v), error: fail });
  }
}
