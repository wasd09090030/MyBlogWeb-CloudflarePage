import { getPublicGalleryDimensions } from '~~/server/domain/gallery'

export default defineEventHandler(async (event) => await getPublicGalleryDimensions(event, getRouterParam(event, 'id')))
