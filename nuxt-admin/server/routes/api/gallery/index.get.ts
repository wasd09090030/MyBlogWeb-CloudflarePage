import { listPublicGallery } from '~~/server/domain/gallery'

export default defineEventHandler(async (event) => await listPublicGallery(event))
