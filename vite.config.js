import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The app lives at the repo root; Vercel builds this to /dist and serves
// the /api serverless functions alongside it. For local dev of the API too,
// use `vercel dev` (see README). Plain `vite` serves only the frontend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Only used if you run a local API on :8888; harmless otherwise.
    proxy: { "/api": "http://127.0.0.1:8888" },
  },
});
