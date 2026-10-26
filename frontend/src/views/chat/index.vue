<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '@/store/modules/app';
import ChatList from './modules/chat-list.vue';
import InputBox from './modules/input-box.vue';
import ConversationSidebar from './modules/conversation-sidebar.vue';
import ReferencePreviewPage from './modules/reference-preview-page.vue';

const route = useRoute();
const showReferencePreview = computed(() => route.query.preview === 'reference');
const appStore = useAppStore();
const chatStore = useChatStore();
const sidebarCollapsed = ref(appStore.isMobile);
watch(
  () => appStore.isMobile,
  mobile => {
    if (mobile) sidebarCollapsed.value = true;
  }
);
</script>

<template>
  <div v-if="showReferencePreview" class="h-full">
    <ReferencePreviewPage />
  </div>
  <div v-else class="h-full bg-layout">
    <div class="chat-surface relative h-full flex overflow-hidden rounded-xl bg-container">
      <button
        v-if="appStore.isMobile && !sidebarCollapsed"
        class="sidebar-backdrop"
        aria-label="收起对话列表"
        @click="sidebarCollapsed = true"
      />
      <ConversationSidebar
        v-model:collapsed="sidebarCollapsed"
        :class="{ 'mobile-conversations': appStore.isMobile }"
      />
      <div class="relative min-w-0 flex flex-col flex-1">
        <button
          v-show="sidebarCollapsed"
          class="conversation-toggle absolute left-3 top-3 z-20 h-9 w-9 inline-flex items-center justify-center rounded-lg"
          aria-label="展开对话列表"
          @click="sidebarCollapsed = false"
        >
          <icon-material-symbols:left-panel-open-outline-rounded class="text-18px" />
        </button>
        <header class="chat-workspace-header" :class="{ 'chat-workspace-header--collapsed': sidebarCollapsed }">
          <div>
            <h2>知识问答</h2>
            <p>基于团队资料，查找有出处的答案</p>
          </div>
          <span class="chat-connection" :class="{ 'chat-connection--ready': chatStore.connectionStatus === 'OPEN' }">
            <i />
            {{
              chatStore.connectionStatus === 'OPEN'
                ? '服务已连接'
                : chatStore.connectionStatus === 'CLOSED'
                  ? '服务未连接'
                  : '正在连接服务'
            }}
          </span>
        </header>
        <ChatList />
        <InputBox />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-surface {
  border: 1px solid var(--app-border);
}
.chat-workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 24px;
  min-height: 76px;
  border-bottom: 1px solid var(--app-border);
  flex-shrink: 0;
}
.chat-workspace-header--collapsed {
  padding-left: 60px;
}
.chat-workspace-header h2 {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text);
}
.chat-workspace-header p {
  font-size: 11px;
  margin-top: 3px;
  color: var(--app-muted);
}
.chat-connection {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-size: 11px;
  color: var(--app-muted);
}
.chat-connection i {
  width: 6px;
  height: 6px;
  background: #d97706;
  border-radius: 50%;
}
.chat-connection--ready i {
  background: #139582;
}
@media (max-width: 640px) {
  .chat-workspace-header {
    padding-right: 16px;
  }
  .chat-workspace-header p {
    display: none;
  }
}

.conversation-toggle {
  background: var(--app-surface);
  color: var(--app-muted);
  border: 1px solid var(--app-border);
  cursor: pointer;
}
.conversation-toggle:hover {
  color: rgb(var(--primary-color));
}
.mobile-conversations {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 30;
  background: var(--app-surface);
}
.sidebar-backdrop {
  position: absolute;
  inset: 0;
  z-index: 25;
  background: rgba(0, 0, 0, 0.3);
  border: 0;
}
</style>
