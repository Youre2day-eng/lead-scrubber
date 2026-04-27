import { CheckCircle2, LayoutDashboard, MoveDown, MoveUp, Plus, Trash2 } from 'lucide-react';
import type { PipelineStage } from '../../types';

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
}

export default function SettingsView({ stages, onChange, onSave }: SettingsViewProps) {
  const swap = (i: number, j: number) => {
    const next = [...stages];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Workspace Settings</h2>
        <p className="text-slate-500">Customize your pipeline stages and colors.</p>
      </div>

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

              <select
                value={stage.color}
                onChange={(e) => {
                  const base = e.target.value.split('-')[1];
                  onChange(stages.map((s, i) => i === idx ? { ...s, color: e.target.value, bgColor: `bg-${base}-50` } : s));
                }}
                className={`w-8 h-8 rounded-full outline-none shrink-0 ${stage.color} text-transparent cursor-pointer`}
              >
                {COLORS.map((c) => <option key={c.value} value={c.value} className={c.value}>{c.label}</option>)}
              </select>

              <input
                type="text"
                value={stage.title}
                onChange={(e) => onChange(stages.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />

              <button onClick={() => onChange(stages.filter((s) => s.id !== stage.id))} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-6">
          <button
            onClick={() => onChange([...stages, { id: crypto.randomUUID(), title: 'New Custom Stage', color: 'bg-slate-500', bgColor: 'bg-slate-50' }])}
            className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Pipeline Stage
          </button>
          <button
            onClick={() => onSave(stages)}
            className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" /> Save Pipeline Changes
          </button>
        </div>
      </div>
    </div>
  );
}
