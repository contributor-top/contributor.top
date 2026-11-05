// Methodology and Privacy in every language: i18n/docs/<language>/<page>.md (English is the source).

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

export const collections = {
  docs: defineCollection({
    loader: glob({ pattern: "*/*.md", base: "./src/web/i18n/docs" }),
    schema: z.object({ title: z.string(), description: z.string() }),
  }),
};
