import { defineConfig, envField } from "astro/config";
import netlify from "@astrojs/netlify";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://climachivilcoy.netlify.app",
  adapter: netlify(),
  integrations: [sitemap()],
  env: {
    schema: {
      WEBCAM_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
        url: true,
      }),
    },
  },
});
