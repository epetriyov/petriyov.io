import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { parse } from 'yaml';

/** Статьи блога: src/content/blog/*.md */
const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(120),
      description: z.string().max(300),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
      lang: z.enum(['ru', 'en']).default('ru'),
      heroImage: image().optional(),
    }),
});

/** Контентные страницы: about, now (+ en/*) */
const pages = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    /** Для now.md: одна строка для тизера на главной */
    summary: z.string().optional(),
    updatedDate: z.coerce.date().optional(),
    lang: z.enum(['ru', 'en']).default('ru'),
  }),
});

/** Резюме: один YAML-файл */
const resume = defineCollection({
  loader: file('./src/content/resume.yaml', {
    parser: (text) => [{ id: 'main', ...parse(text) }],
  }),
  schema: z.object({
    role: z.string(),
    summary: z.string(),
    experience: z.array(
      z.object({
        company: z.string(),
        title: z.string(),
        start: z.string(),
        end: z.string().optional(),
        location: z.string().optional(),
        points: z.array(z.string()).default([]),
      })
    ),
    skills: z.array(
      z.object({
        group: z.string(),
        items: z.array(z.string()),
      })
    ),
    education: z.array(
      z.object({
        place: z.string(),
        degree: z.string(),
        start: z.string().optional(),
        end: z.string().optional(),
      })
    ),
    extras: z.array(z.string()).default([]),
  }),
});

export const collections = { blog, pages, resume };
