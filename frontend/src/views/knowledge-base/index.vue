<script setup lang="tsx">
import type { UploadFileInfo } from 'naive-ui';
import { NButton, NEllipsis, NModal, NPopconfirm, NProgress, NTag, NUpload } from 'naive-ui';
import type { FlatResponseData } from '@sa/axios';
import { uploadAccept } from '@/constants/common';
import { UploadStatus } from '@/enum';
import SvgIcon from '@/components/custom/svg-icon.vue';
import FilePreview from '@/components/custom/file-preview.vue';
import UploadDialog from './modules/upload-dialog.vue';
import SearchDialog from './modules/search-dialog.vue';

const appStore = useAppStore();
const authStore = useAuthStore();
const documentLoadFailed = ref(false);
const retryingFiles = ref<Set<string>>(new Set());

// 文件预览相关状态
const previewVisible = ref(false);
const previewFileName = ref('');
const previewFileMd5 = ref('');

async function apiFn(params: Api.Common.CommonSearchParams = {}): Promise<FlatResponseData<Api.KnowledgeBase.List>> {
  const response = await request<Api.KnowledgeBase.UploadTask[] | Api.KnowledgeBase.List>({
    url: '/documents/accessible',
    params
  });
  documentLoadFailed.value = Boolean(response.error);
  if (response.error) return response as FlatResponseData<Api.KnowledgeBase.List>;

  const payload = response.data;
  if (!Array.isArray(payload)) return response as FlatResponseData<Api.KnowledgeBase.List>;

  const page = params.page && params.page > 0 ? params.page : 1;
  const size = params.size && params.size > 0 ? params.size : 10;
  const start = (page - 1) * size;
  const pageData = payload.slice(start, start + size);

  return {
    ...response,
    data: {
      data: pageData,
      content: pageData,
      number: page,
      size,
      totalElements: payload.length
    }
  };
}

function canManageFile(row: Api.KnowledgeBase.UploadTask) {
  return authStore.isAdmin || String(row.userId) === String(authStore.userInfo.id);
}

function renderIcon(fileName: string) {
  const ext = getFileExt(fileName);
  if (ext) {
    if (uploadAccept.split(',').includes(`.${ext}`)) return <SvgIcon localIcon={ext} class="mx-4 text-12" />;
    return <SvgIcon localIcon="dflt" class="mx-4 text-12" />;
  }
  return null;
}

// 处理文件预览
function handleFilePreview(fileName: string, fileMd5: string) {
  previewFileName.value = fileName;
  previewFileMd5.value = fileMd5;
  previewVisible.value = true;
}

// 关闭文件预览
function closeFilePreview() {
  previewVisible.value = false;
  previewFileName.value = '';
  previewFileMd5.value = '';
}

const { columns, columnChecks, data, getData, loading, mobilePagination } = useTable({
  apiFn,
  showTotal: true,
  immediate: false,
  columns: () => [
    {
      key: 'fileName',
      title: '文档名称',
      minWidth: 300,
      render: row => (
        <div class="flex items-center">
          {renderIcon(row.fileName)}
          <NEllipsis lineClamp={2} tooltip>
            <span
              class="cursor-pointer transition-colors hover:text-primary"
              onClick={() => handleFilePreview(row.fileName, row.fileMd5)}
            >
              {row.fileName}
            </span>
          </NEllipsis>
        </div>
      )
    },
    {
      key: 'fileMd5',
      title: '文档标识',
      width: 120,
      render: row => (
        <NEllipsis tooltip>
          <span
            class="cursor-pointer text-3 font-mono transition-colors hover:text-primary"
            onClick={() => {
              navigator.clipboard.writeText(row.fileMd5);
              window.$message?.success('文档标识已复制');
            }}
            title="点击复制文档标识"
          >
            {row.fileMd5.substring(0, 8)}...
          </span>
        </NEllipsis>
      )
    },
    {
      key: 'totalSize',
      title: '文件大小',
      width: 100,
      render: row => fileSize(row.totalSize)
    },
    {
      key: 'estimatedEmbeddingTokens',
      title: '预计内容量',
      width: 160,
      render: row => renderEstimatedEmbeddingUsage(row)
    },
    {
      key: 'actualEmbeddingTokens',
      title: '内容处理',
      width: 160,
      render: row => renderActualEmbeddingUsage(row)
    },
    {
      key: 'status',
      title: '上传进度',
      width: 100,
      render: row => renderStatus(row.status, row.progress)
    },
    {
      key: 'orgTagName',
      title: '所属空间',
      width: 150,
      ellipsis: { tooltip: true, lineClamp: 2 }
    },
    {
      key: 'isPublic',
      title: '共享范围',
      width: 100,
      render: row =>
        row.public || row.isPublic ? (
          <NTag bordered={false} type="success">
            所有用户
          </NTag>
        ) : (
          <NTag bordered={false} type="warning">
            组织内
          </NTag>
        )
    },
    {
      key: 'createdAt',
      title: '上传时间',
      width: 100,
      render: row => dayjs(row.createdAt).format('YYYY-MM-DD')
    },
    {
      key: 'operate',
      title: '操作',
      width: 180,
      render: row => (
        <div class="flex gap-4">
          {canManageFile(row) ? renderResumeUploadButton(row) : null}
          <NButton type="primary" quaternary size="small" onClick={() => handleFilePreview(row.fileName, row.fileMd5)}>
            预览
          </NButton>
          {canManageFile(row) ? (
            <NPopconfirm onPositiveClick={() => handleDelete(row.fileMd5)}>
              {{
                default: () => '删除后将无法继续检索该文档，相关引用也可能失效。确认删除？',
                trigger: () => (
                  <NButton type="error" quaternary size="small">
                    删除
                  </NButton>
                )
              }}
            </NPopconfirm>
          ) : null}
        </div>
      )
    }
  ]
});

