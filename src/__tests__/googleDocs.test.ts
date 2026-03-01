import { extractDocId, buildExportUrl } from '../utils/googleDocs';

describe('extractDocId', () => {
  it('extracts ID from standard edit URL', () => {
    const url = 'https://docs.google.com/document/d/1iNzhQzlw_6T38uik1jyBTNXa0S7aiCcBehTabqqG1lw/edit?usp=sharing';
    expect(extractDocId(url)).toBe('1iNzhQzlw_6T38uik1jyBTNXa0S7aiCcBehTabqqG1lw');
  });

  it('returns null for invalid URL', () => {
    expect(extractDocId('https://google.com')).toBeNull();
  });
});

describe('buildExportUrl', () => {
  it('builds correct export URL', () => {
    const id = '1iNzhQzlw_6T38uik1jyBTNXa0S7aiCcBehTabqqG1lw';
    expect(buildExportUrl(id)).toBe(
      'https://docs.google.com/document/d/1iNzhQzlw_6T38uik1jyBTNXa0S7aiCcBehTabqqG1lw/export?format=txt'
    );
  });
});
