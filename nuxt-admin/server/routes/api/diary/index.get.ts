import { listPublicDiaryEntries } from '~~/server/domain/diary'

export default defineEventHandler(async (event) => await listPublicDiaryEntries(event, getQuery(event)))
