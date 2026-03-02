export function extractDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function buildExportUrl(docId: string): string {
  return `https://docs.google.com/document/d/${docId}/export?format=txt`;
}

export async function fetchDocTitle(docUrl: string): Promise<string | null> {
  const docId = extractDocId(docUrl);
  if (!docId) return null;
  try {
    const editUrl = `https://docs.google.com/document/d/${docId}/edit`;
    const response = await fetch(editUrl, { redirect: 'follow' });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (!match) return null;
    return match[1]
      .replace(/\s*-\s*Google Docs\s*$/i, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .trim();
  } catch {
    return null;
  }
}

export async function fetchDocText(docUrl: string): Promise<string> {
  const docId = extractDocId(docUrl);
  if (!docId) throw new Error('Invalid Google Doc URL. Make sure you copied the full link.');

  const exportUrl = buildExportUrl(docId);
  const response = await fetch(exportUrl, { redirect: 'follow' });

  if (!response.ok) {
    throw new Error('Could not fetch the Google Doc. Make sure sharing is set to "Anyone with the link".');
  }

  return response.text();
}
