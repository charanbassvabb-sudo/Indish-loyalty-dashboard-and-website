import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** e.g. { label: "Undo", onClick: () => ... } — rendered as a small text button, auto-dismisses the toast when clicked. */
  action?: { label: string; onClick: () => void };
  /** Overrides the default auto-dismiss delay — undo toasts want longer than a plain confirmation. */
  duration?: number;
}

type ToastInput = Omit<Toast, "id">;

const ToastContext = createContext<{ toast: (input: ToastInput) => void } | null>(null);

const ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const ACCENTS: Record<ToastVariant, string> = {
  success: "text-emerald-400 border-emerald-500/30",
  error: "text-destructive border-destructive/30",
  info: "text-primary border-primary/30",
};

const DURATION = 4200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      setToasts((t) => [...t, { ...input, id }]);
      window.setTimeout(() => dismiss(id), input.duration ?? DURATION);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.variant];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`card-warm pointer-events-auto flex w-full max-w-sm items-start gap-3 border p-4 shadow-lift ${ACCENTS[t.variant]}`}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                  )}
                  {t.action && (
                    <button
                      onClick={() => {
                        t.action?.onClick();
                        dismiss(t.id);
                      }}
                      className="mt-1.5 text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      {t.action.label}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
