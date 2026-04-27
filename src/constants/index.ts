import type { PipelineStage, SmartTemplate, TargetUrl } from '../types';

export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: 'saved', title: 'New Leads', color: 'bg-blue-500', bgColor: 'bg-blue-50' },
  { id: 'contacted', title: 'Contacted', color: 'bg-amber-500', bgColor: 'bg-amber-50' },
  { id: 'won', title: 'Closed / Won', color: 'bg-green-500', bgColor: 'bg-green-50' },
];

export const DEFAULT_TARGET_URLS: TargetUrl[] = [
  { id: '1', url: 'https://facebook.com/groups/local-business', type: 'facebook' },
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
