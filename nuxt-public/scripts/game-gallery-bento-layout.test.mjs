import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  buildGameBentoBlocks,
  getGameBentoAspect
} from '../app/features/gallery-public/utils/gameBentoLayout.js'

test('classifies 16:9, 16:10, and unknown screenshot dimensions', () => {
  assert.equal(getGameBentoAspect({ imageWidth: 1920, imageHeight: 1080 }), '16x9')
  assert.equal(getGameBentoAspect({ imageWidth: 1920, imageHeight: 1200 }), '16x10')
  assert.equal(getGameBentoAspect({}), '16x10')
})

test('builds repeatable Bento blocks without dropping or reordering screenshots', () => {
  const images = Array.from({ length: 13 }, (_, index) => ({
    id: index,
    imageWidth: index % 2 === 0 ? 1920 : 1600,
    imageHeight: index % 2 === 0 ? 1080 : 1000
  }))

  const blocks = buildGameBentoBlocks(images)

  assert.deepEqual(blocks.map(block => block.tiles.length), [6, 6, 1])
  assert.deepEqual(blocks.flatMap(block => block.tiles.map(tile => tile.image.id)), images.map(image => image.id))
  assert.deepEqual(blocks[0].tiles.map(tile => tile.role), ['feature', 'wide', 'standard', 'standard', 'wide', 'standard'])
})

test('assigns a stable month variant and rotates following Bento blocks', () => {
  const images = Array.from({ length: 13 }, (_, id) => ({
    id,
    imageWidth: 1600,
    imageHeight: 1000
  }))

  const first = buildGameBentoBlocks(images, '2026-08')
  const second = buildGameBentoBlocks(images, '2026-08')

  assert.deepEqual(first.map(block => block.variant), second.map(block => block.variant))
  assert.equal(new Set(first.map(block => block.variant)).size, 3)
})

const projectRoot = new URL('../', import.meta.url)
const readAppFile = (path) => readFile(new URL(`app/${path}`, projectRoot), 'utf8')

test('game gallery has one Bento render path and forwards tile bounds', async () => {
  const source = await readAppFile('features/gallery-public/components/GameGallerySection.vue')

  assert.match(source, /'game-bento-grid'/)
  assert.match(source, /buildGameBentoBlocks/)
  assert.match(source, /getBoundingClientRect\(\)/)
  assert.doesNotMatch(source, /skeleton-[abcd]|filmstrip/i)
})

test('desktop game tiles are square and shadow-free', async () => {
  const source = await readAppFile('assets/css/components/GameGallerySection.desktop.css')

  assert.match(source, /\.game-bento-tile\s*\{[\s\S]*?border-radius:\s*0;/)
  assert.match(source, /\.game-bento-tile\s*\{[\s\S]*?box-shadow:\s*none;/)
})

test('game section exposes stable variant and whole-month compact-count classes', async () => {
  const component = await readAppFile('features/gallery-public/components/GameGallerySection.vue')
  const css = await readAppFile('assets/css/components/GameGallerySection.desktop.css')

  assert.match(component, /game-bento-grid--\$\{block\.variant\}/)
  assert.match(component, /game-bento-grid--count-\$\{images\.length\}/)
  assert.match(component, /monthKey/)
  assert.match(css, /max-width:\s*640px/)
  assert.match(css, /max-width:\s*820px/)
  assert.match(css, /max-width:\s*980px/)
})

test('variant C keeps its feature image below full-width poster scale', async () => {
  const css = await readAppFile('assets/css/components/GameGallerySection.desktop.css')

  assert.match(css, /\.game-bento-grid--c\s*\{[\s\S]*?max-width:\s*1080px/)
  assert.match(css, /\.game-bento-grid--c\s+\.game-bento-tile--feature\s*\{[\s\S]*?grid-column:\s*span 7/)
  assert.match(css, /\.game-bento-grid--c\s+\.game-bento-tile--wide\s*\{[\s\S]*?grid-column:\s*span 5/)
})

test('gallery category content is keyed for camera-push switching', async () => {
  const source = await readAppFile('features/gallery-public/components/GalleryContent.vue')
  const css = await readAppFile('assets/css/components/Gallery.desktop.css')

  assert.match(source, /<Transition name="gallery-mode" mode="out-in">/)
  assert.match(source, /:key="activeTag"/)
  assert.match(css, /\.gallery-mode-enter-active/)
})

test('game fullscreen requests retain source bounds in a pointer-transparent layer', async () => {
  const container = await readAppFile('features/gallery-public/containers/GalleryPageContainer.vue')
  const layer = await readAppFile('shared/ui/ImageOriginTransition.vue')

  assert.match(container, /fullscreenOriginRect/)
  assert.match(container, /payload\?\.image \?\? payload/)
  assert.match(layer, /pointer-events:\s*none/)
})
