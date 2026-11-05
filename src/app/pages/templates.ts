import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errorText } from '../core/api.service';
import { Template } from '../core/models';

@Component({
  selector: 'app-templates',
  imports: [FormsModule],
  template: `
    <h1>Templates</h1>
    @if (message()) { <div class="msg" [class.ok]="ok()" [class.err]="!ok()">{{ message() }}</div> }
    <div class="card">
      <h2>New template</h2>
      <label>Name</label><input [(ngModel)]="name">
      <label>Channel</label><select [(ngModel)]="channel"><option>SMS</option><option>EMAIL</option></select>
      @if (channel === 'EMAIL') { <label>Subject</label><input [(ngModel)]="subject"> }
      <label>Text ({{ '{{name}}' }}, {{ '{{phone}}' }}, {{ '{{email}}' }} are filled in per person)</label>
      <textarea [(ngModel)]="body"></textarea>
      <div class="row" style="margin-top:14px"><button (click)="save()">Save template</button></div>
    </div>
    <div class="card scroll">
      @if (!items().length) { <p class="muted">No templates yet.</p> }
      <table>
        <tr><th>Name</th><th>Channel</th><th>Text</th><th></th></tr>
        @for (t of items(); track t.id) {
          <tr><td>{{ t.name }}</td><td><span class="badge">{{ t.channel }}</span></td>
            <td>@if (t.subject) { <b>{{ t.subject }}</b><br> }{{ t.body }}</td>
            <td><button class="danger" (click)="remove(t)">Delete</button></td></tr>
        }
      </table>
    </div>`
})
export class TemplatesPage implements OnInit {
  private api = inject(ApiService);
  items = signal<Template[]>([]);
  message = signal(''); ok = signal(false);
  name = ''; channel = 'SMS'; subject = ''; body = '';

  ngOnInit() { this.load(); }
  load() { this.api.templates().subscribe({ next: v => this.items.set(v), error: e => this.say(errorText(e), false) }); }
  private say(t: string, ok: boolean) { this.message.set(t); this.ok.set(ok); }

  save() {
    this.api.createTemplate({ name: this.name, channel: this.channel, subject: this.channel === 'EMAIL' ? this.subject : undefined, body: this.body }).subscribe({
      next: () => { this.say('Template saved.', true); this.name = ''; this.subject = ''; this.body = ''; this.load(); },
      error: e => this.say(errorText(e), false)
    });
  }
  remove(t: Template) { if (confirm(`Delete template "${t.name}"?`)) this.api.deleteTemplate(t.id).subscribe({ next: () => this.load(), error: e => this.say(errorText(e), false) }); }
}
