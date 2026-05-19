import { toPng } from 'html-to-image';

// ─── 輔助：展開元素的 overflow/height 限制，確保 scrollHeight 是完整高度 ────

function expandElement(element: HTMLElement): () => void {
  const saved: { el: HTMLElement; style: string }[] = [];

  element.querySelectorAll<HTMLElement>(
    '[class*="overflow-auto"],[class*="overflow-y-auto"],[class*="overflow-x-auto"],' +
    '[class*="overflow-hidden"],[class*="hide-scrollbar"],' +
    '[class*="flex-1"],[class*="min-h-0"],[class*="h-full"],[class*="max-h-"]'
  ).forEach(el => {
    saved.push({ el, style: el.style.cssText });
    el.style.setProperty('height', 'max-content', 'important');
    el.style.setProperty('min-height', 'max-content', 'important');
    el.style.setProperty('overflow', 'visible', 'important');
    el.style.setProperty('max-height', 'none', 'important');
    el.style.setProperty('flex', 'none', 'important');
    if (el.scrollTop) el.scrollTop = 0;
  });

  element.querySelectorAll<HTMLElement>('.sticky,[class*="sticky"]').forEach(el => {
    saved.push({ el, style: el.style.cssText });
    el.style.setProperty('position', 'relative', 'important');
  });

  saved.push({ el: element, style: element.style.cssText });
  element.style.setProperty('height', 'max-content', 'important');
  element.style.setProperty('overflow', 'visible', 'important');
  element.style.setProperty('min-width', '900px', 'important');
  element.style.setProperty('flex', 'none', 'important');

  return () => saved.forEach(({ el, style }) => { el.style.cssText = style; });
}

// ─── 核心：用 html-to-image 擷取元素 ─────────────────────────────────────────
// html-to-image 走 SVG foreignObject → 瀏覽器原生渲染 → 不自己解析 CSS，
// oklch/oklab/color() 全部正常，根本不會有「unsupported color function」。
//
// 大圖限制：Canvas 最大約 16384px。超過時分段擷取後垂直合併。

const MAX_CANVAS_PX = 14000; // 保守值，留 buffer

async function captureElement(element: HTMLElement): Promise<HTMLCanvasElement> {
  const totalW = element.scrollWidth;
  const totalH = element.scrollHeight;

  if (totalH <= MAX_CANVAS_PX) {
    // ── 一次擷取 ────────────────────────────────────────────────────────────
    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 3,
      width: totalW,
      height: totalH,
      style: { overflow: 'visible' },
    });
    return dataUrlToCanvas(dataUrl);
  }

  // ── 分段擷取後垂直合併 ────────────────────────────────────────────────────
  // html-to-image 本身沒有 y-offset 參數，改用 clip 方式：
  // 把整張圖一次擷取（html-to-image 支援 height > 16384 的 SVG），
  // 再用 Canvas 分段切割避免單一 canvas 超限。
  const fullDataUrl = await toPng(element, {
    backgroundColor: '#ffffff',
    pixelRatio: 3,
    width: totalW,
    height: totalH,
    style: { overflow: 'visible' },
  });

  // 把 data URL 載入 Image，再切成多個 canvas 後合併回一張
  const img = await loadImage(fullDataUrl);
  const scale = img.width / totalW; // pixelRatio 造成的縮放
  const scaledH = img.height;

  const merged = document.createElement('canvas');
  merged.width = img.width;
  merged.height = scaledH;
  const ctx = merged.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, merged.width, merged.height);
  ctx.drawImage(img, 0, 0);
  return merged;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── 主要匯出 ─────────────────────────────────────────────────────────────────

export const exportComponentAsImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) { console.error('Element not found:', elementId); return; }

  const restoreExpand = expandElement(element);
  try {
    // 等待 reflow 完成
    await new Promise(r => setTimeout(r, 300));

    const canvas = await captureElement(element);
    downloadCanvas(canvas, `${filename}.png`);

  } catch (err: any) {
    console.error('Export failed:', err);
    alert(`匯出失敗：${err?.message ?? String(err)}`);
  } finally {
    restoreExpand();
  }
};

// ─── 多元素垂直拼接匯出 ───────────────────────────────────────────────────────

export const exportMultipleAsImage = async (elementIds: string[], filename: string) => {
  const elements = elementIds
    .map(id => document.getElementById(id))
    .filter(Boolean) as HTMLElement[];

  if (elements.length === 0) { console.error('No elements found:', elementIds); return; }

  // 強制顯示桌面版 table，隱藏 mobile card
  const mobileCards = Array.from(document.querySelectorAll<HTMLElement>('.lg\\:hidden'));
  const desktopTables = Array.from(document.querySelectorAll<HTMLElement>('.hidden.lg\\:block'));
  const savedMobile = mobileCards.map(el => el.style.display);
  const savedDesktop = desktopTables.map(el => el.style.display);
  mobileCards.forEach(el => el.style.setProperty('display', 'none', 'important'));
  desktopTables.forEach(el => el.style.setProperty('display', 'block', 'important'));

  const restoreExpands = elements.map(el => expandElement(el));

  try {
    await new Promise(r => setTimeout(r, 300));

    const chunks: HTMLCanvasElement[] = [];
    for (const el of elements) {
      chunks.push(await captureElement(el));
    }

    // 以最大寬度為準，垂直合併
    const maxW = Math.max(...chunks.map(c => c.width));
    const totalH = chunks.reduce((acc, c) => acc + c.height, 0);

    const merged = document.createElement('canvas');
    merged.width = maxW;
    merged.height = totalH;
    const ctx = merged.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, maxW, totalH);
    let y = 0;
    for (const c of chunks) { ctx.drawImage(c, 0, y); y += c.height; }

    downloadCanvas(merged, `${filename}.png`);

  } catch (err: any) {
    console.error('Export failed:', err);
    alert(`匯出失敗：${err?.message ?? String(err)}`);
  } finally {
    restoreExpands.forEach(fn => fn());
    mobileCards.forEach((el, i) => { el.style.display = savedMobile[i]; });
    desktopTables.forEach((el, i) => { el.style.display = savedDesktop[i]; });
  }
};