// Keep technical identifiers available in column settings without crowding the document list.
columnChecks.value.forEach(column => {
  if (column.key === 'fileMd5' || column.key === 'estimatedEmbeddingTokens') column.checked = false;
});

const store = useKnowledgeBaseStore();
const { tasks } = storeToRefs(store);
const tableTasks = computed(() => {
  const remoteRows = data.value.map(item => tasks.value.find(task => task.fileMd5 === item.fileMd5) || item);
  const localRows = tasks.value.filter(
    task =>
      task.file && task.status !== UploadStatus.Completed && !remoteRows.some(item => item.fileMd5 === task.fileMd5)
  );

  return [...localRows, ...remoteRows];
});

onMounted(async () => {
  await getList();
});

function syncTaskFromServer(target: Api.KnowledgeBase.UploadTask, source: Api.KnowledgeBase.UploadTask) {
  const isLocalUploading =
    target.file && (target.status === UploadStatus.Pending || target.status === UploadStatus.Uploading);
  const status = source.status === UploadStatus.Uploading && !isLocalUploading ? UploadStatus.Break : source.status;

  Object.assign(target, {
    fileName: source.fileName,
    totalSize: source.totalSize,
    status,
    userId: source.userId,
    orgTag: source.orgTag,
    orgTagName: source.orgTagName,
    public: source.public,
    isPublic: source.isPublic,
    createdAt: source.createdAt,
    mergedAt: source.mergedAt,
    estimatedEmbeddingTokens: source.estimatedEmbeddingTokens,
    estimatedChunkCount: source.estimatedChunkCount,
    actualEmbeddingTokens: source.actualEmbeddingTokens,
    actualChunkCount: source.actualChunkCount,
    vectorizationStatus: source.vectorizationStatus,
    vectorizationErrorMessage: source.vectorizationErrorMessage
  });
}

/** 异步获取列表函数 该函数主要用于更新或初始化上传任务列表 它首先调用getData函数获取数据，然后根据获取到的数据状态更新任务列表 */
async function getList() {
  await getData();

  data.value.forEach(item => {
    const index = tasks.value.findIndex(task => task.fileMd5 === item.fileMd5);
    if (index !== -1) {
      syncTaskFromServer(tasks.value[index], item);
    } else if (item.status === UploadStatus.Completed) {
      tasks.value.push(item);
    } else if (!tasks.value.some(task => task.fileMd5 === item.fileMd5)) {
      item.status = UploadStatus.Break;
      tasks.value.push(item);
    }
  });
}

async function handleDelete(fileMd5: string) {
  const index = tasks.value.findIndex(task => task.fileMd5 === fileMd5);

  if (index !== -1) {
    tasks.value[index].requestIds?.forEach(requestId => {
      request.cancelRequest(requestId);
    });
  }

  // 如果文件一个分片也没有上传完成，则直接删除
  if (tasks.value[index].uploadedChunks && tasks.value[index].uploadedChunks.length === 0) {
    tasks.value.splice(index, 1);
    return;
  }

  const { error } = await request({ url: `/documents/${fileMd5}`, method: 'DELETE' });
  if (!error) {
    tasks.value.splice(index, 1);
    window.$message?.success('删除成功');
    await getData();
  }
}

