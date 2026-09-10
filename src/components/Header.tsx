export function Header() {
  return (
    <header className="border-b border-slate-800 pb-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Insta<span className="text-indigo-500">Sniff</span>
          </h1>
          <span className="bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full">
            v1.1
          </span>
        </div>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
          Scopri chi non ricambia il follow senza login e senza API. Importa direttamente il ZIP ufficiale di Instagram oppure usa JSON, HTML, CSV e liste di username.
        </p>
      </div>
    </header>
  );
}
