/** Keep the product identity when routes or language settings update the tab title. */
export function formatDocumentTitle(pageTitle?: string) {
  const productTitle = 'DocPilot — 团队知识库助手';
  return pageTitle ? `${pageTitle} · ${productTitle}` : productTitle;
}
