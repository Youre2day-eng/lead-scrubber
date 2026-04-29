import { useMemo } from 'react';
import { ArrowRight, CheckCircle2, DollarSign, FileSignature, MessageSquare, Plus, Target, TrendingUp } from 'lucide-react';
import type { Goals, PipelineStage, SavedLead } from '../../types';

interface DashboardViewProps {
  savedLeads: SavedLead[];
  stages: PipelineStage[];
  goals: Goals;
  onGoToSettings: () => void;
}

type ActivityKind = 'saved' | 'stage' | 'message' | 'auto-message' | 'document-sent' | 'won';

interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  date: string;
  leadId: string;
  author: string;
  detail: string;
  stageId?: string;
}

function fmtRelative(iso: string): string {
  const d = new Date(iso); const now = Date.now(); const diff = now - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const days = Math.floor(h / 24);
  if (days < 30) return days + 'd ago';
  return d.toLocaleDateString();
}

export default function DashboardView({ savedLeads, stages, goals, onGoToSettings }: DashboardViewProps) {
  const stageById = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s])), [stages]);
  const wonStageIds = goals.wonStageIds && goals.wonStageIds.length ? goals.wonStageIds : ['won', 'closed'];

  const wonLeads = useMemo(() => savedLeads.filter((l) => wonStageIds.some((w) => l.stage.toLowerCase().includes(w.toLowerCase()))), [savedLeads, wonStageIds]);
  const wonRevenue = wonLeads.length * goals.revenuePerLead;
  const goalPct = goals.monthlyGoal > 0 ? Math.min(1, wonRevenue / goals.monthlyGoal) : 0;

  const funnel = useMemo(() => stages.map((s) => ({ stage: s, count: savedLeads.filter((l) => l.stage === s.id).length })), [stages, savedLeads]);
  const totalInPipeline = savedLeads.length;
  const contactedCount = savedLeads.filter((l) => (l.messages?.length ?? 0) > 0).length;
  const contactedPct = totalInPipeline > 0 ? Math.round((contactedCount / totalInPipeline) * 100) : 0;

  const events: ActivityEvent[] = useMemo(() => {
    const out: ActivityEvent[] = [];
    for (const l of savedLeads) {
      out.push({ id: l.id + ':saved', kind: 'saved', date: l.savedAt, leadId: l.id, author: l.author, detail: 'Saved to pipeline', stageId: 'saved' });
      for (const m of l.messages ?? []) {
        out.push({ id: m.id, kind: m.auto ? 'auto-message' : 'message', date: m.date, leadId: l.id, author: l.author, detail: (m.auto ? 'Auto: ' : '') + truncate(m.text, 100) });
      }
      for (const d of l.documents ?? []) {
        if (d.sentAt) out.push({ id: d.id + ':sent', kind: 'document-sent', date: d.sentAt, leadId: l.id, author: l.author, detail: d.name });
      }
      if (wonStageIds.some((w) => l.stage.toLowerCase().includes(w.toLowerCase()))) {
        out.push({ id: l.id + ':won', kind: 'won', date: l.lastContacted || l.savedAt, leadId: l.id, author: l.author, detail: 'Marked as won', stageId: l.stage });
      }
    }
    out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return out.slice(0, 25);
  }, [savedLeads, wonStageIds]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Live pipeline activity and revenue tracking.</p>
        </div>
        <button onClick={onGoToSettings} className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900">
          <Target className="w-4 h-4" /> Edit goals
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-slate-700">Monthly Revenue</span>
            </div>
            <span className="text-xs text-slate-500">Goal: ${goals.monthlyGoal.toLocaleString()}</span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-slate-800">${wonRevenue.toLocaleString()}</span>
            <span className="text-sm text-slate-500">{Math.round(goalPct * 100)}% of goal</span>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-3 bg-gradient-to-r from-green-500 to-emerald-500 transition-all" style={{ width: (goalPct * 100) + '%' }} />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>{wonLeads.length} won × ${goals.revenuePerLead}</span>
            <span>${(goals.monthlyGoal - wonRevenue).toLocaleString()} to go</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-700">Outreach</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">{contactedCount}<span className="text-base text-slate-400 font-normal"> / {totalInPipeline}</span></div>
          <div className="text-xs text-slate-500 mt-1">{contactedPct}% of pipeline contacted</div>
          <div className="h-2 w-full bg-slate-100 rounded mt-3 overflow-hidden"><div className="h-2 bg-blue-500" style={{ width: contactedPct + '%' }} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Pipeline funnel</h3>
          {funnel.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No stages defined.</p>
          ) : (
            <div className="space-y-2">
              {funnel.map(({ stage, count }) => {
                const max = Math.max(1, ...funnel.map((f) => f.count));
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={stage.id}>
                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-600">{stage.title}</span><span className="font-semibold text-slate-700">{count}</span></div>
                    <div className="h-2 bg-slate-100 rounded"><div className={'h-2 rounded ' + (stage.color || 'bg-blue-500')} style={{ width: pct + '%' }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Recent activity</h3>
            <span className="text-xs text-slate-400">{events.length} most recent</span>
          </div>
          {events.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-8 text-center">No pipeline activity yet. Save a lead to get started.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {events.map((e) => (
                <li key={e.id} className="py-2 flex items-start gap-3">
                  <ActivityIcon kind={e.kind} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800 truncate">{e.author}</span>
                      <span className="text-xs text-slate-400 shrink-0">{fmtRelative(e.date)}</span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">{e.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityIcon({ kind }: { kind: ActivityKind }) {
  const cls = 'w-4 h-4 mt-0.5 shrink-0';
  if (kind === 'saved') return <Plus className={cls + ' text-blue-500'} />;
  if (kind === 'message') return <MessageSquare className={cls + ' text-slate-500'} />;
  if (kind === 'auto-message') return <MessageSquare className={cls + ' text-purple-500'} />;
  if (kind === 'document-sent') return <FileSignature className={cls + ' text-amber-500'} />;
  if (kind === 'won') return <CheckCircle2 className={cls + ' text-green-600'} />;
  return <ArrowRight className={cls + ' text-slate-400'} />;
}

function truncate(s: string, n: number): string { return s.length > n ? s.slice(0, n).trim() + '…' : s; }
