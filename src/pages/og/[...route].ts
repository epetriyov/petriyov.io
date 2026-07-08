import { OGImageRoute } from 'astro-og-canvas';
import { getCollection } from 'astro:content';

const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
const pages = Object.fromEntries(posts.map((post) => [post.id, post.data]));

export const { getStaticPaths, GET } = await OGImageRoute({
  pages,
  getImageOptions: (_path, page: (typeof pages)[string]) => ({
    title: page.title,
    description: page.description,
    bgGradient: [[241, 243, 238]] as [number, number, number][],
    padding: 72,
    border: { color: [62, 92, 70] as [number, number, number], width: 14, side: 'inline-start' as const },
    font: {
      title: {
        size: 56,
        weight: 'SemiBold' as const,
        color: [35, 40, 31] as [number, number, number],
        lineHeight: 1.25,
        families: ['Inter'],
      },
      description: {
        size: 28,
        color: [91, 99, 85] as [number, number, number],
        lineHeight: 1.5,
        families: ['Inter'],
      },
    },
    fonts: ['./src/assets/fonts/Inter-Regular.otf', './src/assets/fonts/Inter-SemiBold.otf'],
  }),
});
