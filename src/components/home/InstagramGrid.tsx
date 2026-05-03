"use client";

import Image from "next/image";
import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Instagram,
  MessageCircle,
} from "lucide-react";
import { siteConfig } from "@/config/site";

interface IgPost {
  src: string;
  likes: number;
  comments: number;
  caption: string;
}

const posts: IgPost[] = [
  {
    src: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=80",
    likes: 2840,
    comments: 86,
    caption: "Nueva Velvet Skin Tint ✨",
  },
  {
    src: "https://images.unsplash.com/photo-1631214540553-ff044a3ff1d4?auto=format&fit=crop&w=700&q=80",
    likes: 4125,
    comments: 214,
    caption: "Dew skin para el finde 🤍",
  },
  {
    src: "https://images.unsplash.com/photo-1583209814683-c023dd293cc6?auto=format&fit=crop&w=700&q=80",
    likes: 1920,
    comments: 54,
    caption: "Rutina de la mañana",
  },
  {
    src: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=700&q=80",
    likes: 3380,
    comments: 127,
    caption: "Less is more 🌸",
  },
  {
    src: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=700&q=80",
    likes: 2155,
    comments: 73,
    caption: "Nuestros sets favoritos",
  },
  {
    src: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=700&q=80",
    likes: 1680,
    comments: 42,
    caption: "Lip oil love",
  },
  {
    src: "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=700&q=80",
    likes: 2960,
    comments: 98,
    caption: "Glow natural, siempre",
  },
  {
    src: "https://images.unsplash.com/photo-1578496480157-697fc14d2e55?auto=format&fit=crop&w=700&q=80",
    likes: 3540,
    comments: 156,
    caption: "Tips & rutinas ✨",
  },
];

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const HOTSPOT_RATIO = 0.18;
const BASE_SPEED = 0.35;
const EDGE_SPEED = 2.4;

export function InstagramGrid() {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const speedRef = React.useRef<number>(BASE_SPEED);
  const [edge, setEdge] = React.useState<"left" | "right" | null>(null);

  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    let rafId = 0;
    let lastTs = performance.now();

    const tick = (ts: number) => {
      const delta = ts - lastTs;
      lastTs = ts;
      const speed = speedRef.current;

      if (speed !== 0) {
        const half = track.scrollWidth / 2;
        if (half > 0) {
          track.scrollLeft += speed * (delta / 16.67);
          if (track.scrollLeft >= half) {
            track.scrollLeft -= half;
          } else if (track.scrollLeft < 0) {
            track.scrollLeft += half;
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (x < HOTSPOT_RATIO) {
      speedRef.current = -EDGE_SPEED;
      setEdge("left");
    } else if (x > 1 - HOTSPOT_RATIO) {
      speedRef.current = EDGE_SPEED;
      setEdge("right");
    } else {
      speedRef.current = BASE_SPEED;
      setEdge(null);
    }
  };

  const handleMouseLeave = () => {
    speedRef.current = BASE_SPEED;
    setEdge(null);
  };

  const loopedPosts = [...posts, ...posts];

  return (
    <section className="py-16 md:py-24">
      <div className="container-page mb-8 flex flex-col items-center text-center md:flex-row md:items-end md:justify-between md:text-left">
        <div className="flex flex-col items-center md:items-start">
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-lavender-deep">
            <Instagram className="size-3.5" />
            Comunidad
          </span>
          <h2 className="mt-2 font-display text-[2rem] leading-tight text-ink md:text-[2.6rem]">
            Seguinos en{" "}
            <a
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noopener"
              className="italic text-lavender-deep hover:underline underline-offset-4"
            >
              {siteConfig.social.instagramHandle}
            </a>
          </h2>
          <p className="mt-2 max-w-md text-sm text-ink-soft">
            Tips, novedades y contenido real de la comunidad.
          </p>
        </div>
        <a
          href={siteConfig.social.instagram}
          target="_blank"
          rel="noopener"
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-ink/20 px-5 text-sm font-medium text-ink transition hover:border-ink/60 md:mt-0"
        >
          <Instagram className="size-4" />
          Ver todas
        </a>
      </div>

      <div
        className="relative"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={trackRef}
          className="flex gap-3 overflow-x-auto px-5 pb-4 sm:px-8 md:gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Posts de Instagram"
        >
          {loopedPosts.map((post, i) => (
            <a
              key={i}
              href={siteConfig.social.instagram}
              target="_blank"
              rel="noopener"
              aria-hidden={i >= posts.length}
              tabIndex={i >= posts.length ? -1 : 0}
              className="group relative aspect-square w-[70%] shrink-0 overflow-hidden rounded-[var(--radius-lg)] bg-cream sm:w-[45%] md:w-[30%] lg:w-[23%]"
            >
              <Image
                src={post.src}
                alt={post.caption}
                fill
                sizes="(max-width: 640px) 70vw, (max-width: 1024px) 30vw, 23vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm">
                <Instagram className="size-4 text-ink" />
              </div>

              <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <p className="line-clamp-1 text-[13px] font-medium">{post.caption}</p>
                <div className="mt-1.5 flex items-center gap-4 text-[12px]">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-3.5 fill-white" />
                    {compact(post.likes)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="size-3.5" />
                    {compact(post.comments)}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 flex w-20 items-center justify-start bg-gradient-to-r from-cream-soft via-cream-soft/70 to-transparent pl-3 transition-opacity duration-300 md:w-28 ${
            edge === "left" ? "opacity-100" : "opacity-60"
          }`}
        >
          <div
            className={`flex size-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-[var(--shadow-soft)] transition-transform ${
              edge === "left" ? "-translate-x-0.5 scale-110" : ""
            }`}
          >
            <ChevronLeft className="size-5" />
          </div>
        </div>
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 right-0 flex w-20 items-center justify-end bg-gradient-to-l from-cream-soft via-cream-soft/70 to-transparent pr-3 transition-opacity duration-300 md:w-28 ${
            edge === "right" ? "opacity-100" : "opacity-60"
          }`}
        >
          <div
            className={`flex size-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-[var(--shadow-soft)] transition-transform ${
              edge === "right" ? "translate-x-0.5 scale-110" : ""
            }`}
          >
            <ChevronRight className="size-5" />
          </div>
        </div>
      </div>
    </section>
  );
}
