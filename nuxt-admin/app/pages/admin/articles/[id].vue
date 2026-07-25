<script setup lang="ts">
import type { Article } from '~/types/admin'
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
const api = useAdminApi(); const route = useRoute()
const { data: article } = await useAsyncData(`admin-article-${route.params.id}`, () => api.get<Article>(`articles/${route.params.id}`))
</script><template><ArticleEditor v-if="article" :article="article" /></template>
