export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage: 'Beatmap API has been retired',
    data: { code: 'BEATMAP_API_RETIRED' }
  })
})
