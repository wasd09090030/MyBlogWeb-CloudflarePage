<template>
  <div>
    <n-message-provider>
      <slot />
    </n-message-provider>
  </div>
</template>

<script setup>
import { NMessageProvider } from 'naive-ui'
</script>
