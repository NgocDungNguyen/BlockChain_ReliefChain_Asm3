import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

/**
 * vite.config.ts for ReliefChain frontend.
 *
 * Key decisions:
 *  1. vite-plugin-node-polyfills@0.21.0 replaces manual crypto/buffer/stream
 *     aliases. It injects browser-compatible shims for all Node.js built-ins
 *     that ethers.js v5 requires (particularly @ethersproject/* packages).
 *     This eliminates the MSVC build-tools failures that @pinata/sdk triggered
 *     through node-gyp, since we no longer depend on native bindings.
 *
 *  2. optimizeDeps.include forces Vite to pre-bundle ethers.js at dev-server
 *     startup, which prevents the "Failed to resolve import" error that occurs
 *     when ethers' deep sub-package imports are processed on-demand.
 *
 *  3. resolve.alias for ethers is not required here because the polyfill
 *     plugin handles the underlying Buffer/crypto/stream dependencies.
 */
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Include only the polyfills ethers.js v5 actually needs.
      include:  ["buffer", "crypto", "stream", "util", "events", "assert"],
      globals:  { Buffer: true, global: true, process: true },
      protocolImports: true,
    }),
  ],

  optimizeDeps: {
    include: [
      "ethers",
      "@ethersproject/providers",
      "@ethersproject/contracts",
      "@ethersproject/abi",
      "@ethersproject/bignumber",
      "@ethersproject/units",
      "axios",
    ],
  },

  build: {
    target: "es2020",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          ethers: ["ethers"],
          react:  ["react", "react-dom"],
        },
      },
    },
  },

  server: {
    port: 5173,
    host: true,
    // Proxy for local Hardhat node — avoids CORS in dev mode
    proxy: {
      "/rpc": {
        target:      "http://127.0.0.1:8545",
        changeOrigin: true,
        rewrite:     (path) => path.replace(/^\/rpc/, ""),
      },
    },
  },
});
