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

const projectRoot = new URL('../', import.meta.url)
const readAppFile = (path) => readFile(new URL(`app/${path}`, projectRoot), 'utf8')

test('game gallery has one Bento render path and forwards tile bounds', async () => {
  const source = await readAppFile('features/gallery-public/components/GameGallerySection.vue')

  assert.match(source, /class="game-bento-grid"/)
  assert.match(source, /buildGameBentoBlocks/)
  assert.match(source, /getBoundingClientRect\(\)/)
  assert.doesNotMatch(source, /skeleton-[abcd]|filmstrip/i)
})

test('desktop game tiles are square and shadow-free', async () => {
  const source = await readAppFile('assets/css/components/GameGallerySection.desktop.css')

  assert.match(source, /\.game-bento-tile\s*\{[\s\S]*?border-radius:\s*0;/)
  assert.match(source, /\.game-bento-tile\s*\{[\s\S]*?box-shadow:\s*none;/)
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
