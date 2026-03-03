import preact from "@preact/preset-vite";
import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "vite";

const certExists = existsSync("./age-online-dev.localhost.pem");

export default defineConfig({
  plugins: [preact()],
  server: certExists
    ? {
        https: {
          cert: readFileSync("./age-online-dev.localhost.pem"),
          key: readFileSync("./age-online-dev.localhost-key.pem"),
        },
      }
    : {},
});
