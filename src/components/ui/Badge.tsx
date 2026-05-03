import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "peach" | "lavender" | "gold" | "dew";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink/8 text-ink",
  peach: "bg-peach text-white",
  lavender: "bg-lavender text-white",
  gold: "bg-gold text-white",
  dew: "bg-dew text-ink",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wider uppercase",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
