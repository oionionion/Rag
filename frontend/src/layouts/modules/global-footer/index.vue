<script setup lang="ts">
defineOptions({ name: 'GlobalFooter' });
const licenseUrl = `${import.meta.env.BASE_URL}LICENSE`;
</script>

<template>
  <DarkModeContainer class="text-muted h-full flex-center gap-3 text-11px">
    <span>DocPilot · 团队知识库助手</span>
    <span aria-hidden="true">·</span>
    <a :href="licenseUrl" target="_blank" rel="noopener noreferrer">来源与许可</a>
  </DarkModeContainer>
</template>
