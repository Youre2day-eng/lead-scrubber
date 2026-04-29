import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2, RefreshCw, TrendingUp, Users } from 'lucide-react';
import type { SavedLead, PipelineStage, LeadIntent } from '../../types';

interface DashboardLead {
  id: string;
  text: string;
  intent?: LeadIntent;
  intentScore?: number;
  ingestedAt?: string;
  platform?: string;
  group?: string;
  url?: string;
}

interface Props {
  savedLeads: SavedLead[];
  stages: PipelineStage[];
}

const INTENT_COLORS: Record<LeadIntent, { fill: string; text: string }> = {
  buying: { fill: '#22c55e', text: 'Buyers' },
  selling: { fill: '#f97316', text: 'Sellers' },
  neutral: { fill: '#94a3b8', text: 'Neutral' },
};

function startOfDayUTC(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function DashboardView({ savedLeads, stages }: Props) {
  const [allLeads, setAllLeads] = useState<DashboardLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenuePerLead, setRevenuePerLead] = useState<number>(() => {
    const stored = localStorage.getItem('leadscrubber:dashboard:revenuePerLead');
    return stored ? Number(stored) || 50 : 50;
  });
  const [monthlyGoal, setMonthlyGoal] = useState<number>(() => {
    const stored = localStorage.getItem('leadscrubber:dashboard:monthlyGoal');
    return stored ? Number(stored) || 5000 : 5000;
  });

  useEffect(() => {
    localStorage.setItem('leadscrubber:dashboard:revenuePerLead', String(revenuePerLead));
  }, [revenuePerLead]);
  useEffect(() => {
    localStorage.setItem('leadscrubber:dashboard:monthlyGoal', String(monthlyGoal));
  }, [monthlyGoal]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/leads/list', { credentials: 'include' });
      const j = await r.json();
      setAllLeads(j.leads || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const intentCounts = useMemo(() => {
    let buying = 0;
    let selling = 0;
    let neutral = 0;
    for (const l of allLeads) {
      const i = (l.intent || 'neutral') as LeadIntent;
      if (i === 'buying') buying++;
      else if (i === 'selling') selling++;
      else neutral++;
    }
    return { buying, selling, neutral, total: allLeads.length };
  }, [allLeads]);

  const dailyCounts = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const l of allLeads) {
      const d = startOfDayUTC(l.ingestedAt || '');
      if (!d) continue;
      byDay.set(d, (byDay.get(d) || 0) + 1);
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const days: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: byDay.get(key) || 0 });
    }
    return days;
  }, [allLeads]);

  const sourceCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of allLeads) {
      const key = l.group || l.platform || 'unknown';
      m.set(key, (m.get(key) || 0) + 1);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [allLeads]);

  const stageCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of savedLeads) {
      m.set(l.stage, (m.get(l.stage) || 0) + 1);
    }
    return stages.map((s) => ({ id: s.id, title: s.title, color: s.color, count: m.get(s.id) || 0 }));
  }, [savedLeads, stages]);

  const monthRevenue = useMemo(() => {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = now.getUTCMonth();
    const wonThisMonth = savedLeads.filter((l) => {
      if (l.stage !== 'won') return false;
      const d = new Date(l.savedAt || '');
      return d.getUTCFullYear() === yyyy && d.getUTCMonth() === mm;
    });
    return wonThisMonth.length * revenuePerLead;
  }, [savedLeads, revenuePerLead]);

  const goalPct = monthlyGoal > 0 ? Math.min(100, (monthRevenue / monthlyGoal) * 100) : 0;

  const lineChart = (() => {
    const w = 600;
    const h = 160;
    const pad = { top: 12, right: 12, bottom: 24, left: 28 };
    const innerW = w - pad.left - pad.right;
    const innerH = h - pad.top - pad.bottom;
    const max = Math.max(1, ...dailyCounts.map((d) => d.count));
    const stepX = innerW / Math.max(1, dailyCounts.length - 1);
    const points = dailyCounts.map((d, i) => {
      const x = pad.left + stepX * i;
      const y = pad.top + innerH - (d.count / max) * innerH;
      return { x, y, ...d };
    });
    const path = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
    const area = `${path} L${pad.left + innerW},${pad.top + innerH} L${pad.left},${pad.top + innerH} Z`;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
        <defs>
          <linearGradient id="dashAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={pad.left} x2={pad.left + innerW} y1={pad.top + innerH * (1 - t)} y2={pad.top + innerH * (1 - t)} stroke="#e2e8f0" strokeDasharray="2 3" />
        ))}
        <path d={area} fill="url(#dashAreaGrad)" />
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth={2} />
        {points.map((p) => (
          <circle key={p.date} cx={p.x} cy={p.y} r={3} fill="#3b82f6">
            <title>{`${p.date}: ${p.count} leads`}</title>
          </circle>
        ))}
        {[0, Math.floor(points.length / 2), points.length - 1].map((i) => {
          const p = points[i];
          if (!p) return null;
          return (
            <text key={p.date} x={p.x} y={h - 6} textAnchor="middle" fontSize="10" fill="#64748b">{p.date.slice(5)}</text>
          );
        })}
        <text x={pad.left - 4} y={pad.top + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{max}</text>
        <text x={pad.left - 4} y={pad.top + innerH + 4} textAnchor="end" fontSize="10" fill="#94a3b8">0</text>
      </svg>
    );
  })();

  const donut = (() => {
    const r = 64;
    const stroke = 22;
    const C = 2 * Math.PI * r;
    const total = Math.max(1, intentCounts.total);
    const segs: { color: string; pct: number; label: string }[] = [
      { color: INTENT_COLORS.buying.fill, pct: intentCounts.buying / total, label: 'Buyers' },
      { color: INTENT_COLORS.selling.fill, pct: intentCounts.selling / total, label: 'Sellers' },
      { color: INTENT_COLORS.neutral.fill, pct: intentCounts.neutral / total, label: 'Neutral' },
    ];
    let offset = 0;
    return (
      <svg viewBox="0 0 180 180" className="w-44 h-44">
        <g transform="translate(90,90) rotate(-90)">
          <circle r={r} cx={0} cy={0} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
          {segs.map((s, i) => {
            const dash = s.pct * C;
            const el = (
              <circle key={i} r={r} cx={0} cy={0} fill="none" stroke={s.color} strokeWidth={stroke} strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} />
            );
            offset += dash;
            return el;
          })}
        </g>
        <text x="90" y="86" textAnchor="middle" fontSize="22" fontWeight="700" fill="#0f172a">{intentCounts.total}</text>
        <text x="90" y="104" textAnchor="middle" fontSize="11" fill="#64748b">total leads</text>
      </svg>
    );
  })();

  const goalRing = (() => {
    const r = 70;
    const stroke = 14;
    const C = 2 * Math.PI * r;
    const dash = (goalPct / 100) * C;
    return (
      <svg viewBox="0 0 180 180" className="w-44 h-44">
        <g transform="translate(90,90) rotate(-90)">
          <circle r={r} cx={0} cy={0} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
          <circle r={r} cx={0} cy={0} fill="none" stroke="#22c55e" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${C - dash}`} />
        </g>
        <text x="90" y="84" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a">${monthRevenue.toLocaleString()}</text>
        <text x="90" y="102" textAnchor="middle" fontSize="10" fill="#64748b">of ${monthlyGoal.toLocaleString()}</text>
        <text x="90" y="118" textAnchor="middle" fontSize="11" fontWeight="600" fill="#16a34a">{goalPct.toFixed(0)}%</text>
      </svg>
    );
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><BarChart3 className="w-6 h-6 text-blue-600" /> Dashboard</h1>
          <p className="text-sm text-slate-500">Live snapshot of your lead pipeline and revenue progress.</p>
        </div>
        <button onClick={refresh} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
      {error && (<div className="rounded-md bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">{error}</div>)}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Total Leads" value={intentCounts.total.toLocaleString()} icon={<Users className="w-5 h-5 text-blue-600" />} />
        <KpiCard title="Buyers" value={intentCounts.buying.toLocaleString()} icon={<TrendingUp className="w-5 h-5 text-green-600" />} accent="text-green-700" />
        <KpiCard title="Sellers" value={intentCounts.selling.toLocaleString()} icon={<TrendingUp className="w-5 h-5 text-orange-600" />} accent="text-orange-700" />
        <KpiCard title="Saved (Pipeline)" value={savedLeads.length.toLocaleString()} icon={<BarChart3 className="w-5 h-5 text-slate-600" />} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="Leads ingested (last 14 days)" className="lg:col-span-2">
          {loading && allLeads.length === 0 ? (<div className="h-40 flex items-center justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>) : (lineChart)}
        </Panel>
        <Panel title="Buyer / Seller split">
          <div className="flex flex-col items-center">
            {donut}
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs w-full">
              <Legend color={INTENT_COLORS.buying.fill} label="Buyers" value={intentCounts.buying} />
              <Legend color={INTENT_COLORS.selling.fill} label="Sellers" value={intentCounts.selling} />
              <Legend color={INTENT_COLORS.neutral.fill} label="Neutral" value={intentCounts.neutral} />
            </div>
          </div>
        </Panel>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Top sources">
          {sourceCounts.length === 0 ? (<div className="text-sm text-slate-400 py-6 text-center">No data yet.</div>) : (
            <div className="space-y-2">
              {sourceCounts.map(([key, count]) => {
                const pct = (count / sourceCounts[0][1]) * 100;
                return (
                  <div key={key} className="text-sm">
                    <div className="flex justify-between text-slate-700"><span className="truncate mr-3">{key}</span><span className="font-medium">{count}</span></div>
                    <div className="h-2 rounded bg-slate-100 overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel title="Pipeline funnel">
          {stageCounts.length === 0 ? (<div className="text-sm text-slate-400 py-6 text-center">No saved leads yet.</div>) : (
            <div className="space-y-2">
              {stageCounts.map((s) => {
                const max = Math.max(1, ...stageCounts.map((x) => x.count));
                const pct = (s.count / max) * 100;
                return (
                  <div key={s.id} className="text-sm">
                    <div className="flex justify-between text-slate-700"><span>{s.title}</span><span className="font-medium">{s.count}</span></div>
                    <div className="h-2 rounded bg-slate-100 overflow-hidden"><div className="h-full" style={{ width: `${pct}%`, backgroundColor: s.color || '#3b82f6' }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
      <Panel title="Monthly revenue goal">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="flex justify-center">{goalRing}</div>
          <div className="space-y-3">
            <label className="block text-sm"><span className="text-slate-600">Average revenue per won lead</span><div className="mt-1 flex items-center gap-2"><span className="text-slate-500">$</span><input type="number" min={0} value={revenuePerLead} onChange={(e) => setRevenuePerLead(Number(e.target.value) || 0)} className="w-32 px-2 py-1 border border-slate-200 rounded text-sm" /></div></label>
            <label className="block text-sm"><span className="text-slate-600">Monthly goal</span><div className="mt-1 flex items-center gap-2"><span className="text-slate-500">$</span><input type="number" min={0} value={monthlyGoal} onChange={(e) => setMonthlyGoal(Number(e.target.value) || 0)} className="w-32 px-2 py-1 border border-slate-200 rounded text-sm" /></div></label>
            <p className="text-xs text-slate-500">Earned this calendar month from leads moved to <strong>Won</strong>: ${monthRevenue.toLocaleString()} / ${monthlyGoal.toLocaleString()}.</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (<div className={`bg-white rounded-lg border border-slate-200 shadow-sm p-5 ${className || ''}`}><h2 className="text-sm font-semibold text-slate-700 mb-3">{title}</h2>{children}</div>);
}

function KpiCard({ title, value, icon, accent }: { title: string; value: string; icon: React.ReactNode; accent?: string }) {
  return (<div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-md bg-slate-50 flex items-center justify-center">{icon}</div><div><div className="text-xs text-slate-500">{title}</div><div className={`text-xl font-bold ${accent || 'text-slate-900'}`}>{value}</div></div></div>);
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (<div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: color }} /><span className="text-slate-600">{label}</span><span className="ml-auto font-semibold text-slate-800">{value}</span></div>);
}
