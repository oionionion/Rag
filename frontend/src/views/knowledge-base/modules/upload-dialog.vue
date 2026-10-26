<script setup lang="ts">
import { uploadAccept } from '@/constants/common';

defineOptions({
  name: 'UploadDialog'
});

const loading = ref(false);
const visible = defineModel<boolean>('visible', { default: false });
const orgOptions = ref<Api.OrgTag.Details[]>([]);
const orgLoading = ref(false);
const orgLoadFailed = ref(false);
let orgRequestId = 0;

const authStore = useAuthStore();

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const model = ref<Api.KnowledgeBase.Form>(createDefaultModel());

function createDefaultModel(): Api.KnowledgeBase.Form {
  return {
    orgTag: null,
    orgTagName: '',
    uploadMaxSizeBytes: null,
    uploadMaxSizeMb: null,
    isPublic: false,
    fileList: []
  };
}

const rules = ref<FormRules>({
  orgTag: defaultRequiredRule,
  isPublic: defaultRequiredRule,
  fileList: defaultRequiredRule
});

const fileSizeLimitError = computed(() => {
  if (authStore.isAdmin) return '';
  const file = model.value.fileList?.[0]?.file;
  if (!file || !model.value.uploadMaxSizeBytes) return '';
  if (file.size <= model.value.uploadMaxSizeBytes) return '';

  return `当前组织限制非管理员上传文件不超过 ${model.value.uploadMaxSizeMb} MB，当前文件大小为 ${(file.size / 1024 / 1024).toFixed(2)} MB`;
});

const submitDisabled = computed(
  () =>
    loading.value ||
    orgLoading.value ||
    orgLoadFailed.value ||
    !model.value.orgTag ||
    !model.value.fileList.length ||
    Boolean(fileSizeLimitError.value)
);

function close() {
  visible.value = false;
}

const store = useKnowledgeBaseStore();
async function handleSubmit() {
  await validate();
  if (fileSizeLimitError.value) return;

  loading.value = true;
  try {
    await store.enqueueUpload(model.value);
    close();
  } catch {
    window.$message?.error('未能开始上传，请重新选择文件后重试。');
  } finally {
    loading.value = false;
  }
}

async function loadUploadOrganizations() {
  orgRequestId += 1;
  const requestId = orgRequestId;
  orgOptions.value = [];
  orgLoading.value = true;
  orgLoadFailed.value = false;
  const { error, data } = await request<Api.OrgTag.Mine>({ url: '/users/org-tags' });
  if (requestId !== orgRequestId || !visible.value) return;

  orgLoading.value = false;
  orgLoadFailed.value = Boolean(error);
  if (error || !data) return;

  orgOptions.value = data.orgTagDetails || [];
  const preferredOrg = orgOptions.value.find(org => org.tagId === data.primaryOrg) || orgOptions.value[0];
  if (preferredOrg) {
    model.value.orgTag = preferredOrg.tagId;
    onUpdate(preferredOrg);
  }
}

watch(visible, () => {
  if (visible.value) {
    model.value = createDefaultModel();
    loadUploadOrganizations();
    restoreValidation();
  } else {
    orgRequestId += 1;
  }
});

function onUpdate(option: unknown) {
  if (option) {
    const selected = option as Api.OrgTag.Item;
    model.value.orgTagName = selected.name;
    model.value.uploadMaxSizeBytes = selected.uploadMaxSizeBytes;
    model.value.uploadMaxSizeMb = selected.uploadMaxSizeMb;
    return;
  }
  model.value.orgTagName = '';
  model.value.uploadMaxSizeBytes = null;
  model.value.uploadMaxSizeMb = null;
}
</script>

<template>
  <NModal
    v-model:show="visible"
    preset="dialog"
    title="上传团队文档"
    :show-icon="false"
    :mask-closable="!loading"
    :closable="!loading"
    class="document-upload-modal"
  >
    <p class="text-muted mb-6 mt-3 text-13px leading-7">选好存放空间和共享范围，文档处理完成后即可用于检索与问答。</p>
    <NForm ref="formRef" :model="model" :rules="rules" label-placement="top">
      <NFormItem label="所属空间" path="orgTag">
        <div class="w-full">
          <NSelect
            v-model:value="model.orgTag"
            :options="orgOptions"
            label-field="name"
            value-field="tagId"
            placeholder="选择文档存放空间"
            :loading="orgLoading"
            :disabled="loading || orgLoading || orgOptions.length <= 1"
            filterable
            @update:value="(_, option) => onUpdate(option)"
          />
          <div class="text-muted mt-2 text-12px">可选择自己的空间及已加入的组织。</div>
          <NAlert v-if="orgLoadFailed" type="error" class="mt-3" title="空间列表加载失败">
            请检查网络后重试。
            <div class="mt-3"><NButton size="small" @click="loadUploadOrganizations">重新加载</NButton></div>
          </NAlert>
          <NAlert v-else-if="!orgLoading && !orgOptions.length" type="warning" class="mt-3">
            暂无可上传的空间，请联系管理员确认所属组织。
          </NAlert>
        </div>
      </NFormItem>
      <NFormItem label="共享范围" path="isPublic">
        <div>
          <NRadioGroup v-model:value="model.isPublic" name="visibility" :disabled="loading">
            <NSpace :size="20">
              <NRadio :value="false">组织内可见</NRadio>
              <NRadio :value="true">所有用户可见</NRadio>
            </NSpace>
          </NRadioGroup>
          <p class="text-muted mt-2 text-12px">
            {{
              model.isPublic
                ? '所有已登录用户都可以查找该文档，请确认内容适合共享。'
                : '上传者及所属组织有访问权限的成员可以查找该文档。'
            }}
          </p>
        </div>
      </NFormItem>
      <NFormItem label="选择文档" path="fileList">
        <div class="w-full">
          <NUpload
            v-model:file-list="model.fileList"
            :accept="uploadAccept"
            :max="1"
            :multiple="false"
            :default-upload="false"
            :disabled="loading"
          >
            <NUploadDragger>
              <icon-material-symbols:upload-file-outline-rounded class="mx-auto mb-3 text-36px text-primary" />
              <p class="text-14px font-500">点击选择，或将文档拖到这里</p>
              <p class="text-muted mt-2 text-12px">支持 PDF、Word、TXT，每次上传一份文档</p>
            </NUploadDragger>
          </NUpload>
          <p v-if="fileSizeLimitError" class="mt-2 text-12px text-error">{{ fileSizeLimitError }}</p>
          <p v-else-if="!authStore.isAdmin && model.uploadMaxSizeMb" class="text-muted mt-2 text-12px">
            当前空间单文件上限 {{ model.uploadMaxSizeMb }} MB
          </p>
        </div>
      </NFormItem>
    </NForm>
    <template #action>
      <NSpace :size="12">
        <NButton :disabled="loading" @click="close">取消</NButton>
        <NButton type="primary" :loading="loading" :disabled="submitDisabled" @click="handleSubmit">
          {{ loading ? '正在准备上传' : '开始上传' }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
:global(.n-dialog.document-upload-modal) {
  width: min(600px, calc(100vw - 32px));
}
</style>
