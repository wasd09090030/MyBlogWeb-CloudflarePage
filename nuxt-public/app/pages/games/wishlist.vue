<script setup lang="ts">
import WishlistDetailContainer from '~/features/steam-gaming/containers/WishlistDetailContainer.vue'

useSeoMeta({
  title: '愿望单 · 游戏档案',
  description: '完整愿望单：按加入时间排序，附等待天数。',
  ogTitle: '愿望单 · WyrmKk',
  ogDescription: '完整愿望单：按加入时间排序，附等待天数。',
  ogType: 'website'
})
</script>

<template>
  <WishlistDetailContainer />
</template>
