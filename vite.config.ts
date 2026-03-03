import preact from "@preact/preset-vite";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [preact()],
  server: {
    https: {
      cert: readFileSync("./age-online-dev.localhost.pem"),
      key: readFileSync("./age-online-dev.localhost-key.pem"),
    },
  },
});
