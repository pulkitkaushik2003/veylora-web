import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errorText } from '../core/api.service';
import { AudioAsset } from '../core/models';

@Component({
  selector: 'app-audio',
  imports: [FormsModule],
  template: `
    <h1>Audio</h1>
    <p class="muted">Messages for call campaigns. Upload a recording (MP3 or WAV, up to 10 MB), or save a text that is spoken aloud.</p>
    @if (message()) { <div class="msg" [class.ok]="ok()" [class.err]="!ok()">{{ message() }}</div> }

    <div class="card">
      <h2>Upload a recording</h2>
      <label>Title</label><input [(ngModel)]="title">
      <label>Language</label>
      <select [(ngModel)]="language"><option value="hi-IN">Hindi</option><option value="en-IN">English (India)</option><option value="en-US">English (US)</option></select>
      <label>File (.mp3 or .wav)</label>
      <input type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" (change)="pick($any($event.target))">
      <div class="row" style="margin-top:14px"><button (click)="upload()" [disabled]="busy()">Upload</button></div>
    </div>

    <div class="card">
      <h2>Save a spoken text</h2>
      <label>Title</label><input [(ngModel)]="ttsTitle">
      <label>Language</label>
      <select [(ngModel)]="ttsLanguage"><option value="hi-IN">Hindi</option><option value="en-IN">English (India)</option><option value="en-US">English (US)</option></select>
      <label>Text ({{ '{{name}}' }} is replaced with the person's name)</label>
      <textarea [(ngModel)]="script"></textarea>
      <div class="row" style="margin-top:14px"><button (click)="saveScript()" [disabled]="busy()">Save text</button></div>
    </div>

    <div class="card scroll">
      <h2>Your audio</h2>
      @if (!items().length) { <p class="muted">Nothing yet.</p> }
      <table>
        <tr><th>Title</th><th>Type</th><th>Language</th><th>Listen / text</th><th></th></tr>
        @for (a of items(); track a.id) {
          <tr>
            <td>{{ a.title }}<br><span class="muted">id {{ a.id }} · {{ a.type === 'UPLOADED_AUDIO' ? kb(a.fileSizeBytes) + ' KB' : 'text' }}</span></td>
            <td><span class="badge">{{ a.type === 'UPLOADED_AUDIO' ? 'RECORDING' : 'TEXT' }}</span></td>
            <td>{{ a.language }}</td>
            <td>@if (a.audioUrl) { <audio controls preload="none" [src]="a.audioUrl" style="max-width:240px"></audio> } @else { {{ a.ttsScript }} }</td>
            <td><button class="danger" (click)="remove(a)">Delete</button></td>
          </tr>
        }
      </table>
    </div>`
})
export class AudioPage implements OnInit {
  private api = inject(ApiService);
  items = signal<AudioAsset[]>([]);
  busy = signal(false);
  message = signal(''); ok = signal(true);
  title = ''; language = 'hi-IN'; file: File | null = null;
  ttsTitle = ''; ttsLanguage = 'hi-IN'; script = '';

  ngOnInit() { this.load(); }
  load() { this.api.audios().subscribe({ next: v => this.items.set(v), error: e => this.say(errorText(e), false) }); }
  kb(n: number) { return Math.max(1, Math.round(n / 1024)); }
  pick(input: HTMLInputElement) { this.file = input.files?.[0] ?? null; }
  private say(t: string, ok: boolean) { this.message.set(t); this.ok.set(ok); }

  upload() {
    if (!this.title.trim() || !this.file) return this.say('Enter a title and choose a file.', false);
    this.busy.set(true);
    this.api.uploadAudio(this.title.trim(), this.language, this.file).subscribe({
      next: () => { this.busy.set(false); this.say('Uploaded.', true); this.title = ''; this.file = null; this.load(); },
      error: e => { this.busy.set(false); this.say(errorText(e), false); }
    });
  }
  saveScript() {
    if (!this.ttsTitle.trim() || !this.script.trim()) return this.say('Enter a title and the text.', false);
    this.busy.set(true);
    this.api.createTtsScript(this.ttsTitle.trim(), this.ttsLanguage, this.script).subscribe({
      next: () => { this.busy.set(false); this.say('Saved.', true); this.ttsTitle = ''; this.script = ''; this.load(); },
      error: e => { this.busy.set(false); this.say(errorText(e), false); }
    });
  }
  remove(a: AudioAsset) {
    if (confirm(`Delete "${a.title}"?`)) this.api.deleteAudio(a.id).subscribe({ next: () => this.load(), error: e => this.say(errorText(e), false) });
  }
}
