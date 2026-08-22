import { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  Copy,
  Download,
  Check,
  ArrowUpDown,
  UserMinus,
  UserCheck,
  Users,
  RefreshCcw,
  FileText,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';
import {
  AnalysisStats,
  copyToClipboard,
  exportToTxt,
  exportToCsv,
  exportToJson,
} from '../utils';

export type ActiveTab = 'unfollowers' | 'fans' | 'mutuals';
export type SortOrder = 'default' | 'asc' | 'desc';

interface ResultsViewProps {
  stats: AnalysisStats | null;
  onReset: () => void;
  showAsLinks?: boolean;
}

export function ResultsView({ stats, onReset, showAsLinks = false }: ResultsViewProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('unfollowers');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('default');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Determine current active list based on tab
  const activeList = useMemo(() => {
    if (!stats) return [];
    switch (activeTab) {
      case 'unfollowers':
        return stats.unfollowers;
      case 'fans':
        return stats.fans;
      case 'mutuals':
        return stats.mutuals;
    }
  }, [stats, activeTab]);

  // Filter and sort the active list
  const filteredAndSortedList = useMemo(() => {
    let result = activeList;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((user) => user.toLowerCase().includes(q));
    }

    if (sortOrder === 'asc') {
      result = [...result].sort((a, b) => a.localeCompare(b));
    } else if (sortOrder === 'desc') {
      result = [...result].sort((a, b) => b.localeCompare(a));
    }

    return result;
  }, [activeList, searchQuery, sortOrder]);

  const handleCopyList = async () => {
    if (activeList.length === 0) return;
    const text = showAsLinks 
      ? activeList.map(u => `https://www.instagram.com/${u}`).join('\n')
      : activeList.join('\n');
    const success = await copyToClipboard(text);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleExport = (format: 'txt' | 'csv' | 'json') => {
    setShowExportMenu(false);
    if (!stats) return;

    const tabName =
      activeTab === 'unfollowers'
        ? 'non-ti-seguono'
        : activeTab === 'fans'
        ? 'fan'
        : 'amici-reciproci';

    if (format === 'txt') {
      exportToTxt(activeList, `instasniff-${tabName}.txt`);
    } else if (format === 'csv') {
      exportToCsv(activeList, `instasniff-${tabName}.csv`);
    } else if (format === 'json') {
      exportToJson(
        {
          tab: activeTab,
          generatedAt: new Date().toISOString(),
          stats: {
            following: stats.followingCount,
            followers: stats.followersCount,
            unfollowersCount: stats.unfollowers.length,
            fansCount: stats.fans.length,
            mutualsCount: stats.mutuals.length,
            followBackRatio: `${stats.followBackRatio}%`,
          },
          accounts: activeList,
        },
        `instasniff-${tabName}.json`
      );
    }
  };

  const cycleSortOrder = () => {
    if (sortOrder === 'default') setSortOrder('asc');
    else if (sortOrder === 'asc') setSortOrder('desc');
    else setSortOrder('default');
  };

  return (
    <section
      role="region"
      aria-live="polite"
      aria-label="Risultati dell'analisi"
      className="bg-slate-900 rounded-2xl border border-indigo-500/30 p-5 flex flex-col gap-4 shadow-xl shadow-indigo-500/5 min-h-[500px] lg:max-h-[640px] h-full"
    >
      {/* Header with Title & Reset Button */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Risultati Analisi
            {stats && (
              <span className="text-xs font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                {activeList.length}
              </span>
            )}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {stats && (
            <button
              type="button"
              onClick={onReset}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Ricomincia da capo"
              aria-label="Ricomincia da capo e cancella i risultati"
            >
              <RefreshCcw size={14} />
              <span className="hidden sm:inline">Ricomincia</span>
            </button>
          )}
        </div>
      </div>

      {!stats ? (
        <div className="flex-grow flex flex-col items-center justify-center text-slate-400 text-sm font-mono text-center p-6 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
            <Search size={28} />
          </div>
          <div>
            <p className="font-semibold text-slate-300 mb-1">In attesa dei dati</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Incolla o carica le liste dei tuoi Follower e Seguiti per avviare il confronto.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Analysis View Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('unfollowers');
                setSearchQuery('');
              }}
              className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                activeTab === 'unfollowers'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
              aria-selected={activeTab === 'unfollowers'}
            >
              <UserMinus size={14} />
              <span className="truncate">Non ti seguono</span>
              <span className="text-[10px] opacity-80 font-mono">({stats.unfollowers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('fans');
                setSearchQuery('');
              }}
              className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                activeTab === 'fans'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
              aria-selected={activeTab === 'fans'}
            >
              <Users size={14} />
              <span className="truncate">Fan</span>
              <span className="text-[10px] opacity-80 font-mono">({stats.fans.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('mutuals');
                setSearchQuery('');
              }}
              className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                activeTab === 'mutuals'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
              aria-selected={activeTab === 'mutuals'}
            >
              <UserCheck size={14} />
              <span className="truncate">Reciproci</span>
              <span className="text-[10px] opacity-80 font-mono">({stats.mutuals.length})</span>
            </button>
          </div>

          {/* Search, Filter & Sort Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca username..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                aria-label="Cerca account nella lista attiva"
              />
            </div>

            <button
              type="button"
              onClick={cycleSortOrder}
              className={`p-2 border rounded-xl transition-colors flex items-center gap-1 text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                sortOrder !== 'default'
                  ? 'bg-indigo-950 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={`Ordinamento: ${
                sortOrder === 'default' ? 'Originale' : sortOrder === 'asc' ? 'A → Z' : 'Z → A'
              }`}
              aria-label={`Cambia ordinamento. Attuale: ${
                sortOrder === 'default' ? 'Originale' : sortOrder === 'asc' ? 'A → Z' : 'Z → A'
              }`}
            >
              <ArrowUpDown size={14} />
              <span className="font-mono text-[11px] font-semibold">
                {sortOrder === 'default' ? 'DEF' : sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </span>
            </button>
          </div>

          {/* Usernames List Container - Bound Scrollable Area */}
          <div className="flex-grow min-h-0 overflow-y-auto space-y-2 pr-1.5 custom-scrollbar">
            {activeList.length === 0 ? (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center p-4">
                {activeTab === 'unfollowers' ? (
                  <div className="text-emerald-400 text-xs font-mono flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <Check size={20} />
                    </div>
                    <span className="font-bold text-sm text-emerald-300">Nessun unfollower! 🎉</span>
                    <span className="text-slate-400 max-w-xs">
                      Tutti gli account che segui ricambiano il follow. Ottimo profilo!
                    </span>
                  </div>
                ) : activeTab === 'fans' ? (
                  <div className="text-slate-400 text-xs font-mono flex flex-col items-center gap-2">
                    <span className="font-semibold text-slate-300">Nessun fan</span>
                    <span className="text-slate-400">
                      Non ci sono follower che non segui a tua volta.
                    </span>
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs font-mono flex flex-col items-center gap-2">
                    <span className="font-semibold text-slate-300">Nessun amico reciproco</span>
                    <span className="text-slate-400">
                      Non ci sono account con follow reciproco.
                    </span>
                  </div>
                )}
              </div>
            ) : filteredAndSortedList.length === 0 ? (
              <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-slate-400 text-xs font-mono text-center p-4">
                <span>Nessun account corrisponde a &quot;{searchQuery}&quot;</span>
              </div>
            ) : (
              filteredAndSortedList.map((user) => (
                <div
                  key={user}
                  className="group flex items-center justify-between bg-slate-950/70 p-2.5 px-3 rounded-xl border border-slate-800/80 hover:border-indigo-500/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 mr-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                    <span
                      className="text-xs font-mono font-medium text-slate-200 truncate"
                      title={showAsLinks ? `https://www.instagram.com/${user}` : `@${user}`}
                    >
                      {showAsLinks ? `https://www.instagram.com/${user}` : `@${user}`}
                    </span>
                  </div>

                  <a
                    href={`https://www.instagram.com/${encodeURIComponent(user)}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold hover:underline shrink-0 flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 hover:border-indigo-500/40 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                    aria-label={`Apri profilo Instagram di @${user} (si apre in una nuova scheda)`}
                  >
                    Profilo <ExternalLink size={11} aria-hidden="true" />
                  </a>
                </div>
              ))
            )}
          </div>

          {/* Action Toolbar: Copy List & Export Downloads */}
          {activeList.length > 0 && (
            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2 mt-auto">
              <button
                type="button"
                onClick={handleCopyList}
                className="w-full sm:flex-1 bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all border border-slate-700 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
              >
                {copyFeedback ? (
                  <>
                    <Check size={14} className="text-green-400" />
                    <span className="text-green-300">Copiato negli appunti!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copia Lista ({activeList.length})</span>
                  </>
                )}
              </button>

              <div className="relative w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 px-4 rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 border border-indigo-500/30 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                  aria-expanded={showExportMenu}
                  aria-haspopup="true"
                >
                  <Download size={14} />
                  <span>Esporta</span>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-20">
                    <button
                      type="button"
                      onClick={() => handleExport('txt')}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <FileText size={14} className="text-blue-400" />
                      <span>Esporta in TXT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('csv')}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet size={14} className="text-green-400" />
                      <span>Esporta in CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('json')}
                      className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <FileCode size={14} className="text-amber-400" />
                      <span>Esporta in JSON</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
