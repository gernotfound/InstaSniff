import { AlertTriangle, Info, CheckCircle2, XCircle, X } from 'lucide-react';

export interface AlertMessage {
  type: 'warning' | 'error' | 'info' | 'success';
  title?: string;
  message: string;
}

interface AlertBannerProps {
  alert: AlertMessage | null;
  onDismiss?: () => void;
}

export function AlertBanner({ alert, onDismiss }: AlertBannerProps) {
  if (!alert) return null;

  const styleMap = {
    warning: {
      container: 'bg-amber-950/40 border-amber-500/40 text-amber-200',
      icon: <AlertTriangle size={18} className="text-amber-400 shrink-0" />,
      titleColor: 'text-amber-300',
    },
    error: {
      container: 'bg-red-950/40 border-red-500/40 text-red-200',
      icon: <XCircle size={18} className="text-red-400 shrink-0" />,
      titleColor: 'text-red-300',
    },
    info: {
      container: 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200',
      icon: <Info size={18} className="text-indigo-400 shrink-0" />,
      titleColor: 'text-indigo-300',
    },
    success: {
      container: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200',
      icon: <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />,
      titleColor: 'text-emerald-300',
    },
  };

  const currentStyle = styleMap[alert.type] || styleMap.info;

  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 p-4 rounded-xl border ${currentStyle.container} transition-all duration-200`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{currentStyle.icon}</div>
        <div className="text-xs leading-relaxed">
          {alert.title && (
            <strong className={`font-semibold block mb-0.5 ${currentStyle.titleColor}`}>
              {alert.title}
            </strong>
          )}
          <span>{alert.message}</span>
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none shrink-0 cursor-pointer"
          aria-label="Chiudi avviso"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
