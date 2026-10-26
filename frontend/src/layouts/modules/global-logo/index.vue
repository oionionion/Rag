<script setup lang="ts">
import { $t } from '@/locales';

defineOptions({
  name: 'GlobalLogo'
});

interface Props {
  /** Whether to show the title */
  showTitle?: boolean;
}

withDefaults(defineProps<Props>(), {
  showTitle: true
});
</script>

<template>
  <RouterLink to="/" class="brand-lockup" aria-label="DocPilot 首页">
    <SystemLogo class="brand-icon" />
    <div v-show="showTitle" class="brand-copy">
      <h2>{{ $t('system.title') }}</h2>
      <span>团队知识库助手</span>
    </div>
  </RouterLink>
</template>

<style scoped>
.brand-lockup {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  overflow: hidden;
  white-space: nowrap;
  color: rgb(var(--primary-color));
}
.brand-icon {
  width: 31px;
  height: 31px;
  flex-shrink: 0;
}
.brand-copy h2 {
  font-size: 20px;
  line-height: 1.25;
  font-weight: 750;
  letter-spacing: -0.6px;
}
.brand-copy span {
  display: block;
  margin-top: 3px;
  font-size: 10px;
  letter-spacing: 1.1px;
  color: var(--app-muted);
}
</style>
