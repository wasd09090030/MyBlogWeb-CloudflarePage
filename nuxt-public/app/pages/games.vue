<script setup lang="ts">
import GamingPageContainer from '~/features/steam-gaming/containers/GamingPageContainer.vue'

useSeoMeta({
  title: '游戏档案',
  description: 'Steam 游玩记录：总时长、最近在玩、完美通关与最稀有成就。数据每小时自动同步。',
  ogTitle: '游戏档案 · WyrmKk',
  ogDescription: 'Steam 游玩记录：总时长、最近在玩、完美通关与最稀有成就。数据每小时自动同步。',
  ogType: 'website'
})
</script>

<template>
  <GamingPageContainer />
</template>
