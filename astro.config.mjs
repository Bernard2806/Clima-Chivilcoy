import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://climachivilcoy.netlify.app",
  adapter: netlify(),
  integrations: [sitemap()],
});
