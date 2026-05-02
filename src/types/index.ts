export type ViewType = 'dashboard' | 'scraper' | 'pipeline' | 'agents' | 'settings' | 'forms';

export type ScraperStatus = 'idle' | 'scraping' | 'filtering' | 'complete' | 'error';
export type DocumentType = 'contract' | 'invoice';
export type DocumentStatus = 'draft' | 'sent';
export type AgentTrigger = 'on_lead_saved' | 'on_stage_contacted' | 'on_no_reply_2_days';
export type AgentStepType = 'send_message' | 'send_document' | 'move_stage' | 'wait';
export type UrlType = 'facebook' | 'linkedin' | 'custom';
export type LeadIntent = 'buying' | 'selling' | 'neutral';
export type IntentFilter = 'all' | 'buying' | 'selling';
export type SocialPlatform = 'facebook' | 'instagram' | 'threads' | 'reddit';

export interface AuthUser { uid: string; email: string | null; displayName?: string | null; }

export interface TargetUrl { id: string; url: string; type: UrlType; enabled?: boolean; }

export interface Lead {
  id: string;
  platform: string;
  groupName: string;
  author: string;
  text: string;
  intentScore: number;
  timeAgo: string;
  urgency: 'High' | 'Medium' | 'Low';
  intent?: LeadIntent;
}

export interface LeadMessage { id: string; text: string; date: string; type: 'outbound' | 'inbound'; auto?: boolean; platformSent?: boolean; platformError?: string; }

export interface LeadDocument { id: string; type: DocumentType; name: string; status: DocumentStatus; date: string; sentAt?: string; }

export interface SavedLead extends Lead {
  stage: string;
  savedAt: string;
  messages?: LeadMessage[];
  documents?: LeadDocument[];
  lastContacted?: string;
  source?: string;
}

export interface PipelineStage { id: string; title: string; color: string; bgColor: string; }

export interface StageMessage { template: string; autoSend: boolean; }

export interface AgentStep { id: string; type: AgentStepType; templateId?: string; docType?: string; stageId?: string; waitDays?: number; }

export interface Agent { id: string; name: string; trigger: AgentTrigger; isActive: boolean; steps: AgentStep[]; }

export interface SmartTemplate { id: string; title: string; text: string; }

export interface Goals { revenuePerLead: number; monthlyGoal: number; wonStageIds?: string[]; }

export interface IntakeForm {
  id: string;
  name: string;
  headline: string;
  description: string;
  fields: IntakeFormField[];
  submitLabel: string;
  successMessage: string;
  accentColor: string;
  defaultStage?: string;
  createdAt: string;
}

export interface IntakeFormField {
  id: string;
  label: string;
  key: 'name' | 'email' | 'phone' | 'company' | 'message' | 'budget' | 'custom';
  customKey?: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'number' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface AppConfig {
  pipelineStages: PipelineStage[];
  agents: Agent[];
  targetUrls: TargetUrl[];
  stageMessages?: Record<string, StageMessage>;
  goals?: Goals;
  forms?: IntakeForm[];
}

/** Connection state for a single social platform */
export interface SocialConnectionState {
  connected: boolean;
  username?: string;
  connectedAt?: string;
  expiresAt?: string | null;
  expired?: boolean;
}

/** Full connections payload returned by GET /api/connections */
export interface ConnectionsPayload {
  apify: { connected: boolean; username?: string; savedAt?: string };
  facebook: SocialConnectionState;
  instagram: SocialConnectionState;
  threads: SocialConnectionState;
  reddit: SocialConnectionState;
}
