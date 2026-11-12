import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorText } from '../core/api.service';
import { Campaign, CampaignType, Device, Template } from '../core/models';
import { importRecipients } from '../core/import-file';

@Component({
  selector: 'app-campaigns',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="row spread"><h1>Campaigns</h1>
      <div class="row"><button class="ghost" (click)="load()">Refresh</button><button (click)="showForm.set(!showForm())">{{ showForm() ? 'Close' : 'New campaign' }}</button></div>
    </div>
    @if (message()) { <div class="msg" [class.ok]="ok()" [class.err]="!ok()">{{ message() }}</div> }

    @if (showForm()) {
      <div class="card">
        <h2>New campaign</h2>
        <label>Name</label><input [(ngModel)]="f.name">
        <label>Type</label>
        <select [(ngModel)]="f.type"><option>SMS</option><option>CALL</option><option>EMAIL</option></select>

        @if (true) {
          @if (templatesFor().length) {
            <label>Use a saved template</label>
            <select (change)="useTemplate($any($event.target).value)">
              <option value="">Choose...</option>
              @for (t of templatesFor(); track t.id) { <option [value]="t.id">{{ t.name }}</option> }
            </select>
          }
          @if (f.type === 'EMAIL') { <label>Subject</label><input [(ngModel)]="f.emailSubject"> }
          <label>{{ f.type === 'CALL' ? 'Message spoken after the call starts' : 'Message' }} ({{ '{{name}}' }}, {{ '{{phone}}' }} and {{ '{{email}}' }} are filled in per person)</label>
          <textarea [(ngModel)]="f.messageBody"></textarea>
        }

        <label>{{ f.type === 'EMAIL' ? 'Email addresses' : 'Phone numbers' }} (one per line, or "Name,{{ f.type === 'EMAIL' ? 'a@x.com' : '+911234567890' }}")</label>
        <textarea [(ngModel)]="numbers" style="min-height:120px"></textarea>
        <div class="row" style="margin-top:8px">
          <label style="margin:0">Or load from Excel / CSV (columns: name, {{ f.type === 'EMAIL' ? 'email' : 'phone' }})</label>
          <input type="file" accept=".xlsx,.csv,.txt" (change)="loadFile($any($event.target))" style="width:auto">
        </div>
        @if (importNote()) { <p class="muted">{{ importNote() }}</p> }

        @if (f.type === 'CALL') {
          <label>Place calls with</label>
          <select [(ngModel)]="f.callVia">
            <option value="PHONE">My phone (SIM, free)</option>
            <option value="EXOTEL">Exotel (calling service, plays the message when answered)</option>
          </select>
          @if (f.callVia === 'EXOTEL') {
            <label>Exotel app (flow) id</label>
            <input [(ngModel)]="f.exotelAppId" placeholder="e.g. 1234567 (the flow that plays your message)">
            <p class="muted">Make the flow in your Exotel dashboard (Greeting or Play applet, then Hangup). The message text above is not used for Exotel calls.</p>
          }
        }
        @if (f.type !== 'EMAIL' && !(f.type === 'CALL' && f.callVia === 'EXOTEL')) {
          <label>Phone</label>
          <select [(ngModel)]="f.selectedDeviceId">
            @for (d of devices(); track d.id) { <option [value]="'' + d.id">{{ d.name }}</option> }
          </select>
          <label>SIM slot (empty = phone default)</label>
          <select [(ngModel)]="f.selectedSimSlot"><option [ngValue]="undefined">Default</option><option [ngValue]="1">SIM 1</option><option [ngValue]="2">SIM 2</option></select>
        }
        @if (f.type === 'EMAIL') {
          <label>Personal documents: a .zip (or several PDF/JPG/PNG files), one per person</label>
          <input type="file" multiple accept=".zip,.pdf,.jpg,.jpeg,.png" (change)="pickZip($any($event.target))">
          @if (zipFiles.length) { <p class="muted">{{ zipFiles.length }} file(s): {{ zipNames() }}</p> }
          <p class="muted">In the Excel/CSV add a third column called <b>document</b> with the file name for each person (for example cert_rahul.pdf).
            After creating, each file is matched to its email and sent only to that person.</p>
          @if (docPairs.length) { <p class="muted">{{ docPairs.length }} document name(s) read from the sheet.</p> }
          <label>Attach files (PDF, JPG, PNG. Max 5 files, 5 MB each, 10 MB total)</label>
          <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" (change)="pickFiles($any($event.target))">
          @if (files.length) { <p class="muted">{{ files.length }} file(s): {{ fileNames() }}</p> }
        }
        <div class="row">
          <div style="flex:1;min-width:140px"><label>Max per minute (1-60)</label><input type="number" [(ngModel)]="f.rateLimitPerMinute" min="1" max="60"></div>
          <div style="flex:1;min-width:140px"><label>Retries (0-5)</label><input type="number" [(ngModel)]="f.maxRetries" min="0" max="5"></div>
          <div style="flex:1;min-width:140px"><label>Minutes before retry</label><input type="number" [(ngModel)]="f.retryDelayMinutes" min="0"></div>
        </div>
        @if (f.type === 'CALL') { <label><input type="checkbox" [(ngModel)]="f.retryOnNoAnswer" style="width:auto"> Retry when not answered</label> }
        <div class="row" style="margin-top:14px"><button (click)="create()" [disabled]="busy()">Create campaign</button></div>
      </div>
    }

    <div class="card scroll">
      @if (!campaigns().length) { <p class="muted">No campaigns yet.</p> }
      <table>
        <tr><th>Name</th><th>Status</th><th>Progress</th><th></th></tr>
        @for (c of campaigns(); track c.id) {
          <tr>
            <td><a [routerLink]="['/campaigns', c.id]">{{ c.name }}</a><br><span class="muted">{{ c.type }}</span></td>
            <td><span class="badge" [class]="'badge ' + c.status">{{ c.status }}</span></td>
            <td>{{ c.successfulCount }} done · {{ c.failedCount }} failed · {{ c.totalRecipients }} total
              <div class="bar"><i [style.width.%]="pct(c)"></i></div></td>
            <td class="row">
              @if (c.status === 'DRAFT' || c.status === 'SCHEDULED') { <button (click)="act(c, 'start')">Start</button> }
              @if (c.status === 'RUNNING') { <button class="ghost" (click)="act(c, 'pause')">Pause</button> }
              @if (c.status === 'PAUSED') { <button (click)="act(c, 'resume')">Resume</button> }
              @if (c.status !== 'COMPLETED' && c.status !== 'FAILED') { <button class="ghost" (click)="act(c, 'cancel')">Cancel</button> }
              @if (c.failedCount > 0) { <button class="ghost" (click)="act(c, 'retry-failed')">Retry failed</button> }
              @if (c.status !== 'RUNNING') { <button class="danger" (click)="remove(c)">Delete</button> }
            </td>
          </tr>
        }
      </table>
    </div>`
})
export class CampaignsPage implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  campaigns = signal<Campaign[]>([]);
  devices = signal<Device[]>([]);
  templates = signal<Template[]>([]);
  showForm = signal(false);
  busy = signal(false);
  message = signal('');
  ok = signal(false);
  numbers = '';
  files: File[] = [];
  zipFiles: File[] = [];
  docPairs: { email: string; file: string }[] = [];
  importNote = signal('');
  f: any = this.blank();
  private timer?: any;

  private blank() {
    return { name: '', type: 'SMS' as CampaignType, messageBody: '', emailSubject: '', rateLimitPerMinute: 5, maxRetries: 1, retryDelayMinutes: 1, retryOnNoAnswer: false, selectedDeviceId: '', selectedSimSlot: undefined, callVia: 'PHONE', exotelAppId: '' };
  }

  ngOnInit() {
    this.load();
    this.api.devices().subscribe(d => { this.devices.set(d); if (d.length === 1) this.f.selectedDeviceId = '' + d[0].id; });
    this.api.templates().subscribe(t => this.templates.set(t));
    this.timer = setInterval(() => this.load(), 5000);
  }
  ngOnDestroy() { clearInterval(this.timer); }

  fileNames() { return this.files.map(f => f.name).join(', '); }
  zipNames() { return this.zipFiles.map(f => f.name).join(', '); }
  pickZip(input: HTMLInputElement) { this.zipFiles = Array.from(input.files ?? []); }
  pickFiles(input: HTMLInputElement) { this.files = Array.from(input.files ?? []); }

  async loadFile(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const r = await importRecipients(file, this.f.type === 'EMAIL' ? 'EMAIL' : 'PHONE');
      this.numbers = [this.numbers.trim(), ...r.lines].filter(Boolean).join('\n');
      if (r.docs?.length) this.docPairs = [...this.docPairs, ...r.docs];
      this.importNote.set(`Loaded ${r.lines.length} rows from ${file.name}` + (r.skipped ? `, ${r.skipped} skipped (not a valid ${this.f.type === 'EMAIL' ? 'email' : 'phone number'})` : '') + (r.docs?.length ? `, ${r.docs.length} document name(s) found` : '') + '. Check the box above before creating.');
    } catch (e: any) {
      this.importNote.set(e?.message || 'Could not read that file.');
    }
    input.value = '';
  }

  templatesFor() { return this.templates().filter(t => t.channel === this.f.type); }
  useTemplate(id: string) {
    const t = this.templates().find(x => '' + x.id === id);
    if (t) { this.f.messageBody = t.body; this.f.emailSubject = t.subject ?? ''; }
  }
  pct(c: Campaign) { return c.totalRecipients ? Math.min(100, Math.round(((c.successfulCount + c.failedCount) / c.totalRecipients) * 100)) : 0; }
  private say(t: string, ok: boolean) { this.message.set(t); this.ok.set(ok); }

  load() { this.api.campaigns().subscribe({ next: v => this.campaigns.set(v), error: e => this.say(errorText(e), false) }); }

  create() {
    const isEmail = this.f.type === 'EMAIL';
    const recipients = this.parse(this.numbers, isEmail);
    if (!this.f.name.trim()) return this.say('Give the campaign a name.', false);
    if (!recipients.length) return this.say(isEmail ? 'Add at least one email address.' : 'Add at least one phone number.', false);
    const body: any = {
      name: this.f.name.trim(), type: this.f.type,
      rateLimitPerMinute: this.f.rateLimitPerMinute, maxRetries: this.f.maxRetries,
      retryDelayMinutes: this.f.retryDelayMinutes, retryOnNoAnswer: !!this.f.retryOnNoAnswer
    };
    if (this.f.messageBody.trim()) body.messageBody = this.f.messageBody;
    if (isEmail) body.emailSubject = this.f.emailSubject;
    const viaExotel = this.f.type === 'CALL' && this.f.callVia === 'EXOTEL';
    if (viaExotel) {
      if (!String(this.f.exotelAppId).trim()) return this.say('Enter the Exotel app (flow) id.', false);
      body.selectedAiAgentId = 'exotel:' + String(this.f.exotelAppId).trim();
    }
    if (!isEmail && !viaExotel && this.f.selectedDeviceId) body.selectedDeviceId = this.f.selectedDeviceId;
    if (!isEmail && !viaExotel && this.f.selectedSimSlot) body.selectedSimSlot = this.f.selectedSimSlot;

    this.busy.set(true);
    this.api.createCampaign(body).subscribe({
      next: c => this.api.addRecipients(c.id, recipients).subscribe({
        next: async r => {
          const note = `Campaign created with ${r.added} recipients` + (r.invalid ? `, ${r.invalid} invalid skipped` : '') + (r.duplicates ? `, ${r.duplicates} duplicates skipped` : '');
          let failed = '';
          for (const file of this.files) {
            try { await firstValueFrom(this.api.uploadAttachment(c.id, file)); }
            catch (e) { failed += ` ${file.name}: ${errorText(e)}`; }
          }
          let docNote = '';
          let docBad = false;
          if (isEmail && (this.zipFiles.length || this.docPairs.length)) {
            try {
              if (this.zipFiles.length) {
                const u = await firstValueFrom(this.api.uploadPersonal(c.id, this.zipFiles));
                docNote += `, ${u.added + u.replaced} document(s) uploaded` + (u.skipped.length ? ` (${u.skipped.length} skipped: ${u.skipped.slice(0, 3).join('; ')})` : '');
              }
              if (this.docPairs.length) await firstValueFrom(this.api.saveDocList(c.id, this.docPairs));
              const m = await firstValueFrom(this.api.checkPersonal(c.id));
              docNote += `, ${m.matched} of ${m.recipients} matched with a document`;
              if (m.missingCount) { docNote += `. NOT matched (${m.missingCount}): ${m.missingSample.slice(0, 5).join(', ')}. Fix before pressing Start`; docBad = true; }
            } catch (e) { docNote += '. Documents failed: ' + errorText(e); docBad = true; }
          }
          this.busy.set(false);
          this.say(note + docNote + (this.files.length ? `, ${this.files.length - (failed ? 1 : 0)} file(s) attached` : '') + '. Press Start when ready.' + (failed ? ' Some files were not attached:' + failed : ''), !failed && !docBad);
          this.f = this.blank(); this.numbers = ''; this.files = []; this.zipFiles = []; this.docPairs = []; this.importNote.set(''); this.showForm.set(false); this.load();
        },
        error: e => { this.busy.set(false); this.say('Campaign created but adding recipients failed: ' + errorText(e), false); this.load(); }
      }),
      error: e => { this.busy.set(false); this.say(errorText(e), false); }
    });
  }

  /** Same rules as the phone app: "x", "name,x", or several values on a line split by , or ; */
  private parse(text: string, email: boolean) {
    const isNum = /^\+?[0-9][0-9 ()\-.]{5,}$/;
    const isMail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const ok = (t: string) => (email ? isMail.test(t) : isNum.test(t));
    const out: { name?: string; phoneNumber?: string; email?: string }[] = [];
    for (const line of text.split('\n')) {
      const parts = line.split(/[,;]/).map(p => p.trim()).filter(Boolean);
      const addr = parts.filter(ok);
      const names = parts.filter(p => !ok(p));
      for (const a of addr) {
        const r: any = email ? { email: a } : { phoneNumber: a };
        if (addr.length === 1 && names.length === 1) r.name = names[0];
        out.push(r);
      }
    }
    return out;
  }

  act(c: Campaign, action: 'start' | 'pause' | 'resume' | 'cancel' | 'retry-failed') {
    if (action === 'cancel' && !confirm(`Cancel "${c.name}"? Waiting recipients will not be contacted.`)) return;
    this.api.campaignAction(c.id, action).subscribe({ next: () => { this.message.set(''); this.load(); }, error: e => this.say(errorText(e), false) });
  }
  remove(c: Campaign) {
    if (confirm(`Delete "${c.name}" and its recipient list?`)) this.api.deleteCampaign(c.id).subscribe({ next: () => this.load(), error: e => this.say(errorText(e), false) });
  }
}
