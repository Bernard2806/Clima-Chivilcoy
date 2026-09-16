import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";

export default defineConfig({
  site: "https://climachivilcoy.netlify.app",
  adapter: netlify(),
});
