"use client";

import Image from "next/image";
import * as React from "react";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  images: string[];
  alt: string;
}

export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [active, setActive] = React.useState(0);
  const main = images[active];

  return (
    <div className="flex flex-col gap-3 md:flex-row-reverse md:gap-4">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-lg)] bg-cream md:flex-1 md:max-h-[700px]">
        <Image
          src={main}
          alt={alt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 55vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-3 md:w-[88px] md:flex-col">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              aria-label={`Ver imagen ${i + 1}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "relative aspect-[4/5] w-20 overflow-hidden rounded-[var(--radius-sm)] transition",
                i === active ? "ring-2 ring-lavender" : "opacity-70 hover:opacity-100",
              )}
            >
              <Image src={src} alt="" aria-hidden fill sizes="100px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