// #region 文件上传
const uploadVisible = ref(false);
function handleUpload() {
  uploadVisible.value = true;
}
// #endregion

// #region 检索知识库
const searchVisible = ref(false);
function handleSearch() {
  searchVisible.value = true;
}
// #endregion

// 渲染上传状态
function renderStatus(status: UploadStatus, percentage: number) {
  if (status === UploadStatus.Completed)
    return (
      <NTag bordered={false} type="success">
        已上传
      </NTag>
    );
  if (status === UploadStatus.Break)
    return (
      <NTag bordered={false} type="warning">
        上传中断
      </NTag>
    );
  if (status === UploadStatus.Pending) return <NTag bordered={false}>等待上传</NTag>;
  if (status === UploadStatus.Paused)
    return (
      <NTag bordered={false} type="warning">
        已暂停
      </NTag>
    );
  return <NProgress percentage={Math.min(100, Math.max(0, percentage || 0))} processing />;
}

function renderEstimatedEmbeddingUsage(row: Api.KnowledgeBase.UploadTask) {
  return (
    <span class="text-muted text-xs">
      {row.estimatedChunkCount ? `${row.estimatedChunkCount} 个内容片段` : '待处理后确认'}
    </span>
  );
}

function isVectorizationProcessing(row: Api.KnowledgeBase.UploadTask) {
  return (
    row.status === UploadStatus.Completed &&
    (row.vectorizationStatus === 'PENDING' || row.vectorizationStatus === 'PROCESSING')
  );
}

function hasActualVectorizationUsage(row: Api.KnowledgeBase.UploadTask) {
  return row.actualEmbeddingTokens !== null && row.actualEmbeddingTokens !== undefined;
}

function canRetryVectorization(row: Api.KnowledgeBase.UploadTask) {
  if (!canManageFile(row)) return false;
  if (row.vectorizationStatus === 'FAILED') return true;
  if (row.vectorizationStatus === 'COMPLETED' && !hasActualVectorizationUsage(row)) return true;
  if (!hasActualVectorizationUsage(row) && row.estimatedEmbeddingTokens) return true;
  return false;
}

async function handleRetryVectorization(row: Api.KnowledgeBase.UploadTask) {
  if (retryingFiles.value.has(row.fileMd5)) return;
  retryingFiles.value.add(row.fileMd5);
  try {
    const { error } = await request({
      url: `/documents/${row.fileMd5}/vectorization/retry`,
      method: 'POST'
    });
    if (error) return;
    row.vectorizationStatus = 'PROCESSING';
    row.vectorizationErrorMessage = null;
    row.actualEmbeddingTokens = undefined;
    row.actualChunkCount = undefined;
    window.$message?.success('已提交处理任务，完成后即可检索');
    await getList();
  } finally {
    retryingFiles.value.delete(row.fileMd5);
  }
}

function renderActualEmbeddingUsage(row: Api.KnowledgeBase.UploadTask) {
  if (row.status !== UploadStatus.Completed) return <span class="text-muted text-xs">等待上传完成</span>;
  if (isVectorizationProcessing(row)) {
    return (
      <div class="flex flex-col gap-6px text-xs">
        <NTag bordered={false} type="info">
          {row.vectorizationStatus === 'PENDING' ? '等待处理' : '处理中'}
        </NTag>
        <span class="text-muted">完成后可用于检索与问答</span>
      </div>
    );
  }
  if (row.vectorizationStatus === 'COMPLETED') {
    return (
      <div class="flex flex-col gap-6px text-xs">
        <NTag bordered={false} type="success">
          可检索
        </NTag>
        <span class="text-muted">{row.actualChunkCount ? `${row.actualChunkCount} 个内容片段` : '内容处理完成'}</span>
      </div>
    );
  }
  return (
    <div class="flex flex-col gap-6px text-xs leading-5">
      <NTag bordered={false} type={row.vectorizationStatus === 'FAILED' ? 'error' : 'warning'}>
        {row.vectorizationStatus === 'FAILED' ? '处理失败' : '状态待更新'}
      </NTag>
      <NEllipsis tooltip lineClamp={2} class="text-muted">
        {row.vectorizationErrorMessage || '请刷新状态；如持续未完成，可联系管理员检查后重试。'}
      </NEllipsis>
      {canRetryVectorization(row) ? (
        <NButton
          size="tiny"
          type="primary"
          quaternary
          loading={retryingFiles.value.has(row.fileMd5)}
          onClick={() => handleRetryVectorization(row)}
        >
          重试处理
        </NButton>
      ) : null}
    </div>
  );
}

