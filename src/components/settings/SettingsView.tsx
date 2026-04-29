import { useEffect, useState } from 'react';
import { CheckCircle2, DollarSign, LayoutDashboard, Link as LinkIcon, ListChecks, MessageSquare, MoveDown, MoveUp, Plus, Target, Trash2 } from 'lucide-react';
import type { Goals, PipelineStage, StageMessage, TargetUrl } from '../../types';
import ConnectionsPanel from './ConnectionsPanel';
import SourcesPanel from './SourcesPanel';

const COLORS = [
  { value: 'bg-slate-500', label: 'Slate' },
  { value: 'bg-blue-500', label: 'Blue' },
  { value: 'bg-purple-500', label: 'Purple' },
  { value: 'bg-pink-500', label: 'Pink' },
  { value: 'bg-amber-500', label: 'Amber' },
  { value: 'bg-emerald-500', label: 'Emerald' },
  { value: 'bg-red-500', label: 'Red' },
];

interface SettingsViewProps {
  stages: PipelineStage[];
  onChange: (stages: PipelineStage[]) => void;
  onSave: (stages: PipelineStage[]) => void;
  targetUrls: TargetUrl[];
  onSaveUrls: (urls: TargetUrl[]) => void;
  goals: Goals;
  onSaveGoals: (goals: Goals) => void;
  stageMessages: Record<string, StageMessage>;
  onSaveStageMessages: (sm: Record<string, StageMessage>) => void;
}

type Tab = 'pipeline' | 'connections' | 'sources' | 'goals' | 'auto-contact';

