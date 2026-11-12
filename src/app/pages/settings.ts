import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errorText } from '../core/api.service';
import { MailSettings } from '../core/models';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  template: `
    <h1>Settings</h1>
    @if (message()) { <div class="msg" [class.ok]="ok()" [class.err]="!ok()">{{ message() }}</div> }
    <div class="card">
      <h2>Email I send from</h2>
      @if (s(); as m) {
        @if (m.custom) {
          <p>Your emails go out from <b>{{ m.email }}</b>.</p>
        } @else if (m.defaultAvailable) {
          <p class="muted">You have not added your own email, so the server's default email is used. Add yours below to send from it.</p>
        } @else {
          <p class="muted">No email is set up yet. Add yours below to send campaigns.</p>
        }
      }
      <label>Your email (Gmail address)</label>
      <input [(ngModel)]="email" placeholder="you@gmail.com" autocomplete="off">
      <label>App password (16 characters, not your normal Gmail password)</label>
      <input type="password" [(ngModel)]="password" placeholder="{{ s()?.custom ? 'Leave empty to keep the saved one' : 'abcd efgh ijkl mnop' }}" autocomplete="new-password">
      <p class="muted">Google Account, Security, turn on 2-Step Verification, then App passwords. The password is checked with Google when you save, and stored encrypted. It is never shown again.</p>
      <details style="margin:8px 0"><summary class="muted">Other provider (not Gmail)</summary>
        <label>SMTP host</label><input [(ngModel)]="host" placeholder="smtp.gmail.com">
        <label>Port</label><input type="number" [(ngModel)]="port" placeholder="587">
      </details>
      <div class="row" style="margin-top:12px">
        <button (click)="save()" [disabled]="busy()">Save and check</button>
        @if (s()?.custom) { <button class="danger" (click)="remove()" [disabled]="busy()">Remove my email</button> }
      </div>
    </div>
    <div class="card">
      <h2>Send a test email</h2>
      <label>Send to</label>
      <input [(ngModel)]="testTo" placeholder="any email address">
      <div class="row" style="margin-top:12px"><button class="ghost" (click)="test()" [disabled]="busy()">Send test</button></div>
    </div>`
})
export class SettingsPage implements OnInit {
  private api = inject(ApiService);
  s = signal<MailSettings | null>(null);
  busy = signal(false);
  message = signal('');
  ok = signal(false);
  email = ''; password = ''; host = ''; port: number | null = null; testTo = '';

  ngOnInit() { this.load(); }

  private say(t: string, ok: boolean) { this.message.set(t); this.ok.set(ok); }
  private apply(m: MailSettings) {
    this.s.set(m);
    this.email = m.email ?? '';
    this.host = m.custom && m.host !== 'smtp.gmail.com' ? (m.host ?? '') : '';
    this.port = m.custom && m.port !== 587 ? m.port : null;
    this.password = '';
  }
  load() { this.api.mailSettings().subscribe({ next: m => this.apply(m), error: e => this.say(errorText(e), false) }); }

  save() {
    if (!this.email.trim()) return this.say('Enter your email address.', false);
    this.busy.set(true);
    this.api.saveMailSettings({ email: this.email.trim(), password: this.password, host: this.host.trim() || undefined, port: this.port ?? undefined }).subscribe({
      next: m => { this.busy.set(false); this.apply(m); this.say('Saved. Your campaigns will now be sent from ' + m.email + '.', true); },
      error: e => { this.busy.set(false); this.say(errorText(e), false); }
    });
  }
  remove() {
    if (!confirm('Remove your email? Campaigns will use the server default email again.')) return;
    this.busy.set(true);
    this.api.removeMailSettings().subscribe({
      next: m => { this.busy.set(false); this.apply(m); this.say('Removed.', true); },
      error: e => { this.busy.set(false); this.say(errorText(e), false); }
    });
  }
  test() {
    if (!this.testTo.trim()) return this.say('Enter an address to send the test to.', false);
    this.busy.set(true);
    this.api.testMail(this.testTo.trim()).subscribe({
      next: () => { this.busy.set(false); this.say('Test email sent. Check the inbox (and spam).', true); },
      error: e => { this.busy.set(false); this.say(errorText(e), false); }
    });
  }
}
