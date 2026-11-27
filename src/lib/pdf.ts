import * as pdfjs from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

export async function pdfToText(file: File): Promise<string> {
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const pages: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const tc = await page.getTextContent()
    let line = ''
    let out = ''
    for (const item of tc.items as Array<{ str?: string; hasEOL?: boolean }>) {
      if (typeof item.str !== 'string') continue
      line += item.str
      if (item.hasEOL) { out += line.trimEnd() + '\n'; line = '' }
    }
    out += line
    pages.push(`[Page ${n}]\n${out.trim()}`)
  }
  return pages.join('\n\n')
}
