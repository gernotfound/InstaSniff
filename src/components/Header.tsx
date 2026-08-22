import { ShieldCheck } from 'lucide-react';

interface HeaderProps {
  isAnalyzed: boolean;
}

export function Header({ isAnalyzed }: HeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Insta<span className="text-indigo-500">Sniff</span>
          </h1>
          <span className="bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full">
            v1.0
          </span>
        </div>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
          Scopri istantaneamente chi non ricambia il follow su Instagram. Incolla o carica le liste esportate: il sistema pulisce automaticamente date, pulsanti dell&apos;interfaccia e formati JSON / CSV estraendo solo i profili reali.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono">
          <div
            className={`w-2 h-2 rounded-full ${
              isAnalyzed ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          <span className="uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            {isAnalyzed ? 'Analisi Pronta' : 'Parser Pronto'}
          </span>
        </div>
      </div>
    </header>
  );
}
