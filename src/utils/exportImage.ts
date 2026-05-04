import { toPng } from 'html-to-image';

/**
 * 遍歷元素及其子元素，將所有計算後的顏色（包含 oklch, oklab 等）強行轉換為 RGB 內嵌樣式。
 * 解決 Tailwind v4 新顏色格式在 html-to-image 無法解析的問題。
 */
const convertToComputedRgb = (element: HTMLElement) => {
  const elements = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
  const savedStyles: Array<{ el: HTMLElement; style: string }> = [];
  const updates: Array<{ el: HTMLElement; prop: string; value: string }> = [];

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
 * 下載單一或多個檔案 — 使用 Blob URL 解決手機版無法下載或預覽的問題
 * 支援一次分享多個檔案（針對 iOS/iPadOS 自動分段）
 */
export const downloadDataUrls = async (dataUrls: string[], filename: string) => {
  try {
    const files: File[] = [];
    const blobUrls: string[] = [];

    dataUrls.forEach((dataUrl, index) => {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)![1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      const blob = new Blob([u8arr], { type: mime });
      
      const fileNameWithExt = dataUrls.length > 1 
        ? `${filename}_第${index + 1}段_${new Date().getTime()}.png`
        : `${filename}_${new Date().getTime()}.png`;
      
      files.push(new File([blob], fileNameWithExt, { type: mime }));
    });

    // 優先使用 Web Share API 一次分享所有檔案 (解決 iOS/iPadOS/Android 無法直接下載的問題)
    if (navigator.canShare && navigator.share) {
      if (navigator.canShare({ files })) {
        try {
          await navigator.share({
            files,
            title: filename,
          });
          return; // 成功分享/儲存後返回
        } catch (shareErr: any) {
          if (shareErr.name !== 'AbortError') {
            console.error('Share failed:', shareErr);
          }
          // 若失敗或取消，則 fallback 到傳統下載
        }
      }
    }

    // Fallback 到傳統下載 (循序下載)
    for (const file of files) {
      const blobUrl = URL.createObjectURL(file);
      blobUrls.push(blobUrl);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 稍微等待一下，避免瀏覽器阻擋多重下載
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 稍後釋放 object URL
    setTimeout(() => {
      blobUrls.forEach(url => URL.revokeObjectURL(url));
    }, 10000);

  } catch (e) {
    // 極端 fallback
    for (let i = 0; i < dataUrls.length; i++) {
      const link = document.createElement('a');
      link.href = dataUrls[i];
      link.download = dataUrls.length > 1 ? `${filename}_第${i + 1}段_${new Date().getTime()}.png` : `${filename}_${new Date().getTime()}.png`;
      link.click();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
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
    // 1. 簡單展開容器 (還原至原本不會出錯的寫法)
    element.style.setProperty('height', 'max-content', 'important');
    element.style.setProperty('width', 'max-content', 'important');
    element.style.setProperty('overflow', 'visible', 'important');
    // 強制桌面寬度避免跑版
    element.style.setProperty('min-width', '900px', 'important'); 
    
    scrollContainers.forEach((el: any) => {
      el.style.setProperty('height', 'max-content', 'important');
      el.style.setProperty('width', 'max-content', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('max-width', 'none', 'important');
    });

    // 2. 轉換顏色為 RGB，避免 Tailwind v4 色彩解析失敗
    restoreColors = convertToComputedRgb(element);

    await new Promise(resolve => setTimeout(resolve, 50));

    const targetHeight = element.scrollHeight;
    const targetWidth = Math.max(element.scrollWidth, 900);
    const pixelRatio = targetHeight > 2000 ? 1 : 1.5; 

    // 超過 iOS/iPadOS 畫布上限時，自動分段下載
    const MAX_CANVAS_HEIGHT = 8000;
    const MAX_CHUNK_HEIGHT = Math.floor(MAX_CANVAS_HEIGHT / pixelRatio);

    if (targetHeight > MAX_CHUNK_HEIGHT) {
      alert(`⚠️ 圖片長度過大，為避免設備記憶體不足，系統將自動為您分段匯出成多張圖片。`);
      const parts = Math.ceil(targetHeight / MAX_CHUNK_HEIGHT);
      const dataUrls: string[] = [];
      
      for (let i = 0; i < parts; i++) {
        const currentChunkHeight = Math.min(MAX_CHUNK_HEIGHT, targetHeight - i * MAX_CHUNK_HEIGHT);
        const dataUrl = await toPng(element, {
          backgroundColor: '#ffffff',
          pixelRatio: pixelRatio,
          width: targetWidth,
          height: currentChunkHeight,
          skipFonts: true,
          style: {
            transform: `translateY(-${i * MAX_CHUNK_HEIGHT}px)`,
            transition: 'none'
          }
        });
        dataUrls.push(dataUrl);
        // 等待一下讓瀏覽器有時間釋放記憶體
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      await downloadDataUrls(dataUrls, filename);
      return;
    }

    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: pixelRatio,
      width: targetWidth,
      height: targetHeight,
      skipFonts: true,
      style: {
        transform: 'none',
        transition: 'none'
      }
    });

    await downloadDataUrls([dataUrl], filename);

  } catch (err: any) {
    console.error('Failed to export image:', err);
    const errMsg = (err instanceof Event) ? '處理圖片時發生不明的 Event 錯誤（通常為設備記憶體不足或跨域資源限制）' : (err.message || err);
    alert(`匯出圖片失敗：${errMsg}`);
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
 * 將指定 DOM 元素匯出為單一 Base64 圖片 (不自動下載，用於 React 狀態分段渲染)
 */
export const exportComponentAsDataUrl = async (elementId: string): Promise<string | null> => {
  const element = document.getElementById(elementId);
  if (!element) return null;
  
  let restoreColors: (() => void) | null = null;
  const originalStyle = element.style.cssText;
  const scrollContainers = element.querySelectorAll('.overflow-auto, .overflow-y-auto, .overflow-x-auto, .hide-scrollbar');
  const originalScrollStyles = Array.from(scrollContainers).map((el: any) => el.style.cssText);

  try {
    element.style.setProperty('height', 'max-content', 'important');
    element.style.setProperty('width', 'max-content', 'important');
    element.style.setProperty('overflow', 'visible', 'important');
    element.style.setProperty('min-width', '900px', 'important'); 
    
    scrollContainers.forEach((el: any) => {
      el.style.setProperty('height', 'max-content', 'important');
      el.style.setProperty('width', 'max-content', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('max-width', 'none', 'important');
    });

    restoreColors = convertToComputedRgb(element);
    await new Promise(resolve => setTimeout(resolve, 50));

    const targetHeight = element.scrollHeight;
    const targetWidth = Math.max(element.scrollWidth, 900);
    const pixelRatio = targetHeight > 2000 ? 1 : 1.5; 

    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: pixelRatio,
      width: targetWidth,
      height: targetHeight,
      skipFonts: true,
      style: {
        transform: 'none',
        transition: 'none'
      }
    });

    return dataUrl;
  } catch (err) {
    console.error('Failed to generate dataUrl:', err);
    return null;
  } finally {
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

  // 強制桌面版 layout
  const mobileCards = Array.from(document.querySelectorAll('.lg\\:hidden')) as HTMLElement[];
  const desktopTables = Array.from(document.querySelectorAll('.hidden.lg\\:block')) as HTMLElement[];
  const savedMobile: string[] = mobileCards.map(el => el.style.display);
  const savedDesktop: string[] = desktopTables.map(el => el.style.display);

  mobileCards.forEach(el => el.style.setProperty('display', 'none', 'important'));
  desktopTables.forEach(el => el.style.setProperty('display', 'block', 'important'));

  try {
    elements.forEach((element, idx) => {
      const scrollContainers = element.querySelectorAll('.overflow-auto, .overflow-y-auto, .overflow-x-auto, .hide-scrollbar');
      const saved = Array.from(scrollContainers).map((el: any) => ({ el, style: el.style.cssText }));
      allScrollContainers.push(saved);

      element.style.setProperty('height', 'max-content', 'important');
      element.style.setProperty('width', 'max-content', 'important');
      element.style.setProperty('overflow', 'visible', 'important');
      element.style.setProperty('min-width', '900px', 'important');
      scrollContainers.forEach((el: any) => {
        el.style.setProperty('height', 'max-content', 'important');
        el.style.setProperty('width', 'max-content', 'important');
        el.style.setProperty('overflow', 'visible', 'important');
        el.style.setProperty('max-height', 'none', 'important');
        el.style.setProperty('max-width', 'none', 'important');
      });

      restoreFns.push(convertToComputedRgb(element));
    });

    await new Promise(resolve => setTimeout(resolve, 80));

    const FIXED_WIDTH = Math.max(...elements.map(el => Math.max(el.scrollWidth, 900)));
    const totalRawHeight = elements.reduce((acc, el) => acc + el.scrollHeight, 0);
    const pixelRatio = (FIXED_WIDTH * totalRawHeight) > 3000000 ? 1 : 1.5;
    
    // 改為循序產生圖片，避免 Promise.all 造成平板記憶體瞬間爆炸 (OOM)
    const images: HTMLImageElement[] = [];
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const url = await toPng(el, {
        backgroundColor: '#ffffff',
        pixelRatio: pixelRatio,
        width: FIXED_WIDTH,
        height: el.scrollHeight,
        skipFonts: true,
        style: { transform: 'none', transition: 'none' }
      });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`第 ${i + 1} 個區塊合併時發生錯誤，可能因為圖片過大超出平板記憶體限制。`));
        img.src = url;
      });
      images.push(img);
      // 暫停一下讓記憶體釋放
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const totalHeight = images.reduce((acc, img, i) => acc + elements[i].scrollHeight * pixelRatio, 0);
    
    // 超過畫布上限時，自動分段匯出
    const MAX_CANVAS_HEIGHT = 8000;
    if (totalHeight > MAX_CANVAS_HEIGHT) {
      alert(`⚠️ 圖片長度過大，系統將自動為您分段匯出成多張圖片。`);
      let currentCanvasImages: {img: HTMLImageElement, height: number}[] = [];
      let currentCanvasH = 0;
      const finalDataUrls: string[] = [];
      
      for (let i = 0; i < images.length; i++) {
        const imgH = elements[i].scrollHeight * pixelRatio;
        // 如果加入這張圖會超過限制，且目前已經有圖片，就先匯出目前的
        if (currentCanvasH + imgH > MAX_CANVAS_HEIGHT && currentCanvasImages.length > 0) {
           const canvas = document.createElement('canvas');
           canvas.width = FIXED_WIDTH * pixelRatio;
           canvas.height = currentCanvasH;
           const ctx = canvas.getContext('2d')!;
           ctx.fillStyle = '#ffffff';
           ctx.fillRect(0, 0, canvas.width, canvas.height);
           let y = 0;
           currentCanvasImages.forEach(({img, height}) => {
             ctx.drawImage(img, 0, y);
             y += height;
           });
           finalDataUrls.push(canvas.toDataURL('image/png'));
           currentCanvasImages = [];
           currentCanvasH = 0;
        }
        currentCanvasImages.push({img: images[i], height: imgH});
        currentCanvasH += imgH;
      }
      
      // 匯出最後剩餘的
      if (currentCanvasImages.length > 0) {
         const canvas = document.createElement('canvas');
         canvas.width = FIXED_WIDTH * pixelRatio;
         canvas.height = currentCanvasH;
         const ctx = canvas.getContext('2d')!;
         ctx.fillStyle = '#ffffff';
         ctx.fillRect(0, 0, canvas.width, canvas.height);
         let y = 0;
         currentCanvasImages.forEach(({img, height}) => {
           ctx.drawImage(img, 0, y);
           y += height;
         });
         finalDataUrls.push(canvas.toDataURL('image/png'));
      }
      
      await downloadDataUrls(finalDataUrls, filename);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = FIXED_WIDTH * pixelRatio;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let y = 0;
    images.forEach((img, i) => {
      ctx.drawImage(img, 0, y);
      y += elements[i].scrollHeight * pixelRatio;
    });

    const finalDataUrl = canvas.toDataURL('image/png');
    await downloadDataUrls([finalDataUrl], filename);

  } catch (err: any) {
    console.error('Failed to export images:', err);
    const errMsg = (err instanceof Event) ? '處理圖片時發生不明的 Event 錯誤（通常為設備記憶體不足或跨域資源限制）' : (err.message || err);
    alert(`匯出圖片失敗：${errMsg}`);
  } finally {
    restoreFns.forEach(fn => fn());
    elements.forEach((el, i) => { el.style.cssText = originalStyles[i]; });
    allScrollContainers.forEach(containers => {
      containers.forEach(({ el, style }) => { el.style.cssText = style; });
    });
    mobileCards.forEach((el, i) => { el.style.display = savedMobile[i]; });
    desktopTables.forEach((el, i) => { el.style.display = savedDesktop[i]; });
  }
};
