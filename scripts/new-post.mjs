#!/usr/bin/env node
/**
 * Заготовка новой статьи: npm run new:post -- "Заголовок статьи"
 * Создаёт src/content/blog/<slug>.md с сегодняшней датой.
 */
import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('Использование: npm run new:post -- "Заголовок статьи"');
  process.exit(1);
}

const translitMap = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

const slug = title
  .toLowerCase()
  .split('')
  .map((ch) => translitMap[ch] ?? ch)
  .join('')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

if (!slug) {
  console.error('Не получилось построить slug из заголовка.');
  process.exit(1);
}

const file = resolve(import.meta.dirname, '../src/content/blog', `${slug}.md`);
if (existsSync(file)) {
  console.error(`Файл уже существует: ${file}`);
  process.exit(1);
}

const today = new Date().toISOString().split('T')[0];
const needsQuotes = /[:#\[\]{}&*!|>'"%@`]/.test(title);
const safeTitle = needsQuotes ? `'${title.replace(/'/g, "''")}'` : title;

const template = `---
title: ${safeTitle}
description: Одно предложение для карточки и meta description (до 155 символов).
pubDate: ${today}
tags: []
draft: true
lang: ru
---

Текст статьи. Уберите \`draft: true\`, когда будете готовы опубликовать.
`;

writeFileSync(file, template);
console.log(`Создано: src/content/blog/${slug}.md`);
console.log('Не забудьте: description, теги и draft: false перед публикацией.');