// 向量化状态由后端通过聊天 WebSocket 推送（document_status 事件），这里复用同一条连接
const chatStore = useChatStore();
const { wsData, connectionStatus } = storeToRefs(chatStore);

interface DocumentStatusEvent {
  type: 'document_status';
  fileMd5: string;
  status: UploadStatus;
  vectorizationStatus: Api.KnowledgeBase.UploadTask['vectorizationStatus'];
  vectorizationErrorMessage: string | null;
  actualEmbeddingTokens: number | null;
  actualChunkCount: number | null;
}

function applyDocumentStatus(event: DocumentStatusEvent) {
  const rows = [...tasks.value, ...data.value].filter(item => item.fileMd5 === event.fileMd5);
  if (rows.length === 0) {
    // 其他页面上传的新文件，列表里还没有，整体刷新一次
    getList();
    return;
  }
  rows.forEach(row => {
    Object.assign(row, {
      vectorizationStatus: event.vectorizationStatus,
      vectorizationErrorMessage: event.vectorizationErrorMessage,
      actualEmbeddingTokens: event.actualEmbeddingTokens ?? undefined,
      actualChunkCount: event.actualChunkCount ?? undefined
    });
  });
}

watch(wsData, val => {
  if (!val) return;
  try {
    const payload = JSON.parse(val);
    if (payload?.type === 'document_status' && payload.fileMd5) {
      applyDocumentStatus(payload as DocumentStatusEvent);
    }
  } catch {
    // 非 JSON 消息（心跳等）忽略
  }
});

// 断线期间的推送会丢失，重连后整体刷新一次
watch(connectionStatus, (status, previous) => {
  if (status === 'OPEN' && previous && previous !== 'OPEN') {
    getList();
  }
});

// 兜底查询：推送正常时 30 秒一次，WebSocket 没连上时退回 5 秒
const FALLBACK_POLL_INTERVAL_MS = 30_000;
const DISCONNECTED_POLL_INTERVAL_MS = 5_000;
let vectorizationPollingTimer: number | null = null;

function clearVectorizationPolling() {
  if (vectorizationPollingTimer) {
    window.clearTimeout(vectorizationPollingTimer);
    vectorizationPollingTimer = null;
  }
}

function scheduleVectorizationPolling() {
  clearVectorizationPolling();

  if (!tasks.value.some(item => isVectorizationProcessing(item))) {
    return;
  }

  const interval = connectionStatus.value === 'OPEN' ? FALLBACK_POLL_INTERVAL_MS : DISCONNECTED_POLL_INTERVAL_MS;
  vectorizationPollingTimer = window.setTimeout(async () => {
    await getList();
    scheduleVectorizationPolling();
  }, interval);
}

watch(
  () =>
    tasks.value
      .map(item => `${item.fileMd5}:${item.vectorizationStatus || ''}:${item.actualEmbeddingTokens ?? ''}`)
      .join('|'),
  () => {
    scheduleVectorizationPolling();
  },
  { immediate: true }
);

onUnmounted(() => {
  clearVectorizationPolling();
});

// #region 文件续传
function renderResumeUploadButton(row: Api.KnowledgeBase.UploadTask) {
  if (row.status === UploadStatus.Break) {
    if (row.file)
      return (
        <NButton type="primary" size="small" quaternary onClick={() => resumeUpload(row)}>
          续传
        </NButton>
      );
    return (
      <NUpload
        show-file-list={false}
        default-upload={false}
        accept={uploadAccept}
        onBeforeUpload={options => onBeforeUpload(options, row)}
        class="w-fit"
      >
        <NButton type="primary" size="small" quaternary>
          续传
        </NButton>
      </NUpload>
    );
  }
  return null;
}

// 任务列表存在文件，直接续传
function resumeUpload(row: Api.KnowledgeBase.UploadTask) {
  row.status = UploadStatus.Pending;
  store.startUpload();
}

