import { toPng } from 'html-to-image';

/**
 * 遍歷元素及其子元素，將所有計算後的顏色（包含 oklch, oklab 等）強行轉換為 RGB 內嵌樣式。
 * 這是為了解決截圖套件無法解析 Tailwind v4 新顏色格式的問題。
 */
const convertToComputedRgb = (element: HTMLElement) => {
  const elements = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
  const savedStyles: Array<{ el: HTMLElement; style: string }> = [];
  const updates: Array<{ el: HTMLElement; prop: string; value: string }> = [];

  // Phase 1: Read all computed styles
  elements.forEach((el) => {
    const style = window.getComputedStyle(el);
    const colorProps = ['backgroundColor', 'color', 'borderColor', 'boxShadow', 'outlineColor', 'textDecorationColor'];
    
    savedStyles.push({ el, style: el.style.cssText });

    colorProps.forEach((prop) => {
      const value = (style as any)[prop];
      if (value && (value.includes('oklch') || value.includes('oklab') || value.includes('var('))) {
        updates.push({
          el,
          prop: prop === 'backgroundColor' ? 'background-color' : 
                prop === 'borderColor' ? 'border-color' : 
                prop === 'boxShadow' ? 'box-shadow' : 
                prop.replace(/([A-Z])/g, '-$1').toLowerCase(),
          value
        });
      }
    });
  });

  // Phase 2: Write all styles (prevents layout thrashing)
  updates.forEach(({ el, prop, value }) => {
    el.style.setProperty(prop, value, 'important');
  });

  return () => {
    savedStyles.forEach(({ el, style }) => {
      el.style.cssText = style;
    });
  };
};

/**
 * 判斷是否為行動裝置 (iOS / Android)
 */
const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/**
 * 下載圖片 — 桌面用 <a>.click()；手機開新分頁讓使用者長按儲存
 */
const downloadDataUrl = (dataUrl: string, filename: string) => {
  if (isMobile()) {
    // 行動裝置：開新分頁，使用者可長按圖片儲存
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`
        <html><head><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>${filename}</title>
        <style>body{margin:0;background:#111;display:flex;flex-direction:column;align-items:center;padding:12px;gap:10px}
        img{max-width:100%;border-radius:8px;box-shadow:0 4px 20px #0005}
        p{color:#aaa;font-size:13px;font-family:sans-serif;text-align:center;margin:0}</style>
        </head><body>
        <p>📥 長按圖片即可儲存至相冊</p>
        <img src="${dataUrl}" alt="${filename}" />
        </body></html>
      `);
      w.document.close();
    } else {
      // 若瀏覽器封鎖彈出視窗，退而求其次
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${filename}.png`;
      link.click();
    }
  } else {
    const link = document.createElement('a');
    link.download = `${filename}_${new Date().getTime()}.png`;
    link.href = dataUrl;
    link.click();
  }
};

export const exportComponentAsImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found:', elementId);
    return;
  }
  
  let restoreColors: (() => void) | null = null;
  const originalStyle = element.style.cssText;
  const scrollContainers = element.querySelectorAll('.overflow-auto, .overflow-y-auto, .overflow-x-auto, .hide-scrollbar');
  const originalScrollStyles = Array.from(scrollContainers).map((el: any) => el.style.cssText);

  try {
    // 1. 展開容器
    element.style.setProperty('height', 'max-content', 'important');
    element.style.setProperty('width', 'max-content', 'important');
    element.style.setProperty('overflow', 'visible', 'important');
    
    scrollContainers.forEach((el: any) => {
      el.style.setProperty('height', 'max-content', 'important');
      el.style.setProperty('width', 'max-content', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('max-width', 'none', 'important');
    });

    // 2. 轉換顏色為 RGB，避免截圖套件解析失敗
    restoreColors = convertToComputedRgb(element);

    // 等待 DOM 更新 (縮短等待時間加速匯出)
    await new Promise(resolve => setTimeout(resolve, 30));

    const targetHeight = element.scrollHeight;
    // 大幅降低門檻以提速：超過 1500px 即採用單倍解析度
    const pixelRatio = targetHeight > 1500 ? 1 : 2; 

    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: pixelRatio,
      width: element.scrollWidth,
      height: element.scrollHeight,
      skipFonts: true,
      style: {
        transform: 'none',
        transition: 'none'
      }
    });

    downloadDataUrl(dataUrl, filename);

  } catch (err: any) {
    console.error('Failed to export image:', err);
    alert(`匯出圖片失敗：${err.message || err} \n請檢查 F12 主控台錯誤訊息。`);
  } finally {
    // 3. 復原一切
    if (restoreColors) restoreColors();
    element.style.cssText = originalStyle;
    scrollContainers.forEach((el: any, i) => {
      el.style.cssText = originalScrollStyles[i];
    });
  }
};

/**
 * 合併多個 DOM 元素垂直拼接後匯出為一張圖片
 */
export const exportMultipleAsImage = async (elementIds: string[], filename: string) => {
  const elements = elementIds.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
  if (elements.length === 0) {
    console.error('No elements found:', elementIds);
    return;
  }

  const restoreFns: Array<() => void> = [];
  const originalStyles = elements.map(el => el.style.cssText);
  const allScrollContainers: Array<{ el: any; style: string }[]> = [];

  try {
    // 展開所有容器
    elements.forEach((element, idx) => {
      const scrollContainers = element.querySelectorAll('.overflow-auto, .overflow-y-auto, .overflow-x-auto, .hide-scrollbar');
      const saved = Array.from(scrollContainers).map((el: any) => ({ el, style: el.style.cssText }));
      allScrollContainers.push(saved);

      element.style.setProperty('height', 'max-content', 'important');
      element.style.setProperty('width', 'max-content', 'important');
      element.style.setProperty('overflow', 'visible', 'important');
      scrollContainers.forEach((el: any) => {
        el.style.setProperty('height', 'max-content', 'important');
        el.style.setProperty('width', 'max-content', 'important');
        el.style.setProperty('overflow', 'visible', 'important');
        el.style.setProperty('max-height', 'none', 'important');
        el.style.setProperty('max-width', 'none', 'important');
      });

      restoreFns.push(convertToComputedRgb(element));
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    // 分別截圖每個元素
    const maxWidth = Math.max(...elements.map(el => el.scrollWidth));
    const dataUrls = await Promise.all(elements.map(el =>
      toPng(el, {
        backgroundColor: '#ffffff',
        pixelRatio: 1.5,
        width: el.scrollWidth,
        height: el.scrollHeight,
        skipFonts: true,
        style: { transform: 'none', transition: 'none' }
      })
    ));

    // 在 Canvas 上垂直拼接
    const images = await Promise.all(dataUrls.map(url => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    }));

    const totalHeight = images.reduce((acc, img, i) => acc + elements[i].scrollHeight * 1.5, 0);
    const canvas = document.createElement('canvas');
    canvas.width = maxWidth * 1.5;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let y = 0;
    images.forEach((img, i) => {
      ctx.drawImage(img, 0, y);
      y += elements[i].scrollHeight * 1.5;
    });

    const finalDataUrl = canvas.toDataURL('image/png');
    downloadDataUrl(finalDataUrl, filename);

  } catch (err: any) {
    console.error('Failed to export images:', err);
    alert(`匯出圖片失敗：${err.message || err}`);
  } finally {
    restoreFns.forEach(fn => fn());
    elements.forEach((el, i) => { el.style.cssText = originalStyles[i]; });
    allScrollContainers.forEach(containers => {
      containers.forEach(({ el, style }) => { el.style.cssText = style; });
    });
  }
};
