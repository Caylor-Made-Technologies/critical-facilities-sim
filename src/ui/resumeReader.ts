/**
 * Reads a resume file in the browser and returns its plain text. Nothing is
 * uploaded: PDF text comes from a bundled PDF reader, Word files are unzipped
 * with the browser's own decompressor, and text files are read directly.
 */

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export async function readResume(file: File): Promise<string> {
  if (file.size > MAX_RESUME_BYTES) throw new Error('That file is over 5 MB. Try a smaller copy, or paste the text instead.');
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return readPdf(await file.arrayBuffer());
  if (name.endsWith('.docx')) return readDocx(await file.arrayBuffer());
  if (name.endsWith('.txt') || name.endsWith('.md') || file.type.startsWith('text/')) return (await file.text()).slice(0, 200_000);
  throw new Error('Please use a PDF, Word (.docx) or text file, or paste your resume below.');
}

async function readPdf(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const task = pdfjs.getDocument({ data: new Uint8Array(data), disableFontFace: true, useSystemFonts: false });
  const doc = await task.promise;
  const out: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, 12); i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    out.push(tc.items.map((it) => ('str' in it ? it.str : '')).join(' '));
  }
  await task.destroy();
  return out.join('\n').slice(0, 200_000);
}

/** Minimal .docx reader: find word/document.xml in the zip and strip the XML. */
export async function readDocx(buf: ArrayBuffer): Promise<string> {
  const v = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('That Word file looks damaged. Try saving it again, or paste the text instead.');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let n = 0; n < count && p + 46 <= buf.byteLength; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extra = v.getUint16(p + 30, true);
    const comment = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const fname = dec.decode(new Uint8Array(buf, p + 46, nameLen));
    if (fname === 'word/document.xml') {
      const ln = v.getUint16(local + 26, true);
      const le = v.getUint16(local + 28, true);
      const start = local + 30 + ln + le;
      const raw = new Uint8Array(buf, start, size);
      let xml: string;
      if (method === 0) xml = dec.decode(raw);
      else if (method === 8 && typeof DecompressionStream !== 'undefined') {
        const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        xml = await new Response(stream).text();
      } else throw new Error('This browser can\'t open that Word file. Paste the text instead.');
      return xmlToText(xml).slice(0, 200_000);
    }
    p += 46 + nameLen + extra + comment;
  }
  throw new Error('No document text found in that Word file. Paste the text instead.');
}

export function xmlToText(xml: string): string {
  return xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
