<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import { loginModuleRecord } from '@/constants/app';
import { useAppStore } from '@/store/modules/app';
import { useThemeStore } from '@/store/modules/theme';
import { $t } from '@/locales';
import PwdLogin from './modules/pwd-login.vue';
import CodeLogin from './modules/code-login.vue';
import Register from './modules/register.vue';
import ResetPwd from './modules/reset-pwd.vue';
import BindWechat from './modules/bind-wechat.vue';

interface Props {
  /** The login module */
  module?: UnionKey.LoginModule;
}

const props = defineProps<Props>();

const appStore = useAppStore();
const themeStore = useThemeStore();

interface LoginModule {
  label: string;
  component: Component;
}

const moduleMap: Record<UnionKey.LoginModule, LoginModule> = {
  'pwd-login': { label: loginModuleRecord['pwd-login'], component: PwdLogin },
  'code-login': { label: loginModuleRecord['code-login'], component: CodeLogin },
  register: { label: loginModuleRecord.register, component: Register },
  'reset-pwd': { label: loginModuleRecord['reset-pwd'], component: ResetPwd },
  'bind-wechat': { label: loginModuleRecord['bind-wechat'], component: BindWechat }
};

const activeModule = computed(() => moduleMap[props.module || 'pwd-login']);
const isRegisterModule = computed(() => (props.module || 'pwd-login') === 'register');
</script>

