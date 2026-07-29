import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    // Used as the browser tab <title>.
    pageTitle: z.string(),
    // <meta name="description">, og:description, twitter:description.
    metaDescription: z.string(),
    // og:image / twitter:image. Falls back to the site default in Layout.astro if omitted.
    ogImage: z.string().optional(),

    // Short client/project name shown as the small uppercase label in the
    // case study header (e.g. "orion", "Paymaster", "gardaworld").
    label: z.string(),
    // The large headline in the case study header.
    tagline: z.string(),
    // Raw HTML string (may contain e.g. <strong>) rendered verbatim -- mirrors
    // the "services" line under the tagline, e.g.
    // 'UX Strategy · ui design · <strong>Design Systems Development</strong>'.
    services: z.string(),

    // Hero image at the top of the case study (the big image under the nav).
    heroImage: z.string(),
    heroImageAlt: z.string().default(''),

    // "Project Overview" paragraph(s) shown under the header. Raw HTML string.
    overview: z.string(),
    // Whether the overview block uses the scroll-in blur reveal (matches the
    // source page -- some case studies have it, some don't).
    overviewReveal: z.boolean().default(false),

    // Optional "view live project" link shown next to the header copy.
    externalLink: z.string().optional(),
    externalLinkLabel: z.string().default('view live project'),

    // "Next project" footer module.
    nextProjectSlug: z.string(),
    nextProjectLabel: z.string(),
    nextProjectImage: z.string(),

    // --- Home page grid card fields ---
    // Short lowercase (usually) label shown on the home page project grid.
    homeLabel: z.string(),
    // Blurb shown on the home page project grid (distinct from `tagline`).
    homeDescription: z.string(),
    // Order in the home page "Featured case studies" grid.
    order: z.number(),
    // Home grid card media: either a static image or a looping background video.
    homeMedia: z.union([
      z.object({
        type: z.literal('image'),
        src: z.string(),
        srcset: z.string().optional(),
      }),
      z.object({
        type: z.literal('video'),
        poster: z.string(),
        mp4: z.string(),
        webm: z.string(),
      }),
    ]),
  }),
});

export const collections = { projects };
