import { BarChart3, Bot, Database, FileSignature, HardDrive, LayoutDashboard, Search, Settings, Target } from 'lucide-react';
import type { ViewType } from '../../types';
import { isFirebaseEnabled } from '../../lib/firebase';

interface HeaderProps { activeView: ViewType; onViewChange: (v: ViewType) => void; }

const NAV: { id: ViewType; label: string; Icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: BarChart3 },
  { id: 'scraper', label: 'Scraper', Icon: Search },
  { id: 'pipeline', label: 'Pipeline', Icon: LayoutDashboard },
  { id: 'forms', label: 'Forms', Icon: FileSignature },
  { id: 'agents', label: 'Agents', Icon: Bot },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export default function Header({ activeView, onViewChange }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="text-blue-600 w-6 h-6" />
          <span className="font-bold text-xl tracking-tight text-slate-800">LeadScrubber</span>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => onViewChange(id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${activeView === id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
        {isFirebaseEnabled ? (
          <span className="px-3 py-1 rounded-md bg-green-50 text-green-700 border border-green-200 flex items-center gap-2 text-sm font-medium">
            <Database className="w-4 h-4" /> Cloud Sync On
          </span>
        ) : (
          <span className="px-3 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-2 text-sm font-medium" title="Saved to this browser only.">
            <HardDrive className="w-4 h-4" /> Local Only
          </span>
        )}
      </div>
    </header>
  );
}
