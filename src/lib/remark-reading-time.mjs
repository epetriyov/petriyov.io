import { toString } from 'mdast-util-to-string';

/**
 * Считает время чтения (≈200 слов/мин) и кладёт его
 * в frontmatter как `minutesRead`.
 */
export function remarkReadingTime() {
  return (tree, { data }) => {
    const text = toString(tree);
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    data.astro.frontmatter.minutesRead = Math.max(1, Math.round(words / 200));
  };
}
