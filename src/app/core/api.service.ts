import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AddResult, Attachment, MailSettings, AudioAsset, Campaign, MatchReport, PersonalFileInfo, UploadResult, CallLog, CreateCampaign, Device, Email, Recipient, Sms, Summary, Template, User
} from './models';

/** Every call to the Veylora backend. Paths are relative, so the dev proxy (proxy.conf.json) forwards them. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // auth
  csrf() { return this.http.get<{ token: string }>('/api/v1/auth/csrf'); }
  login(email: string, password: string) { return this.http.post<User>('/api/v1/auth/login', { email, password }); }
  register(name: string, email: string, password: string) { return this.http.post<User>('/api/v1/auth/register', { name, email, password }); }
  logout() { return this.http.post<void>('/api/v1/auth/logout', {}); }

  // the user's own sending mailbox
  mailSettings() { return this.http.get<MailSettings>('/api/v1/mail-settings'); }
  saveMailSettings(body: { email: string; password: string; host?: string; port?: number }) { return this.http.put<MailSettings>('/api/v1/mail-settings', body); }
  removeMailSettings() { return this.http.delete<MailSettings>('/api/v1/mail-settings'); }
  testMail(to: string) { return this.http.post<{ status: string }>('/api/v1/mail-settings/test', { to }); }

  // dashboard
  summary() { return this.http.get<Summary>('/api/v1/dashboard/summary'); }

  // devices
  devices() { return this.http.get<Device[]>('/api/v1/devices'); }
  pairingCode() { return this.http.post<{ code: string; expiresAt: string }>('/api/v1/devices/pairing-codes', {}); }
  disableDevice(id: number) { return this.http.patch<Device>(`/api/v1/devices/${id}/disable`, {}); }
  deleteDevice(id: number) { return this.http.delete<void>(`/api/v1/devices/${id}`); }

  // campaigns
  campaigns() { return this.http.get<Campaign[]>('/api/v1/campaigns'); }
  campaign(id: number) { return this.http.get<Campaign>(`/api/v1/campaigns/${id}`); }
  createCampaign(body: CreateCampaign) { return this.http.post<Campaign>('/api/v1/campaigns', body); }
  addRecipients(id: number, recipients: { name?: string; phoneNumber?: string; email?: string }[]) {
    return this.http.post<AddResult>(`/api/v1/campaigns/${id}/recipients`, { recipients });
  }
  recipients(id: number) { return this.http.get<Recipient[]>(`/api/v1/campaigns/${id}/recipients`); }
  campaignAction(id: number, action: 'start' | 'pause' | 'resume' | 'cancel' | 'retry-failed'): Observable<Campaign> {
    return this.http.post<Campaign>(`/api/v1/campaigns/${id}/${action}`, {});
  }
  deleteCampaign(id: number) { return this.http.delete<void>(`/api/v1/campaigns/${id}`); }

  // email attachments
  attachments(id: number) { return this.http.get<Attachment[]>(`/api/v1/campaigns/${id}/attachments`); }
  uploadAttachment(id: number, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Attachment>(`/api/v1/campaigns/${id}/attachments`, form);
  }
  deleteAttachment(id: number, attachmentId: number) { return this.http.delete<void>(`/api/v1/campaigns/${id}/attachments/${attachmentId}`); }

  // personal files (one file per person, e.g. certificates)
  personalFiles(id: number) { return this.http.get<PersonalFileInfo[]>(`/api/v1/campaigns/${id}/personal-files`); }
  uploadPersonal(id: number, files: File[]) {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    return this.http.post<UploadResult>(`/api/v1/campaigns/${id}/personal-files`, form);
  }
  saveDocList(id: number, pairs: { email: string; file: string }[]) { return this.http.put<{ saved: number; skipped: number }>(`/api/v1/campaigns/${id}/personal-files/mapping`, { pairs }); }
  checkPersonal(id: number) { return this.http.get<MatchReport>(`/api/v1/campaigns/${id}/personal-files/check`); }
  deleteAllPersonal(id: number) { return this.http.delete<void>(`/api/v1/campaigns/${id}/personal-files`); }

  // audio library
  audios() { return this.http.get<AudioAsset[]>('/api/v1/audio'); }
  uploadAudio(title: string, language: string, file: File) {
    const form = new FormData();
    form.append('title', title);
    form.append('language', language);
    form.append('file', file);
    return this.http.post<AudioAsset>('/api/v1/audio', form);
  }
  createTtsScript(title: string, language: string, ttsScript: string) {
    return this.http.post<AudioAsset>('/api/v1/audio/tts', { title, language, ttsScript, voiceName: 'Phone voice' });
  }
  deleteAudio(id: number) { return this.http.delete<void>(`/api/v1/audio/${id}`); }

  // templates
  templates() { return this.http.get<Template[]>('/api/v1/templates'); }
  createTemplate(t: { name: string; channel: string; subject?: string; body: string }) { return this.http.post<Template>('/api/v1/templates', t); }
  deleteTemplate(id: number) { return this.http.delete<void>(`/api/v1/templates/${id}`); }

  // history
  sms() { return this.http.get<Sms[]>('/api/v1/sms'); }
  calls() { return this.http.get<CallLog[]>('/api/v1/call-logs'); }
  emails() { return this.http.get<Email[]>('/api/v1/emails'); }
}

/** Turns an HTTP error into a sentence for the screen. */
export function errorText(e: any): string {
  if (e?.status === 0) return 'Cannot reach the backend. Check that the API service is running and API_URL is configured.';
  return e?.error?.message || `Request failed (HTTP ${e?.status ?? '?'}).`;
}