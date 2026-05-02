import type { AgentTemplate, PipelineStage, SmartTemplate, TargetUrl } from '../types';

export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: 'saved', title: 'New Leads', color: 'bg-blue-500', bgColor: 'bg-blue-50' },
  { id: 'contacted', title: 'Contacted', color: 'bg-amber-500', bgColor: 'bg-amber-50' },
  { id: 'won', title: 'Closed / Won', color: 'bg-green-500', bgColor: 'bg-green-50' },
];

export const DEFAULT_TARGET_URLS: TargetUrl[] = [
  { id: '1', url: 'https://www.reddit.com/r/forhire/', type: 'custom' },
  { id: '2', url: 'https://www.reddit.com/r/slavelabour/', type: 'custom' },
  { id: '3', url: 'https://www.reddit.com/r/HireaWriter/', type: 'custom' },
];

export const DEFAULT_KEYWORDS = 'ISO, looking for, any recommendations';

export const SMART_TEMPLATES: SmartTemplate[] = [
  {
    id: '1',
    title: 'Initial Pitch (Cold)',
    text: "Hi {name}, I saw your post looking for help with {niche}. I'd love to jump on a quick call and see if we're a fit. Let me know!",
  },
  {
    id: '2',
    title: 'Follow Up',
    text: 'Hey {name}, just circling back to see if you still needed assistance with {niche}. I have availability starting next week.',
  },
  {
    id: '3',
    title: 'Intake Request',
    text: 'Hi {name}, before we get started, please fill out this quick intake form so I have all your details: [Link to Form]',
  },
  {
    id: '4',
    title: 'Closing / Next Steps',
    text: "Hi {name}, great connecting! I've attached the final details. Let me know if you have any questions before we finalize.",
  },
];

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'tpl_cold_outreach',
    name: 'Cold Outreach + Follow-up',
    description: 'Send an initial pitch, wait 2 days for a reply, then auto-send a follow-up if there is no response.',
    icon: 'send',
    trigger: 'on_lead_saved',
    steps: [
      {
        id: 'tpl_co_1',
        type: 'send_message',
        templateId: '1',
      },
      {
        id: 'tpl_co_2',
        type: 'wait_for_reply',
        timeoutDays: 2,
        replyBranch: [
          { id: 'tpl_co_2_r1', type: 'move_stage', stageId: 'contacted' },
          { id: 'tpl_co_2_r2', type: 'notify_user', notifyMessage: '🎉 Lead replied! Check your pipeline.' },
        ],
        timeoutBranch: [
          { id: 'tpl_co_2_t1', type: 'send_message', templateId: '2' },
          { id: 'tpl_co_2_t2', type: 'terminate' },
        ],
      },
    ],
  },
  {
    id: 'tpl_inbound_triage',
    name: 'Inbound Reply Triage',
    description: 'When a lead replies, classify their intent and either hand off high-intent leads or send a follow-up to low-intent ones.',
    icon: 'inbox',
    trigger: 'on_reply_received',
    steps: [
      {
        id: 'tpl_it_1',
        type: 'classify',
        classifyLabels: 'High Intent, Low Interest, Needs Follow-up',
      },
      {
        id: 'tpl_it_2',
        type: 'condition',
        conditionLabel: 'Is lead High Intent?',
        thenBranch: [
          { id: 'tpl_it_2_t1', type: 'move_stage', stageId: 'contacted' },
          { id: 'tpl_it_2_t2', type: 'handoff' },
        ],
        elseBranch: [
          { id: 'tpl_it_2_e1', type: 'notify_user', notifyMessage: 'Low-intent reply received. Review when convenient.' },
          { id: 'tpl_it_2_e2', type: 'terminate' },
        ],
      },
    ],
  },
  {
    id: 'tpl_enrichment_loop',
    name: 'Source Enrichment Loop',
    description: 'Classify a new lead, send an intake form, then wait up to 5 days for them to fill it out before ending the flow.',
    icon: 'loop',
    trigger: 'on_lead_saved',
    steps: [
      {
        id: 'tpl_el_1',
        type: 'classify',
        classifyLabels: 'Freelancer, Business Owner, Agency',
      },
      {
        id: 'tpl_el_2',
        type: 'send_message',
        templateId: '1',
      },
      {
        id: 'tpl_el_3',
        type: 'wait_for_reply',
        timeoutDays: 3,
        replyBranch: [
          { id: 'tpl_el_3_r1', type: 'send_document', docType: 'intake' },
          { id: 'tpl_el_3_r2', type: 'move_stage', stageId: 'contacted' },
        ],
        timeoutBranch: [
          { id: 'tpl_el_3_t1', type: 'terminate' },
        ],
      },
    ],
  },
  {
    id: 'tpl_reengagement',
    name: 'Re-engagement Sequence',
    description: 'Reach out to leads that have gone quiet, wait 3 days, and hand them off if they respond or close them out on timeout.',
    icon: 'rewind',
    trigger: 'on_no_reply_2_days',
    steps: [
      {
        id: 'tpl_re_1',
        type: 'send_message',
        templateId: '2',
      },
      {
        id: 'tpl_re_2',
        type: 'wait_for_reply',
        timeoutDays: 3,
        replyBranch: [
          { id: 'tpl_re_2_r1', type: 'move_stage', stageId: 'contacted' },
          { id: 'tpl_re_2_r2', type: 'notify_user', notifyMessage: '✅ Re-engagement successful! Lead is back.' },
        ],
        timeoutBranch: [
          { id: 'tpl_re_2_t1', type: 'notify_user', notifyMessage: 'No reply after re-engagement. Lead closed.' },
          { id: 'tpl_re_2_t2', type: 'terminate' },
        ],
      },
    ],
  },
];
