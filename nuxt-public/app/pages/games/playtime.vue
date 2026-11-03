<script setup lang="ts">
import PlaytimeDetailContainer from '~/features/steam-gaming/containers/PlaytimeDetailContainer.vue'

useSeoMeta({
  title: '游玩时长 · 游戏档案',
  description: '完整游玩时长榜单：库内每一款有记录的游戏，按时长排序。',
  ogTitle: '游玩时长 · WyrmKk',
  ogDescription: '完整游玩时长榜单：库内每一款有记录的游戏，按时长排序。',
  ogType: 'website'
})
</script>

<template>
  <PlaytimeDetailContainer />
</template>
