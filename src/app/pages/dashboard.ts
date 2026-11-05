import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService, errorText } from '../core/api.service';
import { Summary } from '../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe],
  template: `
    <div class="row spread"><h1>Dashboard</h1><button class="ghost" (click)="load()">Refresh</button></div>
    @if (error()) { <div class="msg err">{{ error() }}</div> }
    @if (s(); as s) {
      <div class="grid">
        <div class="stat"><b>{{ s.onlineDevices }} / {{ s.totalDevices }}</b><span>Phones online</span></div>
        <div class="stat"><b>{{ s.activeCampaigns }}</b><span>Active campaigns</span></div>
        <div class="stat"><b>{{ s.smsSubmitted }}</b><span>SMS sent</span></div>
        <div class="stat"><b>{{ s.smsFailed }}</b><span>SMS failed</span></div>
        <div class="stat"><b>{{ s.callsToday }}</b><span>Calls today</span></div>
        <div class="stat"><b>{{ s.answeredCalls }}</b><span>Calls answered</span></div>
        <div class="stat"><b>{{ s.emailsAccepted }}</b><span>Emails sent</span></div>
        <div class="stat"><b>{{ s.emailsFailed }}</b><span>Emails failed</span></div>
      </div>
      <div class="card">
        <h2>Recent activity</h2>
        @if (!(s.recentActivity ?? []).length) { <p class="muted">Nothing yet.</p> }
        <div class="scroll"><table>
          @for (a of (s.recentActivity ?? []); track $index) {
            <tr><td>{{ a.timestamp | date: 'short' }}</td><td><span class="badge">{{ a.type }}</span></td><td>{{ a.title }}</td><td class="muted">{{ a.detail }}</td></tr>
          }
        </table></div>
      </div>
    }`
})
export class DashboardPage implements OnInit {
  private api = inject(ApiService);
  s = signal<Summary | null>(null);
  error = signal('');
  ngOnInit() { this.load(); }
  load() {
    this.api.summary().subscribe({ next: v => { this.s.set(v); this.error.set(''); }, error: e => this.error.set(errorText(e)) });
  }
}
