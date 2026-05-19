import html2canvas from 'html2canvas';

// ─── 輔助：用 Canvas pixel 讀取把 oklch/oklab/color() 轉成 rgb ─────────────────
// getComputedStyle 在 Chrome 111+ 回傳原始 oklch 字串，
// 只有 Canvas 2D fillStyle → getImageData 才能強制轉成 sRGB。

const _cvs = document.createElement('canvas');
_cvs.width = 1;
_cvs.height = 1;
const _ctx = _cvs.getContext('2d')!;
const _cache = new Map<string, string>();

function resolveColor(color: string): string {
  if (!color || color === 'transparent' || color === 'none') return color;
  if (!color.includes('oklch') && !color.includes('oklab') && !color.includes('color(') && !color.includes('var(')) {
    return color;
  }
  const cached = _cache.get(color);
  if (cached) return cached;

  try {
    _ctx.clearRect(0, 0, 1, 1);
    _ctx.fillStyle = '#000'; // reset
    _ctx.fillStyle = color;  // apply oklch/var
    _ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = _ctx.getImageData(0, 0, 1, 1).data;
    const result = a === 0 ? 'transparent'
      : a < 255 ? `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`
      : `rgb(${r},${g},${b})`;
    _cache.set(color, result);
    return result;
  } catch {
    return color;
  }
}

function convertToComputedRgb(element: HTMLElement): () => void {
  const els = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
  const saved: { el: HTMLElement; style: string }[] = [];
  const updates: { el: HTMLElement; prop: string; value: string }[] = [];

  const COLOR_PROPS: [string, string][] = [
    ['backgroundColor', 'background-color'],
    ['color', 'color'],
    ['borderTopColor', 'border-top-color'],
    ['borderRightColor', 'border-right-color'],
    ['borderBottomColor', 'border-bottom-color'],
    ['borderLeftColor', 'border-left-color'],
    ['outlineColor', 'outline-color'],
    ['textDecorationColor', 'text-decoration-color'],
  ];

  els.forEach(el => {
    const cs = window.getComputedStyle(el);
    saved.push({ el, style: el.style.cssText });

    COLOR_PROPS.forEach(([jsProp, cssProp]) => {
      const v = (cs as any)[jsProp] as string;
      if (!v) return;
      const resolved = resolveColor(v);
      if (resolved !== v) updates.push({ el, prop: cssProp, value: resolved });
    });

    // box-shadow 含 oklch 時直接移除（無法簡單轉換 multi-part value）
    const shadow = cs.boxShadow;
    if (shadow && shadow !== 'none' && (shadow.includes('oklch') || shadow.includes('oklab'))) {
      updates.push({ el, prop: 'box-shadow', value: 'none' });
    }
  });

  updates.forEach(({ el, prop, value }) => el.style.setProperty(prop, value, 'important'));
  return () => saved.forEach(({ el, style }) => { el.style.cssText = style; });
}

// ─── 輔助：展開元素的 overflow/height 限制 ───────────────────────────────────

function expandElement(element: HTMLElement): () => void {
  const saved: { el: HTMLElement; style: string }[] = [];

  const innerContainers = element.querySelectorAll(
    '.overflow-auto, .overflow-y-auto, .overflow-x-auto, .hide-scrollbar, .overflow-hidden, .flex-1, .min-h-0'
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

  element.querySelectorAll('.sticky').forEach((el: any) => {
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
  return html2canvas(element, {
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
  let restoreColors: (() => void) | null = null;

  try {
    // 等待 reflow（確保 scrollHeight 正確）
    await new Promise(r => setTimeout(r, 200));

    // 用 Canvas pixel 法把所有 oklch → rgb inline style
    restoreColors = convertToComputedRgb(element);

    // 再等一點讓 style mutation 生效
    await new Promise(r => setTimeout(r, 80));

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
    if (restoreColors) restoreColors();
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
  const restoreColorsFns: Array<() => void> = [];

  try {
    await new Promise(r => setTimeout(r, 200));
    elements.forEach(el => restoreColorsFns.push(convertToComputedRgb(el)));
    await new Promise(r => setTimeout(r, 80));

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
    restoreColorsFns.forEach(fn => fn());
    restoreExpands.forEach(fn => fn());
    mobileCards.forEach((el, i) => { el.style.display = savedMobile[i]; });
    desktopTables.forEach((el, i) => { el.style.display = savedDesktop[i]; });
  }
};
