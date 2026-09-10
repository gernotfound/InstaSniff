import { ShieldCheck } from 'lucide-react';

interface FooterProps {
  isAnalyzed: boolean;
}

export function Footer({ isAnalyzed }: FooterProps) {
  return (
    <footer className="flex justify-center sm:justify-end items-center text-xs text-slate-400 border-t border-slate-800 pt-5 font-mono gap-3">
      <span className="flex items-center gap-1.5 text-slate-300">
        <ShieldCheck size={13} className="text-indigo-400" aria-hidden="true" />
        STATO: {isAnalyzed ? 'ANALISI_COMPLETATA' : 'IN_ATTESA_DATI'}
      </span>
    </footer>
  );
}
