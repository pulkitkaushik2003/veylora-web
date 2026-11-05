import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, errorText } from '../core/api.service';
import { Attachment, Campaign, MatchReport, PersonalFileInfo, Recipient } from '../core/models';
import { importDocList } from '../core/import-file';

@Component({
  selector: 'app-campaign-detail',
  imports: [RouterLink],
  template: `
    <p><a routerLink="/campaigns">&larr; All campaigns</a></p>
    @if (error()) { <div class="msg err">{{ error() }}</div> }
    @if (c(); as c) {
      <div class="row spread"><h1>{{ c.name }}</h1><span class="badge" [class]="'badge ' + c.status">{{ c.status }}</span></div>
      <div class="grid">
        <div class="stat"><b>{{ c.totalRecipients }}</b><span>Recipients</span></div>
        <div class="stat"><b>{{ c.successfulCount }}</b><span>Done</span></div>
        <div class="stat"><b>{{ c.failedCount }}</b><span>Failed</span></div>
        <div class="stat"><b>{{ c.rateLimitPerMinute ?? 5 }}/min</b><span>Speed</span></div>
      </div>
      @if (c.emailSubject) { <div class="card"><b>Subject:</b> {{ c.emailSubject }}</div> }
      @if (c.messageBody) { <div class="card"><b>Message:</b><br>{{ c.messageBody }}</div> }
    }
    @if (c()?.type === 'EMAIL') {
      <div class="card">
        <h2>Attached files</h2>
        @if (!files().length) { <p class="muted">No files attached.</p> }
        @for (a of files(); track a.id) {
          <div class="row spread" style="margin-bottom:6px"><span>{{ a.fileName }} <span class="muted">({{ kb(a.sizeBytes) }} KB)</span></span>
            @if (c()?.status !== 'RUNNING') { <button class="danger" (click)="removeFile(a)">Remove</button> }</div>
        }
        @if (c()?.status !== 'RUNNING' && c()?.status !== 'COMPLETED') {
          <label>Add a file (PDF, JPG, PNG, max 5 MB)</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" (change)="add($any($event.target))">
        }
      </div>
    }
    @if (c()?.type === 'EMAIL') {
      <div class="card">
        <h2>Personal file for each person (for example certificates)</h2>
        <p class="muted">Upload one PDF per person, or a .zip of them. Name each file like the person's <b>email</b> (rahul&#64;x.com.pdf),
          or like their <b>name</b> (Rahul Sharma.pdf) if every name in the list is different. Each person gets only their own file.</p>
        @if (info()) { <div class="msg" [class.ok]="infoOk()" [class.err]="!infoOk()">{{ info() }}</div> }
        <p><b>{{ personal().length }}</b> personal file(s) uploaded.</p>
        @if (c()?.status !== 'RUNNING' && c()?.status !== 'COMPLETED') {
          <input type="file" multiple accept=".pdf,.zip,.jpg,.jpeg,.png" (change)="uploadPersonal($any($event.target))">
        }
        @if (c()?.status !== 'RUNNING' && c()?.status !== 'COMPLETED') {
          <p class="muted" style="margin-top:12px">Or give a <b>document list</b> (Excel/CSV with two columns: email, file name). Each person gets the uploaded file with the name listed next to their email.</p>
          <input type="file" accept=".xlsx,.csv,.txt" (change)="uploadDocList($any($event.target))">
        }
        @if (personal().length) {
          <div class="row" style="margin-top:10px">
            <button class="ghost" (click)="check()">Check matching</button>
            @if (c()?.status !== 'RUNNING') { <button class="danger" (click)="clearPersonal()">Remove all personal files</button> }
          </div>
        }
        @if (report(); as r) {
          <p><b>{{ r.matched }}</b> of {{ r.recipients }} recipients have a file.
            @if (r.missingCount) { <span style="color:var(--bad)">{{ r.missingCount }} have none</span> }</p>
          @if (r.missingSample.length) { <p class="muted">No file for: {{ r.missingSample.join(', ') }}{{ r.missingCount > r.missingSample.length ? ' ...' : '' }}</p> }
          @if (r.unusedFiles.length) { <p class="muted">Files that match nobody: {{ r.unusedFiles.join(', ') }}</p> }
        }
      </div>
    }
    <div class="card scroll">
      <h2>Recipients</h2>
      <table>
        <tr><th>Name</th><th>To</th><th>Status</th><th>Attempts</th><th>Last error</th></tr>
        @for (r of recipients(); track r.id) {
          <tr><td>{{ r.name || '-' }}</td><td>{{ r.email || r.phoneNumber }}</td>
            <td><span class="badge" [class]="'badge ' + r.status">{{ r.status }}</span></td>
            <td>{{ r.attempts }}</td><td class="muted">{{ r.lastError }}</td></tr>
        }
      </table>
    </div>`
})
export class CampaignDetailPage implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  c = signal<Campaign | null>(null);
  recipients = signal<Recipient[]>([]);
  files = signal<Attachment[]>([]);
  personal = signal<PersonalFileInfo[]>([]);
  report = signal<MatchReport | null>(null);
  info = signal('');
  infoOk = signal(true);
  error = signal('');
  private timer?: any;

  ngOnInit() { this.load(); this.timer = setInterval(() => this.load(), 5000); }
  ngOnDestroy() { clearInterval(this.timer); }

  uploadPersonal(input: HTMLInputElement) {
    const list = Array.from(input.files ?? []);
    if (!list.length) return;
    this.info.set('Uploading...'); this.infoOk.set(true);
    this.api.uploadPersonal(this.id(), list).subscribe({
      next: r => {
        this.info.set(`${r.added} added` + (r.replaced ? `, ${r.replaced} replaced` : '') + (r.skipped.length ? `, ${r.skipped.length} skipped: ${r.skipped.slice(0, 5).join('; ')}` : '') + '.');
        this.infoOk.set(!r.skipped.length);
        this.load(); this.check();
      },
      error: e => { this.info.set(errorText(e)); this.infoOk.set(false); }
    });
    input.value = '';
  }
  async uploadDocList(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const { pairs, skipped } = await importDocList(file);
      if (!pairs.length) { this.info.set('No rows found. The sheet needs an email column and a file name column.'); this.infoOk.set(false); return; }
      this.api.saveDocList(this.id(), pairs).subscribe({
        next: r => {
          this.info.set(`Document list saved: ${r.saved} email(s)` + (skipped + r.skipped ? `, ${skipped + r.skipped} row(s) skipped` : '') + '. Upload the documents too (names must match the list), then press Check matching.');
          this.infoOk.set(!(skipped + r.skipped));
          this.check();
        },
        error: e => { this.info.set(errorText(e)); this.infoOk.set(false); }
      });
    } catch (e: any) { this.info.set(e?.message || 'Could not read that file.'); this.infoOk.set(false); }
  }
  check() { this.api.checkPersonal(this.id()).subscribe({ next: r => this.report.set(r), error: e => { this.info.set(errorText(e)); this.infoOk.set(false); } }); }
  clearPersonal() {
    if (confirm('Remove all personal files of this campaign?')) this.api.deleteAllPersonal(this.id()).subscribe({ next: () => { this.report.set(null); this.load(); }, error: e => this.error.set(errorText(e)) });
  }
  kb(n: number) { return Math.max(1, Math.round(n / 1024)); }
  private id() { return Number(this.route.snapshot.paramMap.get('id')); }
  add(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    this.api.uploadAttachment(this.id(), file).subscribe({ next: () => { this.error.set(''); this.load(); }, error: e => this.error.set(errorText(e)) });
    input.value = '';
  }
  removeFile(a: Attachment) {
    this.api.deleteAttachment(this.id(), a.id).subscribe({ next: () => this.load(), error: e => this.error.set(errorText(e)) });
  }

  load() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.campaign(id).subscribe({ next: v => { this.c.set(v); this.error.set(''); }, error: e => this.error.set(errorText(e)) });
    this.api.recipients(id).subscribe({ next: v => this.recipients.set(v), error: () => {} });
    this.api.attachments(id).subscribe({ next: v => this.files.set(v), error: () => {} });
    this.api.personalFiles(id).subscribe({ next: v => this.personal.set(v), error: () => {} });
  }
}
