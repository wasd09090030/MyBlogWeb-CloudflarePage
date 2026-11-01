<script setup lang="ts">
const props = defineProps<{
  kind: 'empty' | 'privacy' | 'unconfigured' | 'error'
}>()

const emit = defineEmits<{ retry: [] }>()

const content = computed(() => {
  switch (props.kind) {
    case 'privacy':
      return {
        icon: 'mdi:lock-outline',
        title: '数据因隐私设置不可读',
        body: 'Steam「游戏详情」当前为私密状态，接口无法返回库信息。把隐私设置里的「游戏详情」改为公开后，下一轮同步会自动恢复。',
        link: 'https://steamcommunity.com/my/edit/settings',
        linkLabel: '打开 Steam 隐私设置'
      }
    case 'unconfigured':
      return {
        icon: 'mdi:link-variant-off',
        title: '还没有接入 Steam',
        body: '站长尚未配置 Steam 凭证，这里暂时没有数据。',
        link: '',
        linkLabel: ''
      }
    case 'error':
      return {
        icon: 'mdi:alert-circle-outline',
        title: '这次没取到最新快照',
        body: '接口暂时不可用，可以稍后重试。',
        link: '',
        linkLabel: ''
      }
    default:
      return {
        icon: 'mdi:database-off-outline',
        title: '还没有可展示的游戏数据',
        body: 'Steam 账号里暂时没有游玩记录，或资料尚未公开。等第一次同步完成后再回来看看。',
        link: '',
        linkLabel: ''
      }
  }
})
</script>

<template>
  <div class="sg-notice" :class="{ 'sg-notice--error': kind === 'error' }" role="status">
    <div class="sg-notice__icon"><Icon :name="content.icon" size="18" /></div>
    <div>
      <h3>{{ content.title }}</h3>
      <p>{{ content.body }}</p>
      <a v-if="content.link" :href="content.link" target="_blank" rel="noopener noreferrer">{{ content.linkLabel }}</a>
      <button v-if="kind === 'error'" type="button" class="sg-retry" @click="emit('retry')">重新加载</button>
    </div>
  </div>
</template>
