import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://azzum.studio',
  trailingSlash: 'never',
  build: {
    // Preserve the existing Webflow-era URL scheme (e.g. /paymaster.html)
    // so bookmarks and any external links to the live site keep working.
    format: 'file',
  },
});
