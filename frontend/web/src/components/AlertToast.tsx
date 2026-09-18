import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAlertStore, AlertType } from '../store/alertStore';

export const AlertToast: React.FC = () => {
  const { toasts, removeToast } = useAlertStore();

  if (toasts.length === 0) return null;

  const getIcon = (type: AlertType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 text-cyan-500 shrink-0" />;
    }
  };

  const getStyles = (type: AlertType) => {
    switch (type) {
      case 'success':
        return 'bg-white dark:bg-slate-900 border-emerald-500/30 text-slate-800 dark:text-slate-100 shadow-emerald-500/10';
      case 'error':
        return 'bg-white dark:bg-slate-900 border-rose-500/30 text-slate-800 dark:text-slate-100 shadow-rose-500/10';
      case 'warning':
        return 'bg-white dark:bg-slate-900 border-amber-500/30 text-slate-800 dark:text-slate-100 shadow-amber-500/10';
      case 'info':
        return 'bg-white dark:bg-slate-900 border-cyan-500/30 text-slate-800 dark:text-slate-100 shadow-cyan-500/10';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[99999] flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none px-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-2xl border shadow-xl transition-all duration-300 transform translate-y-0 ${getStyles(
            toast.type
          )}`}
        >
          {getIcon(toast.type)}
          <div className="flex-1 text-xs space-y-0.5">
            <h5 className="font-bold leading-snug">{toast.title}</h5>
            {toast.message && (
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                {toast.message}
              </p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
