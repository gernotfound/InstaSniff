import { UserMinus, UserCheck, Users, Percent, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { AnalysisStats } from '../utils';

interface StatsCardProps {
  stats: AnalysisStats;
}

export function StatsCard({ stats }: StatsCardProps) {
  const {
    followingCount,
    followersCount,
    unfollowers,
    fans,
    mutuals,
    followBackRatio,
  } = stats;

  const statItems = [
    {
      label: 'Seguiti Totali',
      value: followingCount,
      icon: <ArrowUpRight size={16} className="text-indigo-400" />,
      sub: 'Persone che segui',
    },
    {
      label: 'Follower Totali',
      value: followersCount,
      icon: <ArrowDownLeft size={16} className="text-blue-400" />,
      sub: 'Persone che ti seguono',
    },
    {
      label: 'Non ti seguono',
      value: unfollowers.length,
      icon: <UserMinus size={16} className="text-amber-400" />,
      sub: 'Non ricambiano il follow',
      highlight: unfollowers.length > 0 ? 'text-amber-300' : 'text-slate-200',
    },
    {
      label: 'Non ricambi (Fan)',
      value: fans.length,
      icon: <Users size={16} className="text-purple-400" />,
      sub: 'Ti seguono, ma non li segui',
      highlight: 'text-purple-300',
    },
    {
      label: 'Amici Reciproci',
      value: mutuals.length,
      icon: <UserCheck size={16} className="text-emerald-400" />,
      sub: 'Vi seguite a vicenda',
      highlight: 'text-emerald-300',
    },
    {
      label: 'Tasso di Ricambio',
      value: `${followBackRatio}%`,
      icon: <Percent size={16} className="text-cyan-400" />,
      sub: 'Dei tuoi seguiti ti segue',
      highlight: 'text-cyan-300',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Users size={16} className="text-indigo-400" />
          Riepilogo Statistico
        </h3>
        <div className="text-xs font-mono text-slate-400">
          Analisi completata
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl flex flex-col justify-between gap-1"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-medium uppercase tracking-wider truncate" title={item.label}>
                {item.label}
              </span>
              {item.icon}
            </div>
            <div className={`text-xl font-bold font-mono ${item.highlight || 'text-white'}`}>
              {item.value}
            </div>
            <div className="text-[10px] text-slate-400 truncate" title={item.sub}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
