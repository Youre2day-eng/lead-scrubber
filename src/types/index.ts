export type ViewType = 'dashboard' | 'scraper' | 'pipeline' | 'agents' | 'settings' | 'forms';

export type ScraperStatus = 'idle' | 'scraping' | 'filtering' | 'complete' | 'error';
export type DocumentType = 'contract' | 'invoice';
export type DocumentStatus = 'draft' | 'sent';
export type AgentTrigger = 'on_lead_saved' | 'on_stage_contacted' | 'on_no_reply_2_days' | 'on_reply_received';
export type AgentStepType =
  | 'send_message'
  | 'send_document'
  | 'move_stage'
  | 'wait'
  | 'wait_for_reply'
  | 'condition'
  | 'loop'
  | 'classify'
  | 'notify_user'
  | 'handoff'
  | 'terminate';
export type UrlType = 'facebook' | 'linkedin' | 'custom';
export type LeadIntent = 'buying' | 'selling' | 'neutral';
export type IntentFilter = 'all' | 'buying' | 'selling';

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

export interface LeadMessage { id: string; text: string; date: string; type: 'outbound' | 'inbound'; auto?: boolean; }

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

export interface AgentStep {
  id: string;
  type: AgentStepType;
  templateId?: string;
  docType?: string;
  stageId?: string;
  waitDays?: number;
  // wait_for_reply
  timeoutDays?: number;
  replyBranch?: AgentStep[];
  timeoutBranch?: AgentStep[];
  // loop
  maxAttempts?: number;
  loopDelayDays?: number;
  loopBodySteps?: AgentStep[];
  // condition
  conditionLabel?: string;
  thenBranch?: AgentStep[];
  elseBranch?: AgentStep[];
  // classify
  classifyLabels?: string;
  // notify_user
  notifyMessage?: string;
}

export interface Agent { id: string; name: string; trigger: AgentTrigger; isActive: boolean; steps: AgentStep[]; }

export interface AgentTemplate { id: string; name: string; description: string; icon: string; trigger: AgentTrigger; steps: AgentStep[]; }

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
