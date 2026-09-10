import { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';

const STORAGE_KEY = 'instasniff-privacy-banner-dismissed-v1';

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function PrivacyBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!wasDismissed());
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // The banner can still be dismissed for the current page if storage is unavailable.
    }
  };

  if (!visible) return null;

  return (
    <aside
      role="status"
      aria-label="Informativa privacy"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl shadow-black/40 backdrop-blur sm:inset-x-6 sm:bottom-5 sm:p-4"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
          <ShieldCheck size={16} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-100">Privacy</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400 sm:text-xs">
            I file selezionati vengono elaborati nel browser per calcolare i risultati. InstaSniff non richiede login Instagram né credenziali di accesso.
          </p>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Chiudi informativa privacy"
          title="Chiudi"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
