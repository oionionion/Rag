<script setup lang="ts">
import { NScrollbar } from 'naive-ui';
import { VueMarkdownItProvider } from '@/vendor/vue-markdown-shiki';
import ChatMessage from './chat-message.vue';

defineOptions({
  name: 'ChatList'
});

const chatStore = useChatStore();
const { list, sessionId, conversationId } = storeToRefs(chatStore);

const loading = ref(false);
const loadFailed = ref(false);
const scrollbarRef = ref<InstanceType<typeof NScrollbar>>();

watch(() => [...list.value], scrollToBottom);

function scrollToBottom() {
  setTimeout(() => {
    scrollbarRef.value?.scrollBy({
      top: 999999999999999,
      behavior: 'auto'
    });
  }, 100);
}

const range = ref<[number, number] | null>(null);

function getRetrievalQueryFallback(index: number) {
  for (let i = index - 1; i >= 0; i -= 1) {
    const candidate = list.value[i];
    if (candidate?.role === 'user') {
      return candidate.content || '';
    }
  }
  return '';
}

const params = computed(() => {
  const p: Record<string, string> = {};
  if (range.value) {
    p.start_date = dayjs(range.value[0]).format('YYYY-MM-DD');
    p.end_date = dayjs(range.value[1]).format('YYYY-MM-DD');
  }
  if (conversationId.value) {
    p.conversationId = conversationId.value;
  }
  return p;
});

let historyRequestId = 0;
watch(params, getList, { immediate: true });

async function getList() {
  historyRequestId += 1;
  const requestId = historyRequestId;
  const messagesBeforeRequest = [...list.value];
  loading.value = true;
  const { error, data } = await request<Api.Chat.Message[]>({
    url: 'users/conversation',
    params: params.value
  });
  if (requestId !== historyRequestId) return;
  loadFailed.value = Boolean(error);
  const messagesUnchanged =
    list.value.length === messagesBeforeRequest.length &&
    list.value.every((message, index) => message === messagesBeforeRequest[index]);
  const hasPending = list.value.some(message => ['pending', 'loading'].includes(message.status || ''));
  if (!error && messagesUnchanged && !hasPending) {
    list.value = data;
  }
  loading.value = false;
}

onMounted(() => {
  chatStore.scrollToBottom = scrollToBottom;
});

const showEmpty = computed(() => !loading.value && !loadFailed.value && list.value.length === 0);
const prompts = [
  { title: '查找项目方案', question: '资料中记录了哪些技术方案？请列出出处。', icon: '方案' },
  { title: '梳理交接事项', question: '请根据交接文档，整理已完成事项和待办问题。', icon: '交接' },
  { title: '定位操作说明', question: '请查找操作手册中的相关步骤，并标注原文位置。', icon: '手册' }
];
function usePrompt(question: string) {
  chatStore.input.message = question;
  document.querySelector<HTMLTextAreaElement>('textarea')?.focus();
}
</script>

<template>
  <Suspense>
    <div class="h-0 flex flex-col flex-1">
      <!-- Date filter in header -->

      <div v-if="!showEmpty" class="chat-date-filter flex justify-end px-4 py-3">
        <NForm :model="params" label-placement="left" :show-feedback="false" inline>
          <NFormItem label="时间" size="small">
            <NDatePicker v-model:value="range" type="daterange" clearable size="small" />
          </NFormItem>
        </NForm>
      </div>

      <div v-if="loadFailed" class="mx-5 mt-4">
        <NAlert type="error" title="对话记录未能加载">
          请检查网络后重试。
          <div class="mt-3"><NButton size="small" :loading="loading" @click="getList">重新加载</NButton></div>
        </NAlert>
      </div>
      <div v-if="showEmpty" class="chat-welcome">
        <div class="welcome-logo"><SystemLogo /></div>
        <p class="welcome-kicker">DocPilot · 团队知识库助手</p>
        <h1>让团队文档，回答你的问题。</h1>
        <p class="welcome-description">
          从历史方案到操作手册，在可见资料中查找线索。
          <br class="welcome-break" />
          每一次回答，都可以带着出处继续核对。
        </p>
        <div class="prompt-grid">
          <button v-for="prompt in prompts" :key="prompt.title" class="prompt-card" @click="usePrompt(prompt.question)">
            <span class="prompt-category">{{ prompt.icon }}</span>
            <strong>{{ prompt.title }}</strong>
            <span>{{ prompt.question }}</span>
            <icon-material-symbols:arrow-outward-rounded class="prompt-arrow" />
          </button>
        </div>
        <RouterLink to="/knowledge-base" class="welcome-document-link">
          <icon-material-symbols:folder-open-outline-rounded />
          管理团队文档
          <icon-material-symbols:arrow-forward-rounded />
        </RouterLink>
      </div>
      <div v-else-if="loading && !list.length" class="history-loading" role="status">
        <NSpin size="medium" />
        <span>正在加载对话记录…</span>
      </div>

      <!-- Message list -->
      <NScrollbar v-else-if="list.length" ref="scrollbarRef" class="flex-1">
        <NSpin :show="loading">
          <div class="mx-auto max-w-[960px] w-full px-4">
            <VueMarkdownItProvider>
              <ChatMessage
                v-for="(item, index) in list"
                :key="index"
                :msg="item"
                :session-id="sessionId"
                :retrieval-query-fallback="getRetrievalQueryFallback(index)"
              />
            </VueMarkdownItProvider>
          </div>
        </NSpin>
      </NScrollbar>
    </div>
  </Suspense>
