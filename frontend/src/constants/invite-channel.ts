export function buildInviteChannelGuide() {
  return '加入 DocPilot 团队工作空间，请联系团队管理员获取账号或有效邀请码。';
}

export function buildInviteCodeShareMessage(shareLink: string, inviteCode: string) {
  return [
    '邀请你加入 DocPilot 团队知识库助手。',
    `邀请码：${inviteCode}`,
    `注册链接：${shareLink}`,
    '',
    '请在邀请码有效期内完成注册；如已失效，请联系团队管理员。'
  ].join('\n');
}
