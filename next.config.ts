import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Permite abrir el servidor de desarrollo desde otra IP de la red local (VirtualBox, otra PC del stand).
  allowedDevOrigins: ["192.168.56.1", "192.168.*.*", "*.local"],
  turbopack: {
    // Fija la raíz: evita que Turbopack tome un package-lock.json de una carpeta superior (OneDrive).
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
