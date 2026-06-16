import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Se acepta cualquier host https para que se puedan cargar imágenes de
    // productos nuevos desde el Sheet pegando un link de donde sea (Drive
    // público, Imgur, etc.) sin tocar la config.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
