# 28 - PDF处理需求

> **版本**: v1.0
> **最后更新**: 2026-01-29
> **依赖文档**: 25-媒体类型检测需求
> **后续文档**: 29-Cron定时任务需求

---

## 1. 需求概述

### 1.1 目标描述

实现**PDF 文档的文本提取、图片提取、页面渲染**等功能。

**核心目标:**
- **文本提取**: 提取 PDF 文本内容
- **图片提取**: 提取 PDF 中的图片
- **页面渲染**: 将 PDF 页面渲染为图片
- **元数据读取**: 页数、作者、标题

---

## 2. 核心功能

### 2.1 文本提取

```typescript
import { getDocument } from 'pdfjs-dist';

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = await getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str)
      .join(' ');
    pages.push(text);
  }

  return pages.join('\n\n');
}
```

### 2.2 元数据提取

```typescript
export async function getPdfMetadata(buffer: Buffer): Promise<{
  pageCount: number;
  title?: string;
  author?: string;
  creationDate?: Date;
}> {
  const pdf = await getDocument({ data: buffer }).promise;
  const metadata = await pdf.getMetadata();

  return {
    pageCount: pdf.numPages,
    title: metadata.info?.Title,
    author: metadata.info?.Author,
    creationDate: metadata.info?.CreationDate
  };
}
```

### 2.3 页面渲染

```typescript
export async function renderPdfPage(params: {
  buffer: Buffer;
  pageNumber: number;
  scale?: number;
}): Promise<Buffer> {
  const pdf = await getDocument({ data: params.buffer }).promise;
  const page = await pdf.getPage(params.pageNumber);

  const viewport = page.getViewport({ scale: params.scale ?? 1.5 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  await page.render({
    canvasContext: context,
    viewport
  }).promise;

  return canvas.toBuffer('image/png');
}
```

---

**文档完成** ✅
