import { ShieldCheck, Lock } from 'lucide-react';

interface FooterProps {
  isAnalyzed: boolean;
}

export function Footer({ isAnalyzed }: FooterProps) {
  return (
    <footer className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 border-t border-slate-800 pt-5 font-mono gap-3">
      <div className="flex items-center gap-2">
        <Lock size={13} className="text-emerald-400" />
        <span>100% Client-Side: Nessun dato o lista viene inviato a server esterni.</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-slate-300">
          <ShieldCheck size={13} className="text-indigo-400" />
          STATO: {isAnalyzed ? 'ANALISI_COMPLETATA' : 'IN_ATTESA_DATI'}
        </span>
      </div>
    </footer>
  );
}
