"use client";

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";

const messages = [
  "🤍 3 cuotas sin interés con tarjetas bancarizadas",
  "✨ 20% OFF pagando en efectivo o transferencia",
  "🚚 Envío gratis en compras superiores a $35.000",
  "🌿 Envíos a todo el país",
];

export function AnnouncementBar() {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative overflow-hidden bg-ink text-cream-soft">
      <div className="container-page flex h-9 items-center justify-center text-[12px] tracking-[0.02em]">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute"
          >
            {messages[index]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
