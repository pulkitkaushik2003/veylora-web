export interface User { id: number; name: string; email: string; role: string; }

export interface Device {
  id: number; deviceUid: string; name: string; model: string; manufacturer: string; platform: string;
  status: 'REGISTERED' | 'ONLINE' | 'OFFLINE' | 'DISABLED'; lastSeenAt: string | null; createdAt: string;
}

export type CampaignType = 'SMS' | 'CALL' | 'EMAIL';
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PAUSED' | 'FAILED';

export interface Campaign {
  id: number; name: string; description: string | null; type: CampaignType; status: CampaignStatus;
  scheduledAt: string | null; startedAt: string | null; completedAt: string | null;
  totalRecipients: number; successfulCount: number; failedCount: number;
  rateLimitPerMinute: number | null; maxRetries: number | null; retryDelayMinutes: number | null;
  retryOnNoAnswer: boolean | null; selectedDeviceId: string | null; selectedSimSlot: number | null;
  messageBody: string | null; emailSubject: string | null; createdAt: string;
}

export interface CreateCampaign {
  name: string; type: CampaignType; messageBody?: string; emailSubject?: string;
  rateLimitPerMinute: number; maxRetries: number; retryDelayMinutes: number; retryOnNoAnswer: boolean;
  selectedDeviceId?: string; selectedSimSlot?: number;
}

export interface Recipient {
  id: number; name: string | null; phoneNumber: string; email: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'FAILED' | 'CANCELLED'; attempts: number; lastError: string | null;
}

export interface AddResult { added: number; duplicates: number; invalid: number; total: number; }

export interface Template {
  id: number; name: string; channel: 'SMS' | 'EMAIL'; subject: string | null; body: string; createdAt: string;
}

export interface Summary {
  totalContacts: number; callsToday: number; answeredCalls: number; missedCalls: number; failedCalls: number;
  smsSubmitted: number; smsDelivered: number; smsFailed: number;
  emailsAccepted: number; emailsBounced: number; emailsFailed: number;
  activeCampaigns: number; onlineDevices: number; totalDevices: number; generatedAt: string;
  recentActivity: { timestamp: string; type: string; title: string; detail: string }[] | null;
}

export interface Sms { id: number; recipientPhone: string; messageBody: string; status: string; errorMessage: string | null; createdAt: string; sentAt: string | null; }
export interface CallLog { id: number; phoneNumber: string; callType: string; status: string; durationSeconds: number | null; createdAt: string; }
export interface Email { id: number; recipientEmail: string; subject: string; status: string; errorMessage: string | null; createdAt: string; sentAt: string | null; }

export interface Attachment { id: number; fileName: string; contentType: string; sizeBytes: number; }

export interface PersonalFileInfo { id: number; fileName: string; sizeBytes: number; }
export interface UploadResult { added: number; replaced: number; skipped: string[]; }
export interface MatchReport { files: number; recipients: number; matched: number; missingCount: number; missingSample: string[]; unusedFiles: string[]; }

export interface AudioAsset {
  id: number; title: string; filename: string; durationSeconds: number; fileSizeBytes: number; language: string;
  type: 'UPLOADED_AUDIO' | 'TTS_GENERATED'; ttsScript: string | null; voiceName: string | null; active: boolean;
  createdAt: string; audioUrl: string;
}

export interface MailSettings { custom: boolean; email: string | null; host: string | null; port: number; defaultAvailable: boolean; }