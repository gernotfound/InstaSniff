import { useState, useRef } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { InputCard } from './components/InputCard';
import { ResultsView } from './components/ResultsView';
import { StatsCard } from './components/StatsCard';
import { AlertBanner, AlertMessage } from './components/AlertBanner';
import { parseInstagramText, computeAnalysis, AnalysisStats } from './utils';
import { Search, Loader2 } from 'lucide-react';

export default function App() {
  const [followers, setFollowers] = useState('');
  const [following, setFollowing] = useState('');
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Invalidate previous analysis when user edits input text
  const handleFollowersChange = (val: string) => {
    setFollowers(val);
    if (stats) setStats(null);
    if (alert) setAlert(null);
  };

  const handleFollowingChange = (val: string) => {
    setFollowing(val);
    if (stats) setStats(null);
    if (alert) setAlert(null);
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

    // Use requestAnimationFrame / timeout to prevent main-thread freezing on heavy exports
    setTimeout(() => {
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
          setIsProcessing(false);
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
          setIsProcessing(false);
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
          setIsProcessing(false);
          return;
        }

        const calculatedStats = computeAnalysis(followingList, followersList);
        setStats(calculatedStats);
        setAlert(null);

        // Smooth scroll to results on mobile/tablet viewports
        if (window.innerWidth < 1024 && resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (err) {
        setAlert({
          type: 'error',
          title: 'Errore durante l\'elaborazione',
          message: err instanceof Error ? err.message : 'Si è verificato un errore sconosciuto.',
        });
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  };

  const handleReset = () => {
    setFollowers('');
    setFollowing('');
    setStats(null);
    setAlert(null);
  };

  const isFormIncomplete = !followers.trim() || !following.trim();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 md:p-8 flex flex-col gap-6">
      <Header isAnalyzed={stats !== null} />

      <AlertBanner alert={alert} onDismiss={() => setAlert(null)} />

      {stats && <StatsCard stats={stats} />}

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-grow">
        {/* Left Side: Input Section & Action Button */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputCard
              title="I tuoi Follower"
              description="Lista o file esportato degli account che ti seguono."
              value={followers}
              onChange={handleFollowersChange}
              placeholder="Es.&#10;@alberto_barnus99&#10;https://instagram.com/podstract&#10;mario_rossi&#10;..."
            />

            <InputCard
              title="Chi Segui"
              description="Lista o file esportato degli account che segui."
              value={following}
              onChange={handleFollowingChange}
              placeholder="Es.&#10;@cristiano&#10;intreccidisogni_&#10;https://instagram.com/user&#10;..."
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
            aria-label="Avvia scansione e trova chi non ricambia il follow"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Elaborazione in corso...
              </>
            ) : (
              <>
                <Search size={18} />
                Trova chi non ti segue
              </>
            )}
          </button>
        </div>

        {/* Right Side: Results Section */}
        <div ref={resultsRef} className="lg:col-span-5 flex flex-col min-h-0">
          <ResultsView stats={stats} onReset={handleReset} />
        </div>
      </main>

      <Footer isAnalyzed={stats !== null} />
    </div>
  );
}