async function onBeforeUpload(
  options: { file: UploadFileInfo; fileList: UploadFileInfo[] },
  row: Api.KnowledgeBase.UploadTask
) {
  const md5 = await calculateMD5(options.file.file!);
  if (md5 !== row.fileMd5) {
    window.$message?.error('两次上传的文件不一致');
    return false;
  }
  loading.value = true;
  const { error, data: progress } = await request<Api.KnowledgeBase.Progress>({
    url: '/upload/status',
    params: { file_md5: row.fileMd5 }
  });
  if (!error) {
    row.file = options.file.file!;
    row.status = UploadStatus.Pending;
    row.progress = progress.progress;
    row.uploadedChunks = progress.uploaded;
    store.startUpload();
    loading.value = false;
    return true;
  }
  loading.value = false;
  return false;
}
</script>

<template>
  <div class="workspace-page min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <header class="workspace-heading">
      <div>
        <p class="workspace-kicker">团队知识空间</p>
        <h1>文档库</h1>
        <p class="workspace-description">让资料集中保存，让历史方案与交接记录随时可查。</p>
      </div>
      <span class="workspace-scope">
        <icon-material-symbols:shield-outline-rounded />
        仅展示你有权访问的文档
      </span>
    </header>
    <NCard title="团队文档" :bordered="false" size="small" class="page-section sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation v-model:columns="columnChecks" :loading="loading" @add="handleUpload" @refresh="getList">
          <template #prefix>
            <NButton size="small" ghost type="primary" @click="handleSearch">
              <template #icon>
                <icon-ic-round-search class="text-icon" />
              </template>
              检索文档
            </NButton>
          </template>
          <NButton size="small" type="primary" @click="handleUpload">
            <template #icon><icon-ic-round-plus /></template>
            上传文档
          </NButton>
        </TableHeaderOperation>
      </template>
      <NAlert v-if="documentLoadFailed" type="error" :show-icon="true" class="mb-4" title="文档列表未能加载">
        请检查网络后重试。若列表中仍有内容，显示的是上次加载的资料。
        <div class="mt-3"><NButton size="small" :loading="loading" @click="getList">重新加载</NButton></div>
      </NAlert>
      <NDataTable
        :bordered="false"
        :columns="columns"
        :data="tableTasks"
        size="small"
        :flex-height="!appStore.isMobile"
        :scroll-x="1180"
        :loading="loading"
        remote
        :row-key="row => row.fileMd5"
        :pagination="mobilePagination"
        class="sm:h-full"
      >
        <template #empty>
          <div class="document-empty" aria-live="polite">
            <icon-material-symbols:folder-open-outline-rounded class="text-40px text-primary" />
            <h3>{{ documentLoadFailed ? '暂时无法获取文档' : '从第一份团队文档开始' }}</h3>
            <p>
              {{
                documentLoadFailed
                  ? '重新加载列表，或稍后再试。'
                  : '上传方案、手册或阶段记录，内容处理完成后即可查找和提问。'
              }}
            </p>
            <NButton v-if="!documentLoadFailed" type="primary" secondary @click="handleUpload">上传文档</NButton>
          </div>
        </template>
      </NDataTable>
    </NCard>
    <UploadDialog v-model:visible="uploadVisible" />
    <SearchDialog v-model:visible="searchVisible" />

    <!-- 文件预览弹窗 -->
    <NModal v-model:show="previewVisible" class="document-preview-modal" :auto-focus="false">
      <div class="document-preview-modal-shell">
        <FilePreview
          :file-name="previewFileName"
          :file-md5="previewFileMd5"
          :visible="previewVisible"
          @close="closeFilePreview"
        />
      </div>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.document-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 64px 20px;
  text-align: center;
}
.document-empty h3 {
  color: var(--app-text);
  font-size: 17px;
  font-weight: 600;
}
.document-empty p {
  max-width: 400px;
  margin-bottom: 8px;
  color: var(--app-muted);
  line-height: 1.8;
}
.file-list-container {
  transition: width 0.3s ease;
}

:deep() {
  .n-progress-icon.n-progress-icon--as-text {
    white-space: nowrap;
  }
}

:deep(.document-preview-modal) {
  width: min(96vw, 1320px);
}

.document-preview-modal-shell {
  overflow: hidden;
  border-radius: 32px;
  box-shadow: 0 36px 120px rgba(15, 23, 42, 0.28);
}
</style>
