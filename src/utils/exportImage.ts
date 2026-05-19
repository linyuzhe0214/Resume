import html2canvas from 'html2canvas';

// ─── oklch 轉 rgb ─────────────────────────────────────────────────────────────

function colorStringToRgb(color: string): string {
  const cvs = document.createElement('canvas');
  cvs.width = 1; cvs.height = 1;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a < 255 ? `rgba(${r},${g},${b},${(a / 255).toFixed(3)})` : `rgb(${r},${g},${b})`;
}

// ─── regex：支援一層巢狀括號，處理 oklch(... / var(--x)) ────────────────────

const MODERN_COLOR_RE = /(?:oklch|oklab|color)\((?:[^)(]*|\([^)]*\))*\)/g;

function replaceModernColors(css: string): string {
  return css.replace(MODERN_COLOR_RE, (m) => {
    // 去掉 var() 讓 canvas 能解析（只取 oklch 前三個數字）
    const simplified = m.replace(/\/\s*var\([^)]*\)/g, '').replace(/var\([^)]*\)/g, '1');
    try { return colorStringToRgb(simplified); } catch { return 'transparent'; }
  });
}

function hasModernColor(text: string) {
  return text.includes('oklch') || text.includes('oklab');
}

// ─── 在呼叫 html2canvas 之前 patch 所有 stylesheet（style + link）──────────
// html2canvas DocumentCloner 在 clone 時就解析 CSS，onclone 太晚。
// <link> stylesheet 需要先 disable 並注入 <style> 替代，否則 html2canvas 仍會
// 自己 fetch 原始 .css 檔並解析（就算我們改了 DOM 也沒用）。

function patchOriginalStyles(): () => void {
  const restores: (() => void)[] = [];

  Array.from(document.styleSheets).forEach((sheet) => {
    const ownerEl = sheet.ownerNode as HTMLElement | null;

    if (ownerEl?.tagName === 'STYLE') {
      // ── inline <style> ──────────────────────────────────────────────────
      const styleEl = ownerEl as HTMLStyleElement;
      const original = styleEl.textContent ?? '';
      if (!hasModernColor(original)) return;
      styleEl.textContent = replaceModernColors(original);
      restores.push(() => { styleEl.textContent = original; });

    } else {
      // ── <link rel="stylesheet"> ─────────────────────────────────────────
      let cssText: string;
      try {
        cssText = Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
      } catch { return; } // cross-origin → skip
      if (!hasModernColor(cssText)) return;

      // 建一個 <style> 替換，並 disable 原始 sheet
      const newStyle = document.createElement('style');
      newStyle.textContent = replaceModernColors(cssText);
      document.head.appendChild(newStyle);
      (sheet as CSSStyleSheet).disabled = true;

      restores.push(() => {
        newStyle.remove();
        try { (sheet as CSSStyleSheet).disabled = false; } catch { /* ignore */ }
      });
    }
  });

  return () => restores.forEach(fn => fn());
}

// ─── 展開元素 overflow/height 限制 ──────────────────────────────────────────

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

// ─── 截取一段 ────────────────────────────────────────────────────────────────

async function captureChunk(
  element: HTMLElement,
  offsetY: number,
  chunkH: number,
  width: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const unpatch = patchOriginalStyles();
  try {
    return await html2canvas(element, {
      scale, width, height: chunkH,
      x: 0, y: offsetY, scrollX: 0, scrollY: 0,
      backgroundColor: '#ffffff',
      useCORS: true, allowTaint: true, logging: false,
    });
  } finally {
    unpatch();
  }
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
    await new Promise(r => setTimeout(r, 300));

    const totalH = element.scrollHeight;
    const totalW = Math.max(element.scrollWidth, 900);
    const scale = 3;
    const CHUNK_DOM_H = 4000;
    const totalChunks = Math.ceil(totalH / CHUNK_DOM_H);

    if (totalChunks === 1) {
      downloadCanvas(await captureChunk(element, 0, totalH, totalW, scale), `${filename}.png`);
      return;
    }

    alert(`⚠️ 圖片較長，系統將自動分段下載為 ${totalChunks} 張圖片（各段可完美拼接）。`);

    for (let i = 0; i < totalChunks; i++) {
      const offsetY = i * CHUNK_DOM_H;
      const chunkH = Math.min(CHUNK_DOM_H, totalH - offsetY);
      downloadCanvas(await captureChunk(element, offsetY, chunkH, totalW, scale), `${filename}_部分${i + 1}.png`);
      if (i < totalChunks - 1) await new Promise(r => setTimeout(r, 600));
    }
  } catch (err: any) {
    console.error('Export failed:', err);
    alert(`匯出失敗：${err instanceof Event ? '不明的 Event 錯誤' : (err.message || String(err))}`);
  } finally {
    restoreExpand();
  }
};

// ─── 多元素拼接匯出 ───────────────────────────────────────────────────────────

export const exportMultipleAsImage = async (elementIds: string[], filename: string) => {
  const elements = elementIds.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
  if (elements.length === 0) { console.error('No elements found:', elementIds); return; }

  const mobileCards = Array.from(document.querySelectorAll<HTMLElement>('.lg\\:hidden'));
  const desktopTables = Array.from(document.querySelectorAll<HTMLElement>('.hidden.lg\\:block'));
  const savedMobile = mobileCards.map(el => el.style.display);
  const savedDesktop = desktopTables.map(el => el.style.display);
  mobileCards.forEach(el => el.style.setProperty('display', 'none', 'important'));
  desktopTables.forEach(el => el.style.setProperty('display', 'block', 'important'));

  const restoreExpands = elements.map(el => expandElement(el));
  try {
    await new Promise(r => setTimeout(r, 300));

    const FIXED_W = Math.max(...elements.map(el => Math.max(el.scrollWidth, 900)));
    const chunks: HTMLCanvasElement[] = [];
    for (const el of elements) {
      chunks.push(await captureChunk(el, 0, el.scrollHeight, FIXED_W, 3));
    }

    const totalH = chunks.reduce((acc, c) => acc + c.height, 0);
    const merged = document.createElement('canvas');
    merged.width = FIXED_W * 3;
    merged.height = totalH;
    const ctx = merged.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, merged.width, merged.height);
    let y = 0;
    for (const c of chunks) { ctx.drawImage(c, 0, y); y += c.height; }
    downloadCanvas(merged, `${filename}.png`);

  } catch (err: any) {
    console.error('Export failed:', err);
    alert(`匯出失敗：${err instanceof Event ? '不明的 Event 錯誤' : (err.message || String(err))}`);
  } finally {
    restoreExpands.forEach(fn => fn());
    mobileCards.forEach((el, i) => { el.style.display = savedMobile[i]; });
    desktopTables.forEach((el, i) => { el.style.display = savedDesktop[i]; });
  }
};
