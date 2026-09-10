import { useRef, useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { InputCard } from './components/InputCard';
import { ResultsView } from './components/ResultsView';
import { StatsCard } from './components/StatsCard';
import { ZipImportCard } from './components/ZipImportCard';
import { AlertBanner, AlertMessage } from './components/AlertBanner';
import { parseInstagramText, computeAnalysis, AnalysisStats } from './utils';
import { InstagramZipImportResult } from './instagramZip';
import { Search, Loader2, Link2 } from 'lucide-react';

export default function App() {
  const [followers, setFollowers] = useState('');
  const [following, setFollowing] = useState('');
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAsLinks, setShowAsLinks] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const invalidateAnalysis = () => {
    if (stats) setStats(null);
    if (alert) setAlert(null);
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
    if (window.innerWidth < 1024 && resultsRef.current) {
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const handleZipImported = (result: InstagramZipImportResult, fileName: string) => {
    const followerText = result.followers.join('\n');
    const followingText = result.following.join('\n');
    const calculatedStats = computeAnalysis(result.following, result.followers);

    setFollowers(followerText);
    setFollowing(followingText);
    setStats(calculatedStats);
    setShowAsLinks(false);

    const filesRead = result.followerFiles.length + result.followingFiles.length;
    const warningText = result.warnings.length > 0 ? ` ${result.warnings.join(' ')}` : '';
    setAlert({
      type: 'success',
      title: 'ZIP Instagram importato',
      message: `${fileName}: ${result.followers.length} follower e ${result.following.length} seguiti da ${filesRead} file dati. Analisi completata automaticamente.${warningText}`,
    });

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

    setIsProcessing(true);

    requestAnimationFrame(() => {
      try {
        const followersList = parseInstagramText(rawFollowers);
        const followingList = parseInstagramText(rawFollowing);

        if (followersList.length === 0 && followingList.length === 0) {
          setAlert({
            type: 'error',
            title: 'Nessun account rilevato',
            message:
              'Impossibile estrarre account Instagram validi da entrambe le liste. Assicurati di aver incollato username, URL o file di esportazione ufficiali (JSON/HTML/CSV).',
          });
          setStats(null);
          return;
        }

        if (followersList.length === 0) {
          setAlert({
            type: 'error',
            title: 'Lista Follower non valida',
            message:
              'Non è stato trovato alcun account valido nella lista dei tuoi Follower. Controlla il formato dei dati incollati.',
          });
          setStats(null);
          return;
        }

        if (followingList.length === 0) {
          setAlert({
            type: 'error',
            title: 'Lista Seguiti non valida',
            message:
              'Non è stato trovato alcun account valido nella lista delle persone che Segui. Controlla il formato dei dati incollati.',
          });
          setStats(null);
          return;
        }

        setStats(computeAnalysis(followingList, followersList));
        setAlert(null);
        scrollToResultsOnSmallScreens();
      } catch (err) {
        setAlert({
          type: 'error',
          title: 'Errore durante l\'elaborazione',
          message: err instanceof Error ? err.message : 'Si è verificato un errore sconosciuto.',
        });
      } finally {
        setIsProcessing(false);
      }
    });
  };

  const handleReset = () => {
    setFollowers('');
    setFollowing('');
    setStats(null);
    setAlert(null);
    setShowAsLinks(false);
  };

  const isFormIncomplete = !followers.trim() || !following.trim();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 md:p-8 flex flex-col gap-6">
      <Header isAnalyzed={stats !== null} />

      <AlertBanner alert={alert} onDismiss={() => setAlert(null)} />

      {stats && <StatsCard stats={stats} />}

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-grow">
        <div className="lg:col-span-7 flex flex-col gap-4">
          <ZipImportCard onImported={handleZipImported} onError={handleZipError} />

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
  );
}
