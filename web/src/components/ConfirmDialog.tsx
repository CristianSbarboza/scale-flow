"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (result: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    const opts = typeof options === "string" ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      setPending({ options: opts, resolve });
    });
  }, []);

  const respond = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center gap-4 items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            style={{ zIndex: 100 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="card glass"
              style={{
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
                  <AlertTriangle size={20} />
                </div>
                <h3>{pending.options.title || "Confirmar ação"}</h3>
              </div>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
                {pending.options.message}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button variant="secondary" type="button" onClick={() => respond(false)}  style={{ flex: 1 }}>
                  {pending.options.cancelLabel || "Cancelar"}
                </Button>
                <Button variant="danger" className="flex-1" type="button" onClick={() => respond(true)}>
                  {pending.options.confirmLabel || "Confirmar"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