<template>
  <div class="login-page">
    <div class="login-utilities">
      <ThemeSchemaSwitch
        :theme-schema="themeStore.themeScheme"
        :show-tooltip="false"
        @switch="themeStore.toggleThemeScheme"
      />
      <LangSwitch
        v-if="themeStore.header.multilingual.visible"
        :lang="appStore.locale"
        :lang-options="appStore.localeOptions"
        @change-lang="appStore.changeLocale"
      />
    </div>
    <div class="login-layout" :class="{ 'login-layout--register': isRegisterModule }">
      <section v-if="!isRegisterModule" class="login-story">
        <div class="story-brand">
          <SystemLogo />
          <span>DocPilot</span>
        </div>
        <div class="story-kicker">团队知识库助手</div>
        <h1>
          文档有归处，
          <br />
          知识有来路。
        </h1>
        <p class="story-description">把分散的团队资料汇聚起来。查找历史方案、理解项目背景，让每次交接都有据可循。</p>
        <div class="story-document" aria-hidden="true">
          <div class="document-heading">
            <icon-material-symbols:folder-open-outline-rounded />
            <span>团队知识，触手可及</span>
          </div>
          <div class="document-row">
            <span class="document-dot" />
            技术方案与阶段记录
            <span>集中管理</span>
          </div>
          <div class="document-row">
            <span class="document-dot" />
            操作手册与问题记录
            <span>随时查找</span>
          </div>
          <div class="document-answer">
            <SystemLogo />
            <div>
              从问题出发，找到内容
              <br />
              <small>带着出处，回到原文</small>
            </div>
            <icon-material-symbols:arrow-outward-rounded />
          </div>
        </div>
        <div class="story-caption">
          文档管理
          <span>·</span>
          知识检索
          <span>·</span>
          引用问答
        </div>
      </section>
      <NCard :bordered="false" class="login-card">
        <div :class="isRegisterModule ? 'login-panel login-panel--register' : 'login-panel'">
          <header class="login-card-brand">
            <SystemLogo />
            <span>{{ $t('system.title') }}</span>
          </header>
          <h2>{{ isRegisterModule ? '加入团队工作空间' : '登录你的工作空间' }}</h2>
          <p class="login-subtitle">
            {{ isRegisterModule ? '使用邀请码创建账号，开始查找团队资料。' : '欢迎回来，继续探索团队文档中的答案。' }}
          </p>
          <main>
            <Transition :name="themeStore.page.animateMode" mode="out-in" appear>
              <component :is="activeModule.component" />
            </Transition>
          </main>
        </div>
      </NCard>
    </div>
    <footer class="login-footer">DocPilot — 团队知识库助手</footer>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 32px 28px;
  background: rgb(var(--layout-bg-color));
}
.login-utilities {
  position: absolute;
  top: 24px;
  right: 28px;
  display: flex;
  gap: 16px;
  font-size: 20px;
}
.login-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  max-width: 1080px;
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 24px 80px rgb(15 50 54 / 7%);
}
.login-story {
  padding: 44px 48px;
  background: #103f3c;
  color: #f4fffc;
}
.story-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.8px;
}
.story-brand :deep(svg) {
  width: 32px;
  height: 32px;
}
.story-kicker {
  margin-top: 48px;
  color: #9bd2c4;
  letter-spacing: 3px;
  font-size: 12px;
}
h1 {
  margin-top: 16px;
  font-size: clamp(30px, 3.1vw, 42px);
  line-height: 1.45;
  font-weight: 650;
  letter-spacing: -1px;
}
.story-description {
  max-width: 360px;
  margin-top: 20px;
  color: #b9d3ce;
  font-size: 14px;
  line-height: 1.95;
}
.story-document {
  margin-top: 36px;
  padding: 20px;
  border: 1px solid #ffffff20;
  border-radius: 14px;
  background: #ffffff08;
}
.document-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 16px;
  font-size: 13px;
  font-weight: 600;
}
.document-heading svg {
  font-size: 20px;
  color: #a4d8ca;
}
.document-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 0;
  font-size: 12px;
  color: #dfefea;
  border-top: 1px solid #ffffff10;
}
.document-row > span:last-child {
  margin-left: auto;
  color: #98bdb1;
  font-size: 11px;
}
.document-dot {
  width: 6px;
  height: 6px;
  border-radius: 2px;
  background: #a8cfaa;
}
.document-answer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 14px;
  background: #dcece4;
  color: #1f4840;
  border-radius: 9px;
  line-height: 1.7;
  font-size: 12px;
}
.document-answer :deep(svg) {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
.document-answer > svg:last-child {
  margin-left: auto;
  width: 18px;
}
.document-answer small {
  color: #53766b;
  font-size: 11px;
}
.story-caption {
  margin-top: 24px;
  display: flex;
  align-items: center;
  gap: 14px;
  color: #a8c9bf;
  font-size: 11px;
}
.story-caption span {
  opacity: 0.45;
}
.login-card.n-card {
  background: var(--app-surface);
  border-radius: 0;
}
.login-card :deep(.n-card__content) {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}
.login-panel {
  width: 100%;
  max-width: 340px;
}
.login-card-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  color: rgb(var(--primary-color));
  font-size: 18px;
  font-weight: 700;
}
.login-card-brand :deep(svg) {
  width: 28px;
  height: 28px;
}
h2 {
  margin-top: 32px;
  font-size: 25px;
  font-weight: 650;
  letter-spacing: -0.5px;
  color: var(--app-text);
}
.login-subtitle {
  margin-top: 10px;
  margin-bottom: 32px;
  color: var(--app-muted);
  line-height: 1.8;
  font-size: 13px;
}
.login-footer {
  margin-top: 28px;
  color: var(--app-muted);
  font-size: 11px;
  letter-spacing: 1px;
}
.login-layout--register {
  display: block;
  max-width: 940px;
}
.login-panel--register {
  max-width: none;
}
@media (max-width: 800px) {
  .login-story {
    padding: 36px 30px;
  }
  .login-card :deep(.n-card__content) {
    padding: 36px 28px;
  }
}
@media (max-width: 640px) {
  .login-page {
    padding: 60px 16px 24px;
  }
  .login-layout {
    display: block;
    max-width: 440px;
    border-radius: 18px;
  }
  .login-story {
    display: none;
  }
  .login-card :deep(.n-card__content) {
    padding: 36px 26px;
  }
  h2 {
    font-size: 23px;
  }
}
</style>
