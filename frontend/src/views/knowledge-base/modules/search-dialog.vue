<script setup lang="ts">
import FilePreview from '@/components/custom/file-preview.vue';

defineOptions({ name: 'SearchDialog' });

const loading = ref(false);
const searched = ref(false);
const loadError = ref(false);
const visible = defineModel<boolean>('visible', { default: false });
const store = useAuthStore();
const model = ref<Api.KnowledgeBase.SearchParams>(createDefaultModel());
const list = ref<Api.KnowledgeBase.SearchResult[]>([]);
const searchedQuery = ref('');
const preview = ref<Api.KnowledgeBase.SearchResult | null>(null);
let requestId = 0;

function createDefaultModel(): Api.KnowledgeBase.SearchParams {
  return { userId: `${store.userInfo.id}`, query: '', topK: 10 };
}

async function search() {
  const query = model.value.query.trim();
  if (!query || loading.value) return;
  requestId += 1;
  const currentRequest = requestId;
  loading.value = true;
  loadError.value = false;
  searched.value = true;
  searchedQuery.value = query;
  list.value = [];
  try {
    const { error, data } = await request<Api.KnowledgeBase.SearchResult[]>({
      url: 'search/hybrid',
      params: { ...model.value, query }
    });
    if (currentRequest !== requestId) return;
    loadError.value = Boolean(error);
    list.value = error ? [] : data || [];
  } catch {
    if (currentRequest === requestId) loadError.value = true;
  } finally {
    if (currentRequest === requestId) loading.value = false;
  }
}

function reset() {
  requestId += 1;
  model.value = createDefaultModel();
  list.value = [];
  preview.value = null;
  loading.value = false;
  loadError.value = false;
  searched.value = false;
  searchedQuery.value = '';
}

watch(visible, reset);
</script>

<template>
  <NModal v-model:show="visible" preset="dialog" title="检索团队文档" :show-icon="false" class="document-search-modal">
    <p class="text-muted mb-5 mt-3 text-13px">输入问题、术语或关键词，在你有权访问的文档中查找相关内容。</p>
    <form class="document-search-form" @submit.prevent="search">
      <NInput
        v-model:value="model.query"
        aria-label="检索内容"
        placeholder="例如：上次项目交接记录了哪些待办事项？"
        :disabled="loading"
        clearable
        size="large"
      />
      <NInputNumber
        v-model:value="model.topK"
        aria-label="结果数量"
        :min="1"
        :max="50"
        :precision="0"
        :disabled="loading"
        class="search-count"
        title="最多返回的片段数量"
      />
      <NButton type="primary" attr-type="submit" size="large" :loading="loading" :disabled="!model.query.trim()">
        检索
      </NButton>
    </form>
    <div class="search-caption">
      <span>仅查找已处理完成、当前账号可见的内容</span>
      <NButton text :disabled="loading" @click="reset">清空条件</NButton>
    </div>
    <div v-if="loading" class="search-state" role="status">
      <NSpin size="medium" />
      <strong>正在查找相关内容</strong>
      <span>请稍候，文档较多时可能需要一些时间。</span>
    </div>
    <div v-else-if="loadError" class="search-state" role="alert">
      <icon-material-symbols:cloud-off-outline-rounded class="text-36px text-error" />
      <strong>暂时无法完成检索</strong>
      <span>请检查网络后重试，或联系管理员确认服务状态。</span>
      <NButton secondary type="primary" @click="search">重新检索</NButton>
    </div>
    <div v-else-if="!searched" class="search-state">
      <icon-material-symbols:manage-search-rounded class="text-44px text-primary" />
      <strong>从一个问题开始</strong>
      <span>找到相关片段，再打开原文核对完整上下文。</span>
    </div>
    <div v-else-if="!list.length" class="search-state">
      <icon-material-symbols:search-off-rounded class="text-muted text-40px" />
      <strong>没有找到相关片段</strong>
      <span>换用文档中的术语或减少限定，并确认资料已处理完成。</span>
    </div>
    <div v-else>
      <p class="text-muted mb-3 mt-5 text-12px" aria-live="polite">
        找到 {{ list.length }} 个相关片段 · {{ searchedQuery }}
      </p>
      <NScrollbar class="max-h-480px">
        <article v-for="(item, index) in list" :key="`${item.fileMd5}-${item.chunkId}-${index}`" class="search-result">
          <header>
            <span class="result-index">{{ index + 1 }}</span>
            <strong>{{ item.fileName || '未命名文档' }}</strong>
            <NButton size="small" text type="primary" :disabled="!item.fileMd5" @click="preview = item">
              查看原文
            </NButton>
          </header>
          <p><NHighlight :text="item.textContent" :patterns="[searchedQuery]" /></p>
        </article>
      </NScrollbar>
    </div>
  </NModal>
  <NModal
    :show="Boolean(preview)"
    :auto-focus="false"
    class="search-preview-modal"
    @update:show="
      show => {
        if (!show) preview = null;
      }
    "
  >
    <FilePreview
      v-if="preview"
      :file-name="preview.fileName"
      :file-md5="preview.fileMd5"
      :matched-chunk-text="preview.textContent"
      :retrieval-query="searchedQuery"
      :visible="Boolean(preview)"
      @close="preview = null"
    />
  </NModal>
</template>

<style scoped>
:global(.n-dialog.document-search-modal) {
  width: min(960px, calc(100vw - 32px));
}
:global(.search-preview-modal) {
  width: min(1320px, 96vw);
}
.document-search-form {
  display: flex;
  align-items: center;
  gap: 12px;
}
.document-search-form > .n-input {
  flex: 1;
}
.search-count {
  width: 100px;
  flex-shrink: 0;
}
.search-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  font-size: 11px;
  color: var(--app-muted);
}
.search-state {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
  padding: 32px 20px;
}
.search-state strong {
  font-size: 16px;
  color: var(--app-text);
  font-weight: 600;
}
.search-state > span {
  font-size: 13px;
  color: var(--app-muted);
  line-height: 1.8;
}
.search-result {
  padding: 20px;
  margin-bottom: 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
}
.search-result header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.search-result header strong {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 13px;
}
.result-index {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--primary-color) / 0.08);
  border-radius: 6px;
  color: rgb(var(--primary-color));
  font-size: 11px;
}
.search-result p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.9;
  font-size: 13px;
  color: var(--app-muted);
}
@media (max-width: 640px) {
  .document-search-form {
    flex-wrap: wrap;
  }
  .document-search-form > .n-input {
    flex-basis: 100%;
  }
  .search-count {
    flex: 1;
  }
}
</style>
