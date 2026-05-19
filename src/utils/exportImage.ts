import html2canvas from 'html2canvas';

// ─── 輔助：將 oklch/oklab 顏色 bake 成 rgb inline style（html2canvas 不支援 oklch）─────

function convertToComputedRgb(element: HTMLElement): () => void {
  const els = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
  const saved: { el: HTMLElement; style: string }[] = [];
  const updates: { el: HTMLElement; prop: string; value: string }[] = [];

  els.forEach(el => {
    const cs = window.getComputedStyle(el);
    saved.push({ el, style: el.style.cssText });
    (['backgroundColor', 'color', 'borderColor', 'boxShadow', 'outlineColor'] as const).forEach(prop => {
      const v = (cs as any)[prop] as string;
      if (v && (v.includes('oklch') || v.includes('oklab') || v.includes('var('))) {
        const cssProp = prop === 'backgroundColor' ? 'background-color'
          : prop === 'borderColor' ? 'border-color'
          : prop === 'boxShadow' ? 'box-shadow'
          : prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        updates.push({ el, prop: cssProp, value: v });
      }
    });
  });

  updates.forEach(({ el, prop, value }) => el.style.setProperty(prop, value, 'important'));
  return () => saved.forEach(({ el, style }) => { el.style.cssText = style; });
}

// ─── 輔助：展開元素及其祖先的 overflow/height 限制 ───────────────────────────

function expandElement(element: HTMLElement) {
  const saved: { el: HTMLElement; style: string }[] = [];

  // 展開元素內的捲動/flex 子容器
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

  // sticky → relative（避免截圖時卡在頂部重複出現）
  const stickyEls = element.querySelectorAll('.sticky');
  stickyEls.forEach((el: any) => {
    saved.push({ el, style: el.style.cssText });
    el.style.setProperty('position', 'relative', 'important');
  });

  // 展開元素本身
  saved.push({ el: element, style: element.style.cssText });
  element.style.setProperty('height', 'max-content', 'important');
  element.style.setProperty('overflow', 'visible', 'important');
  element.style.setProperty('min-width', '900px', 'important');
  element.style.setProperty('flex', 'none', 'important');

  // bake oklch → rgb——移到主函式內 reflow 後才執行
  // const restoreColors = convertToComputedRgb(element);

  return () => {
    saved.forEach(({ el, style }) => { el.style.cssText = style; });
  };
}

// ─── 輔助：截取元素的某一段（y 偏移 + 高度）───────────────────────────────────

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

// ─── 下載 canvas ──────────────────────────────────────────────────────────────

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

  let restoreColors: (() => void) | null = null;
  const restore = expandElement(element);

  try {
    // 等待 reflow，再 bake oklch → rgb
    await new Promise(r => setTimeout(r, 200));
    restoreColors = convertToComputedRgb(element);
    // html2canvas 需要多一點時間讓顏色生效
    await new Promise(r => setTimeout(r, 50));
    const totalH = element.scrollHeight;
    const totalW = Math.max(element.scrollWidth, 900);

    const scale = 3;
    // 每段截 4000px DOM（= 12000px canvas @ 3x），安全不超 16384 限制
    const CHUNK_DOM_H = 4000;
    const totalChunks = Math.ceil(totalH / CHUNK_DOM_H);

    if (totalChunks === 1) {
      // 不需分段，直接截整張
      const canvas = await captureChunk(element, 0, totalH, totalW, scale);
      downloadCanvas(canvas, `${filename}.png`);
      return;
    }

    // 分段截圖
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
    restore();
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

  // 強制桌面版 layout
  const mobileCards = Array.from(document.querySelectorAll('.lg\\:hidden')) as HTMLElement[];
  const desktopTables = Array.from(document.querySelectorAll('.hidden.lg\\:block')) as HTMLElement[];
  const savedMobile = mobileCards.map(el => el.style.display);
  const savedDesktop = desktopTables.map(el => el.style.display);
  mobileCards.forEach(el => el.style.setProperty('display', 'none', 'important'));
  desktopTables.forEach(el => el.style.setProperty('display', 'block', 'important'));

  const restoreFns = elements.map(el => expandElement(el));

  try {
    await new Promise(r => setTimeout(r, 150));

    const FIXED_W = Math.max(...elements.map(el => Math.max(el.scrollWidth, 900)));
    const scale = 3;

    // 逐一截圖，在 canvas 上垂直拼接
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
    for (const c of chunks) {
      ctx.drawImage(c, 0, y);
      y += c.height;
    }

    downloadCanvas(merged, `${filename}.png`);

  } catch (err: any) {
    console.error('Export failed:', err);
    const msg = err instanceof Event ? '不明的 Event 錯誤' : (err.message || String(err));
    alert(`匯出失敗：${msg}`);
  } finally {
    restoreFns.forEach(fn => fn());
    mobileCards.forEach((el, i) => { el.style.display = savedMobile[i]; });
    desktopTables.forEach((el, i) => { el.style.display = savedDesktop[i]; });
  }
};
