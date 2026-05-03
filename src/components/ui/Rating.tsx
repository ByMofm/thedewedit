import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  score: number;
  count?: number;
  size?: "sm" | "md";
  showCount?: boolean;
  className?: string;
}

export function Rating({
  score,
  count,
  size = "sm",
  showCount = true,
  className,
}: RatingProps) {
  const textSize = size === "sm" ? "text-[12px]" : "text-sm";
  const starSize = size === "sm" ? "size-3.5" : "size-4";

  return (
    <div
      className={cn("inline-flex items-center gap-1.5", textSize, className)}
      aria-label={`${score.toFixed(1)} estrellas${count ? `, ${count} reseñas` : ""}`}
    >
      <Star className={cn(starSize, "fill-gold text-gold")} />
      <span className="font-medium text-ink tabular-nums">{score.toFixed(1)}</span>
      {showCount && count != null && (
        <span className="text-muted tabular-nums">({count})</span>
      )}
    </div>
  );
}