export default function SettingsView({ stages, onChange, onSave, targetUrls, onSaveUrls, goals, onSaveGoals, stageMessages, onSaveStageMessages }: SettingsViewProps) {
  const [tab, setTab] = useState<Tab>('goals');

  const swap = (i: number, j: number) => {
    const next = [...stages];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: 'goals', label: 'Goals', Icon: Target },
    { id: 'auto-contact', label: 'Auto-Contact', Icon: MessageSquare },
    { id: 'pipeline', label: 'Pipeline Stages', Icon: LayoutDashboard },
    { id: 'connections', label: 'Connections', Icon: LinkIcon },
    { id: 'sources', label: 'Sources', Icon: ListChecks },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Workspace Settings</h2>
        <p className="text-slate-500">Goals, auto-contact templates, pipeline, connections and sources.</p>
      </div>

      <div className="flex flex-wrap gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${tab === id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'goals' && <GoalsPanel goals={goals} onSave={onSaveGoals} stages={stages} />}
      {tab === 'auto-contact' && <AutoContactPanel stages={stages} stageMessages={stageMessages} onSave={onSaveStageMessages} />}
      {tab === 'connections' && <ConnectionsPanel />}
      {tab === 'sources' && <SourcesPanel targetUrls={targetUrls} onSave={onSaveUrls} />}

      {tab === 'pipeline' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-blue-500" /> Pipeline Stages Editor
          </h3>
          <div className="space-y-3 mb-6">
            {stages.map((stage, idx) => (
              <div key={stage.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex flex-col gap-1 text-slate-400">
                  <button onClick={() => swap(idx, idx - 1)} disabled={idx === 0} className="hover:text-slate-700 disabled:opacity-30"><MoveUp className="w-3 h-3" /></button>
                  <button onClick={() => swap(idx, idx + 1)} disabled={idx === stages.length - 1} className="hover:text-slate-700 disabled:opacity-30"><MoveDown className="w-3 h-3" /></button>
                </div>
                <select value={stage.color} onChange={(e) => { const base = e.target.value.split('-')[1]; onChange(stages.map((s, i) => i === idx ? { ...s, color: e.target.value, bgColor: `bg-${base}-50` } : s)); }} className={`w-8 h-8 rounded-full outline-none shrink-0 ${stage.color} text-transparent cursor-pointer`}>
                  {COLORS.map((c) => <option key={c.value} value={c.value} className={c.value}>{c.label}</option>)}
                </select>
                <input type="text" value={stage.title} onChange={(e) => onChange(stages.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <button onClick={() => onChange(stages.filter((s) => s.id !== stage.id))} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-6">
            <button onClick={() => onChange([...stages, { id: crypto.randomUUID(), title: 'New Custom Stage', color: 'bg-slate-500', bgColor: 'bg-slate-50' }])} className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" /> Add Pipeline Stage</button>
            <button onClick={() => onSave(stages)} className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-sm"><CheckCircle2 className="w-4 h-4" /> Save Pipeline Changes</button>
          </div>
        </div>
      )}
    </div>
  );
}

function GoalsPanel({ goals, onSave, stages }: { goals: Goals; onSave: (g: Goals) => void; stages: PipelineStage[] }) {
  const [revenuePerLead, setRevenuePerLead] = useState(goals.revenuePerLead);
  const [monthlyGoal, setMonthlyGoal] = useState(goals.monthlyGoal);
  const [wonStageIds, setWonStageIds] = useState<string[]>(goals.wonStageIds || ['won', 'closed']);
  useEffect(() => { setRevenuePerLead(goals.revenuePerLead); setMonthlyGoal(goals.monthlyGoal); setWonStageIds(goals.wonStageIds || ['won','closed']); }, [goals]);
  const dirty = revenuePerLead !== goals.revenuePerLead || monthlyGoal !== goals.monthlyGoal || JSON.stringify(wonStageIds) !== JSON.stringify(goals.wonStageIds || ['won','closed']);
  const toggleWon = (id: string) => { setWonStageIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]); };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" /> Revenue Goals</h3>
      <p className="text-sm text-slate-500 mb-5">The dashboard tracks won deals against this goal.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <label className="block"><span className="text-xs font-semibold text-slate-600">Revenue per won lead</span>
          <div className="mt-1 flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 focus-within:border-blue-500"><span className="text-slate-400 text-sm">$</span><input type="number" min={0} value={revenuePerLead} onChange={(e) => setRevenuePerLead(Math.max(0, Number(e.target.value) || 0))} className="w-full bg-transparent px-2 py-2 text-sm outline-none" /></div>
        </label>
        <label className="block"><span className="text-xs font-semibold text-slate-600">Monthly revenue goal</span>
          <div className="mt-1 flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 focus-within:border-blue-500"><span className="text-slate-400 text-sm">$</span><input type="number" min={0} value={monthlyGoal} onChange={(e) => setMonthlyGoal(Math.max(0, Number(e.target.value) || 0))} className="w-full bg-transparent px-2 py-2 text-sm outline-none" /></div>
        </label>
      </div>
      <div className="mb-6">
        <span className="text-xs font-semibold text-slate-600">Stages that count as ‘won’</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {stages.map((s) => { const on = wonStageIds.includes(s.id); return (<button key={s.id} onClick={() => toggleWon(s.id)} className={'text-xs font-medium px-3 py-1.5 rounded-full border ' + (on ? 'bg-green-50 border-green-300 text-green-800' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400')}>{on ? '✓ ' : ''}{s.title}</button>); })}
        </div>
        <p className="text-xs text-slate-400 mt-2">If none are selected, deals matching ‘won’ or ‘closed’ in the stage id are counted by default.</p>
      </div>
      <div className="flex justify-end"><button disabled={!dirty} onClick={() => onSave({ revenuePerLead, monthlyGoal, wonStageIds })} className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-sm"><CheckCircle2 className="w-4 h-4" /> Save Goals</button></div>
    </div>
  );
}

function AutoContactPanel({ stages, stageMessages, onSave }: { stages: PipelineStage[]; stageMessages: Record<string, StageMessage>; onSave: (sm: Record<string, StageMessage>) => void }) {
  const [draft, setDraft] = useState<Record<string, StageMessage>>(stageMessages);
  useEffect(() => { setDraft(stageMessages); }, [stageMessages]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(stageMessages);
  const update = (id: string, patch: Partial<StageMessage>) => {
    setDraft((prev) => ({ ...prev, [id]: { template: prev[id]?.template ?? '', autoSend: prev[id]?.autoSend ?? false, ...patch } }));
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-purple-500" /> Auto-Contact Templates</h3>
      <p className="text-sm text-slate-500 mb-5">Set a template per stage. Toggle <strong>Auto-send</strong> to fire it the moment a lead enters that stage. Tokens: <code className="px-1 bg-slate-100 rounded text-xs">{`{{author}}`}</code> <code className="px-1 bg-slate-100 rounded text-xs">{`{{platform}}`}</code> <code className="px-1 bg-slate-100 rounded text-xs">{`{{group}}`}</code>.</p>
      <div className="space-y-4 mb-5">
        {stages.map((s) => { const cur = draft[s.id] || { template: '', autoSend: false }; return (
          <div key={s.id} className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2"><span className={'w-2.5 h-2.5 rounded-full ' + (s.color || 'bg-slate-400')} /><span className="font-semibold text-sm text-slate-700">{s.title}</span></div>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer"><input type="checkbox" checked={cur.autoSend} onChange={(e) => update(s.id, { autoSend: e.target.checked })} className="accent-purple-600" /> Auto-send when lead enters this stage</label>
            </div>
            <textarea value={cur.template} onChange={(e) => update(s.id, { template: e.target.value })} rows={3} placeholder={'Hey {{author}}, saw your post in {{group}}…'} className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 font-mono" />
          </div>
        ); })}
      </div>
      <div className="flex justify-end"><button disabled={!dirty} onClick={() => onSave(draft)} className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-sm"><CheckCircle2 className="w-4 h-4" /> Save Templates</button></div>
    </div>
  );
}
