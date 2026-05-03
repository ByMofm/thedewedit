"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import * as React from "react";

type ToastState = { id: number; message: string } | null;

let pushExternal: ((message: string) => void) | null = null;

export function toast(message: string) {
  pushExternal?.(message);
}

export function ToastHost() {
  const [toast, setToast] = React.useState<ToastState>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    pushExternal = (message: string) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: Date.now(), message });
      timer.current = setTimeout(() => setToast(null), 2500);
    };
    return () => {
      pushExternal = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2"
      aria-live="polite"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="pointer-events-auto flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm text-cream-soft shadow-[var(--shadow-lift)]"
          >
            <CheckCircle2 className="size-4 text-dew" />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
