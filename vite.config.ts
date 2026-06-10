/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base relativa para que funcione como artifact estático en cualquier subruta.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // El dataset real va incrustado en el bundle (≈1.6MB raw / ~205KB gzip).
  build: { chunkSizeWarningLimit: 2000 },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
