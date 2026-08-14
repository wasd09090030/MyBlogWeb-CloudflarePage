import { listPublicGalleryHero } from '~~/server/domain/gallery-hero'

export default defineEventHandler(async (event) => await listPublicGalleryHero(event))