</template>

<style scoped lang="scss">
.chat-welcome {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 36px 28px;
  overflow-y: auto;
  text-align: center;
}
.welcome-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border: 1px solid rgb(var(--primary-color) / 0.1);
  border-radius: 20px;
  background: rgb(var(--primary-color) / 0.06);
  color: rgb(var(--primary-color));
}
.welcome-logo :deep(svg) {
  width: 36px;
  height: 36px;
}
.welcome-kicker {
  margin-top: 22px;
  font-size: 11px;
  color: rgb(var(--primary-color));
  letter-spacing: 1.5px;
}
.chat-welcome h1 {
  margin-top: 14px;
  color: var(--app-text);
  font-size: clamp(23px, 2.1vw, 32px);
  line-height: 1.5;
  font-weight: 650;
  letter-spacing: -0.8px;
}
.welcome-description {
  margin-top: 14px;
  font-size: 13px;
  color: var(--app-muted);
  line-height: 1.9;
}
.prompt-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  max-width: 740px;
  width: 100%;
  margin-top: 36px;
}
.prompt-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
  padding: 20px;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s,
    transform 0.2s,
    box-shadow 0.2s;
}
.prompt-card:hover {
  border-color: rgb(var(--primary-color) / 0.45);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgb(var(--primary-color) / 0.05);
}
.prompt-category {
  font-size: 10px;
  color: rgb(var(--primary-color));
  background: rgb(var(--primary-color) / 0.06);
  padding: 3px 7px;
  border-radius: 5px;
}
.prompt-card strong {
  color: var(--app-text);
  font-size: 13px;
  font-weight: 600;
}
.prompt-card > span:not(.prompt-category) {
  color: var(--app-muted);
  font-size: 11px;
  line-height: 1.8;
}
.prompt-arrow {
  position: absolute;
  right: 15px;
  top: 22px;
  color: var(--app-muted);
  font-size: 14px;
}
.welcome-document-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 25px;
  color: var(--app-muted);
  font-size: 12px;
}
.welcome-document-link:hover {
  color: rgb(var(--primary-color));
}
.history-loading {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--app-muted);
  font-size: 13px;
}
@media (max-width: 1050px) {
  .prompt-grid {
    grid-template-columns: 1fr;
    max-width: 400px;
    gap: 8px;
    margin-top: 24px;
  }
  .prompt-card {
    padding: 12px 16px;
    gap: 5px;
  }
  .prompt-category {
    display: none;
  }
  .prompt-arrow {
    top: 15px;
  }
}
@media (max-width: 640px) {
  .chat-welcome {
    justify-content: flex-start;
    padding: 30px 18px 16px;
  }
  .welcome-logo {
    width: 48px;
    height: 48px;
    border-radius: 14px;
  }
  .welcome-logo :deep(svg) {
    width: 28px;
    height: 28px;
  }
  .welcome-kicker {
    margin-top: 16px;
  }
  .welcome-description {
    font-size: 12px;
  }
  .welcome-break {
    display: none;
  }
  .welcome-document-link {
    margin-top: 18px;
  }
}

@media (max-width: 640px) {
  .chat-date-filter {
    padding-left: 56px;
  }
  .chat-date-filter :deep(.n-form-item-label) {
    display: none;
  }
  .chat-date-filter :deep(.n-form-item) {
    margin-right: 0;
    min-width: 0;
  }
  .chat-date-filter :deep(.n-date-picker) {
    min-width: 0;
    width: 100%;
  }
}
</style>
