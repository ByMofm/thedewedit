"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Instagram, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

export interface MobileNavItem {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
}

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  items: MobileNavItem[];
}

function NavItem({ item, onClose }: { item: MobileNavItem; onClose: () => void }) {
  const [expanded, setExpanded] = React.useState(false);
  const hasChildren = (item.children?.length ?? 0) > 0;

  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className="block rounded-[var(--radius-sm)] px-3 py-3 text-base text-ink hover:bg-ink/5"
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-3 text-base text-ink hover:bg-ink/5"
      >
        {item.label}
        <ChevronDown
          className={cn(
            "size-4 text-ink-soft transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="ml-4 border-l border-ink/10 pl-3 pb-2 pt-0.5 flex flex-col gap-0.5">
              {item.children!.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onClose}
                  className="block rounded-[var(--radius-sm)] px-3 py-2.5 text-[14px] text-ink-soft hover:text-ink hover:bg-ink/5"
                >
                  {child.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MobileMenu({ open, onClose, items }: MobileMenuProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Cerrar menú"
            onClick={onClose}
            className="fixed inset-0 z-50 bg-ink/30 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className="fixed inset-y-0 left-0 z-50 w-[82%] max-w-[340px] bg-cream-soft p-6 md:hidden overflow-y-auto"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
          >
            <div className="flex items-center justify-between pb-4">
              <span className="font-display text-lg">Menú</span>
              <button
                type="button"
                onClick={onClose}
                className="flex size-9 items-center justify-center rounded-full hover:bg-ink/5"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-0.5 py-4">
              {items.map((item) => (
                <NavItem key={item.label} item={item} onClose={onClose} />
              ))}
            </nav>

            <div className="mt-6 border-t border-ink/10 pt-6">
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
              >
                <Instagram className="size-4" />
                {siteConfig.social.instagramHandle}
              </a>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
