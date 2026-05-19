import html2canvas from 'html2canvas';

// ─── 輔助：將 oklch/oklab/color() 字串轉成 rgb（用 Canvas pixel 法）────────────

function colorStringToRgb(color: string): string {
  const cvs = document.createElement('canvas');
  cvs.width = 1; cvs.height = 1;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a < 255 ? `rgba(${r},${g},${b},${(a / 255).toFixed(3)})` : `rgb(${r},${g},${b})`;
}

// ─── 輔助：用 regex 把 CSS 文字裡的 oklch(…)/oklab(…)/color(…) 全部替換 ────────

const MODERN_COLOR_RE = /oklch\([^)]+\)|oklab\([^)]+\)|color\([^)]+\)/g;

function replaceModernColors(cssText: string): string {
  return cssText.replace(MODERN_COLOR_RE, (match) => {
    try { return colorStringToRgb(match); } catch { return 'transparent'; }
  });
}

// ─── 關鍵：在呼叫 html2canvas「之前」patch 原始 document 的 <style> ──────────
// html2canvas 的 DocumentCloner 在 clone DOM 時就解析 CSS，onclone callback 太晚。
// 必須在呼叫前改原始 document，clone 時才會複製已修改的版本。

function patchOriginalStyles(): () => void {
  const restores: { el: HTMLStyleElement; original: string }[] = [];

  Array.from(document.querySelectorAll('style')).forEach((styleEl) => {
    const original = styleEl.textContent ?? '';
    if (
      !original.includes('oklch') &&
      !original.includes('oklab') &&
      !original.includes('color(')
    ) return;
    restores.push({ el: styleEl as HTMLStyleElement, original });
    styleEl.textContent = replaceModernColors(original);
  });

  return () => {
    restores.forEach(({ el, original }) => { el.textContent = original; });
  };
}

// ─── 輔助：展開元素的 overflow/height 限制 ───────────────────────────────────

function expandElement(element: HTMLElement): () => void {
  const saved: { el: HTMLElement; style: string }[] = [];

  const innerContainers = element.querySelectorAll(
    '[class*="overflow-auto"],[class*="overflow-y-auto"],[class*="overflow-x-auto"],' +
    '[class*="overflow-hidden"],[class*="hide-scrollbar"],' +
    '[class*="flex-1"],[class*="min-h-0"],[class*="h-full"],[class*="max-h-"]'
  );
  innerContainers.forEach((el: any) => {
    saved.push({ el, style: el.style.cssText });
    el.style.setProperty('height', 'max-content', 'important');
    el.style.setProperty('min-height', 'max-content', 'important');
    el.style.setProperty('overflow', 'visible', 'important');
    el.style.setProperty('max-height', 'none', 'important');
    el.style.setProperty('flex', 'none', 'important');
    if (el.scrollTop) el.scrollTop = 0;
  });

  element.querySelectorAll('.sticky, [class*="sticky"]').forEach((el: any) => {
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

// ─── 輔助：截取元素某一段 ──────────────────────────────────────────────────────

async function captureChunk(
  element: HTMLElement,
  offsetY: number,
  chunkH: number,
  width: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  // ★ 在 html2canvas 呼叫前 patch，clone 階段就已是 rgb，無論如何都還原
  const unpatch = patchOriginalStyles();
  try {
    return await html2canvas(element, {
      scale,
      width,
      height: chunkH,
      x: 0,
      y: offsetY,
      scrollX: 0,
      scrollY: 0,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
    });
  } finally {
    unpatch();
  }
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── 主要匯出函式 ─────────────────────────────────────────────────────────────

export const exportComponentAsImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found:', elementId);
    return;
  }

  const restoreExpand = expandElement(element);

  try {
    // 等待 reflow（確保 scrollHeight 正確）
    await new Promise(r => setTimeout(r, 300));

    const totalH = element.scrollHeight;
    const totalW = Math.max(element.scrollWidth, 900);
    const scale = 3;
    const CHUNK_DOM_H = 4000; // × 3 = 12000px canvas，安全不超 16384

    const totalChunks = Math.ceil(totalH / CHUNK_DOM_H);

    if (totalChunks === 1) {
      const canvas = await captureChunk(element, 0, totalH, totalW, scale);
      downloadCanvas(canvas, `${filename}.png`);
      return;
    }

    alert(`⚠️ 圖片較長，系統將自動分段下載為 ${totalChunks} 張圖片（各段可完美拼接）。`);

    for (let i = 0; i < totalChunks; i++) {
      const offsetY = i * CHUNK_DOM_H;
      const chunkH = Math.min(CHUNK_DOM_H, totalH - offsetY);
      const canvas = await captureChunk(element, offsetY, chunkH, totalW, scale);
      downloadCanvas(canvas, `${filename}_部分${i + 1}.png`);
      if (i < totalChunks - 1) await new Promise(r => setTimeout(r, 600));
    }

  } catch (err: any) {
    console.error('Export failed:', err);
    const msg = err instanceof Event ? '不明的 Event 錯誤' : (err.message || String(err));
    alert(`匯出失敗：${msg}`);
  } finally {
    restoreExpand();
  }
};

// ─── 合併多個元素垂直拼接後匯出 ──────────────────────────────────────────────

export const exportMultipleAsImage = async (elementIds: string[], filename: string) => {
  const elements = elementIds
    .map(id => document.getElementById(id))
    .filter(Boolean) as HTMLElement[];

  if (elements.length === 0) {
    console.error('No elements found:', elementIds);
    return;
  }

  const mobileCards = Array.from(document.querySelectorAll('.lg\\:hidden')) as HTMLElement[];
  const desktopTables = Array.from(document.querySelectorAll('.hidden.lg\\:block')) as HTMLElement[];
  const savedMobile = mobileCards.map(el => el.style.display);
  const savedDesktop = desktopTables.map(el => el.style.display);
  mobileCards.forEach(el => el.style.setProperty('display', 'none', 'important'));
  desktopTables.forEach(el => el.style.setProperty('display', 'block', 'important'));

  const restoreExpands = elements.map(el => expandElement(el));

  try {
    await new Promise(r => setTimeout(r, 300));

    const FIXED_W = Math.max(...elements.map(el => Math.max(el.scrollWidth, 900)));
    const scale = 3;

    const chunks: HTMLCanvasElement[] = [];
    for (const el of elements) {
      const c = await captureChunk(el, 0, el.scrollHeight, FIXED_W, scale);
      chunks.push(c);
    }

    const totalH = chunks.reduce((acc, c) => acc + c.height, 0);
    const merged = document.createElement('canvas');
    merged.width = FIXED_W * scale;
    merged.height = totalH;
    const ctx = merged.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, merged.width, merged.height);
    let y = 0;
    for (const c of chunks) { ctx.drawImage(c, 0, y); y += c.height; }

    downloadCanvas(merged, `${filename}.png`);

  } catch (err: any) {
    console.error('Export failed:', err);
    const msg = err instanceof Event ? '不明的 Event 錯誤' : (err.message || String(err));
    alert(`匯出失敗：${msg}`);
  } finally {
    restoreExpands.forEach(fn => fn());
    mobileCards.forEach((el, i) => { el.style.display = savedMobile[i]; });
    desktopTables.forEach((el, i) => { el.style.display = savedDesktop[i]; });
  }
};
