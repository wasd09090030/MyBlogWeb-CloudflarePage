<script setup lang="ts">
import RatingsDetailContainer from '~/features/steam-gaming/containers/RatingsDetailContainer.vue'

useSeoMeta({
  title: '我的评分 · 游戏档案',
  description: '完整评分列表：分数分布、最高分，以及每一款游戏的一句短评。',
  ogTitle: '我的评分 · WyrmKk',
  ogDescription: '完整评分列表：分数分布、最高分，以及每一款游戏的一句短评。',
  ogType: 'website'
})
</script>

<template>
  <RatingsDetailContainer />
</template>
