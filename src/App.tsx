import { useState } from 'react';
import { InputCard } from './components/InputCard';
import { parseInstagramText } from './utils';
import { Link as LinkIcon, RefreshCcw, Search, ExternalLink } from 'lucide-react';

export default function App() {
  const [followers, setFollowers] = useState('');
  const [following, setFollowing] = useState('');
  const [unfollowers, setUnfollowers] = useState<string[] | null>(null);
  const [showLinks, setShowLinks] = useState(false);

  const handleProcess = () => {
    if (!followers.trim() || !following.trim()) {
      alert("Inserisci entrambe le liste (Follower e Seguiti) per continuare.");
      return;
    }

    const followersSet = new Set(parseInstagramText(followers));
    const followingSet = new Set(parseInstagramText(following));

    // Trova le persone che tu segui (followingSet), ma che non sono nei tuoi follower (followersSet)
    const notFollowingBack = Array.from(followingSet).filter(
      (user) => !followersSet.has(user)
    );

    setUnfollowers(notFollowingBack);
  };

  const handleReset = () => {
    setFollowers('');
    setFollowing('');
    setUnfollowers(null);
    setShowLinks(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 flex flex-col gap-6 overflow-x-hidden">
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Insta<span className="text-indigo-500">Sniff</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Scopri chi non ricambia il follow su Instagram. Incolla le liste esportate: il sistema pulirà le date in automatico estraendo solo i nomi utente.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs font-mono uppercase tracking-widest text-slate-300">Live Parser Active</span>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-grow">
        {/* Input Section - Left Side */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
          <InputCard
            title="I tuoi Follower"
            description="Lista o file esportato di chi ti segue."
            value={followers}
            onChange={setFollowers}
            placeholder="Es.&#10;podstract&#10;ago 18, 2026 6:14 am&#10;alberto_barnus99&#10;..."
          />
          <InputCard
            title="Chi Segui"
            description="Lista o file esportato delle persone che segui."
            value={following}
            onChange={setFollowing}
            placeholder="Es.&#10;intreccidisogni_&#10;giu 30, 2026 2:12 pm&#10;..."
          />
          
          {/* Action Row */}
          <div className="md:col-span-2">
            <button
              onClick={handleProcess}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-4 rounded-2xl text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all uppercase shadow-lg shadow-indigo-500/10 border border-indigo-500/20"
            >
              <Search size={18} />
              Trova chi non ti segue
            </button>
          </div>
        </div>

        {/* Results Section - Right Side */}
        <section className="lg:col-span-4 bg-slate-900 rounded-2xl border border-indigo-500/30 p-6 flex flex-col gap-4 shadow-xl shadow-indigo-500/5 lg:min-h-[500px]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Risultati {unfollowers && `(${unfollowers.length})`}</h3>
            <div className="flex gap-2">
              <button 
                onClick={handleReset} 
                className="bg-slate-800 p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Ricomincia"
              >
                <RefreshCcw size={16} />
              </button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {!unfollowers ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm font-mono text-center">
                <span className="mb-3 opacity-50"><Search size={32} /></span>
                In attesa dei dati...<br/>Incolla le liste e avvia la ricerca.
              </div>
            ) : unfollowers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-green-500 text-sm font-mono text-center px-4">
                Grande! Tutti quelli che segui ti seguono a loro volta. 🎉
              </div>
            ) : (
              unfollowers.map(user => (
                <div key={user} className="group flex items-center justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-800 hover:border-indigo-500/50 transition-colors">
                  <div className="flex flex-col overflow-hidden mr-2">
                    <span className="text-sm font-mono text-slate-200 truncate" title={`@${user}`}>@{user}</span>
                  </div>
                  {showLinks ? (
                    <a 
                      href={`https://instagram.com/${user}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-400 font-bold hover:underline transition-opacity shrink-0 flex items-center gap-1"
                      title="Apri su Instagram"
                    >
                      PROFILO <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-500 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      Unfollower
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {unfollowers && unfollowers.length > 0 && (
            <button 
              onClick={() => setShowLinks(!showLinks)}
              className="bg-indigo-600 p-3 rounded-xl text-center cursor-pointer hover:bg-indigo-500 transition-all text-white border border-indigo-500/20 shadow-md flex justify-center items-center gap-2 mt-auto"
            >
              <LinkIcon size={16} />
              <span className="text-sm font-bold tracking-wider">{showLinks ? "MOSTRA SOLO NOMI" : "CREA LINK AI PROFILI"}</span>
            </button>
          )}
        </section>
      </main>
      
      <footer className="flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-600 border-t border-slate-800 pt-4 font-mono gap-2">
        <div>SOURCE: LOCAL_STORAGE / REPO: GITHUB_UI</div>
        <div>SYSTEM_STATUS: {unfollowers ? 'ANALYSIS_COMPLETE' : 'READY_TO_PARSE'}</div>
      </footer>
    </div>
  );
}
