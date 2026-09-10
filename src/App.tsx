import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { InputCard } from './components/InputCard';
import { ResultsView } from './components/ResultsView';
import { StatsCard } from './components/StatsCard';
import { ZipImportCard } from './components/ZipImportCard';
import { PrivacyBanner } from './components/PrivacyBanner';
import { AlertBanner, AlertMessage } from './components/AlertBanner';
import { AnalysisStats } from './utils';
import { analyzeManualLists, type ProcessedInstagramZipResult } from './processingClient';
import { Search, Loader2, Link2 } from 'lucide-react';

export default function App() {
  const [followers, setFollowers] = useState('');
  const [following, setFollowing] = useState('');
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAsLinks, setShowAsLinks] = useState(false);
  const [zipImported, setZipImported] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const analysisJobRef = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    return () => {
      analysisJobRef.current?.cancel();
      analysisJobRef.current = null;
    };
  }, []);

  const cancelRunningAnalysis = () => {
    analysisJobRef.current?.cancel();
    analysisJobRef.current = null;
    setIsProcessing(false);
  };

  const invalidateAnalysis = () => {
    cancelRunningAnalysis();
    if (stats) setStats(null);
    if (alert) setAlert(null);
    setZipImported(false);
  };

  const handleFollowersChange = (val: string) => {
    setFollowers(val);
    invalidateAnalysis();
  };

  const handleFollowingChange = (val: string) => {
    setFollowing(val);
    invalidateAnalysis();
  };

  const scrollToResultsOnSmallScreens = () => {
    if (window.innerWidth >= 1024 || !resultsRef.current) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  };

  const handleZipImported = (result: ProcessedInstagramZipResult) => {
    cancelRunningAnalysis();
    setFollowers('');
    setFollowing('');
    setStats(result.stats);
    setShowAsLinks(false);
    setZipImported(true);
    setAlert(null);
    scrollToResultsOnSmallScreens();
  };

  const handleZipError = (message: string) => {
    setAlert({
      type: 'error',
      title: 'Impossibile importare il ZIP',
      message,
    });
  };

  const handleProcess = () => {
    setAlert(null);

    const rawFollowers = followers.trim();
    const rawFollowing = following.trim();

    if (!rawFollowers || !rawFollowing) {
      setAlert({
        type: 'warning',
        title: 'Dati mancanti',
        message: 'Inserisci o carica entrambe le liste (I tuoi Follower e Chi Segui) per avviare il confronto.',
      });
      return;
    }

    cancelRunningAnalysis();
    setIsProcessing(true);
    setZipImported(false);
    const job = analyzeManualLists(rawFollowers, rawFollowing);
    analysisJobRef.current = job;

    void job.promise
      .then((calculatedStats) => {
        if (analysisJobRef.current !== job) return;

        if (calculatedStats.followersCount === 0 && calculatedStats.followingCount === 0) {
          setAlert({
            type: 'error',
            title: 'Nessun account rilevato',
            message:
              'Impossibile estrarre account Instagram validi da entrambe le liste. Assicurati di aver incollato username, URL o file di esportazione ufficiali (JSON/HTML/CSV).',
          });
          setStats(null);
          return;
        }

        if (calculatedStats.followersCount === 0) {
          setAlert({
            type: 'error',
            title: 'Lista Follower non valida',
            message:
              'Non è stato trovato alcun account valido nella lista dei tuoi Follower. Controlla il formato dei dati incollati.',
          });
          setStats(null);
          return;
        }

        if (calculatedStats.followingCount === 0) {
          setAlert({
            type: 'error',
            title: 'Lista Seguiti non valida',
            message:
              'Non è stato trovato alcun account valido nella lista delle persone che Segui. Controlla il formato dei dati incollati.',
          });
          setStats(null);
          return;
        }

        setStats(calculatedStats);
        setAlert(null);
        scrollToResultsOnSmallScreens();
      })
      .catch((error: unknown) => {
        if (analysisJobRef.current !== job) return;
        if (error instanceof Error && error.name === 'AbortError') return;

        setStats(null);
        setAlert({
          type: 'error',
          title: 'Errore durante l\'elaborazione',
          message: error instanceof Error ? error.message : 'Si è verificato un errore sconosciuto.',
        });
      })
      .finally(() => {
        if (analysisJobRef.current !== job) return;
        analysisJobRef.current = null;
        setIsProcessing(false);
      });
  };

  const handleReset = () => {
    cancelRunningAnalysis();
    setFollowers('');
    setFollowing('');
    setStats(null);
    setAlert(null);
    setShowAsLinks(false);
    setZipImported(false);
  };

  const isFormIncomplete = !followers.trim() || !following.trim();

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 pb-24 sm:p-6 sm:pb-28 md:p-8 md:pb-28 flex flex-col gap-6">
        <Header />

        <AlertBanner alert={alert} onDismiss={() => setAlert(null)} />

        {stats && <StatsCard stats={stats} />}

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-grow">
          <div className="lg:col-span-7 flex flex-col gap-4">
            <ZipImportCard onImported={handleZipImported} onError={handleZipError} />

            {!zipImported && (
              <>
                <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider font-bold text-slate-500" aria-hidden="true">
                  <span className="h-px bg-slate-800 flex-1" />
                  oppure inserisci i dati manualmente
                  <span className="h-px bg-slate-800 flex-1" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputCard
                    title="I tuoi Follower"
                    description="Lista o file esportato degli account che ti seguono."
                    value={followers}
                    onChange={handleFollowersChange}
                  />

                  <InputCard
                    title="Chi Segui"
                    description="Lista o file esportato degli account che segui."
                    value={following}
                    onChange={handleFollowingChange}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={isFormIncomplete || isProcessing}
                  className={`w-full py-4 px-6 rounded-2xl text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all uppercase shadow-lg border cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                    isFormIncomplete || isProcessing
                      ? 'bg-slate-800 text-slate-500 border-slate-700/50 cursor-not-allowed shadow-none'
                      : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 active:scale-[0.99] text-white border-indigo-500/30 shadow-indigo-600/20'
                  }`}
                  aria-label="Avvia confronto e trova chi non ricambia il follow"
                  aria-busy={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                      Elaborazione in corso...
                    </>
                  ) : (
                    <>
                      <Search size={18} aria-hidden="true" />
                      Trova chi non ti segue
                    </>
                  )}
                </button>
              </>
            )}

            {stats && (
              <button
                type="button"
                onClick={() => setShowAsLinks((current) => !current)}
                aria-pressed={showAsLinks}
                className="w-full py-3 px-6 rounded-2xl text-xs font-bold tracking-wide transition-all shadow-md border cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 uppercase flex items-center justify-center gap-2"
              >
                <Link2 size={15} aria-hidden="true" />
                {showAsLinks ? 'Mostra username' : 'Mostra link ai profili'}
              </button>
            )}
          </div>

          <div ref={resultsRef} className="lg:col-span-5 flex flex-col min-h-0 scroll-mt-4">
            <ResultsView stats={stats} onReset={handleReset} showAsLinks={showAsLinks} />
          </div>
        </main>

        <Footer isAnalyzed={stats !== null} />
      </div>

      <PrivacyBanner />
    </>
  );
}
