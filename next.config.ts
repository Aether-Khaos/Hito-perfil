import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Permite HMR al abrir el servidor desde otra IP de la red local (p. ej. VirtualBox 192.168.56.x)
  allowedDevOrigins: ["192.168.56.1", "192.168.*.*", "*.local"],
  turbopack: {
    // Fija la raíz del proyecto: evita que Turbopack tome un package-lock.json de una carpeta superior (OneDrive)
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
