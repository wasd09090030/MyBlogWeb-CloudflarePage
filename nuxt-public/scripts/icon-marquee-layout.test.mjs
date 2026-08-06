import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const readAppFile = (path) => readFile(new URL(`app/${path}`, root), 'utf8')

test('embeds the icon marquee inside the homepage announcement card', async () => {
  const source = await readAppFile('components/WelcomeSection.vue')
  const topSection = source.match(/<div class="top-section">([\s\S]*?)<\/div>\s*\n\s*<!-- 底部三个小卡片 -->/)

  assert.ok(topSection, 'top-section should contain the full announcement-card markup')
  assert.match(topSection[1], /<IconMarquee class="icon-marquee-wrapper"\s*\/>/)
})

test('uses straight UMarquee columns with the default overlay', async () => {
  const source = await readAppFile('components/IconMarquee.vue')

  assert.doesNotMatch(source, /:overlay="false"/)
  assert.doesNotMatch(source, /rotate-[xyz]-|transform-3d|marquee-3d/)
  assert.match(source, /orientation="vertical"/)
  assert.match(source, /\breverse\b/)
})

test('keeps icon tiles compact inside the announcement card', async () => {
  const source = await readAppFile('components/IconMarquee.vue')

  assert.match(source, /\.icon-image\s*\{[\s\S]*?width:\s*48px;[\s\S]*?height:\s*48px;/)
})
