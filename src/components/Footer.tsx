import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="flex justify-center items-center text-xs text-slate-400 border-t border-slate-800 pt-5 font-mono">
      <span className="flex items-center gap-1.5 text-slate-400 text-center">
        <ShieldCheck size={13} className="text-emerald-400 shrink-0" aria-hidden="true" />
        Elaborazione locale: il tuo ZIP non viene caricato su server esterni.
      </span>
    </footer>
  );
}
