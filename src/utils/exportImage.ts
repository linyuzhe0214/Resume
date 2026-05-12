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
  const isMobileOrTablet = /iPad|iPhone|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (!isMobileOrTablet) {
    for (let i = 0; i < dataUrls.length; i++) {
      const link = document.createElement('a');
      link.href = dataUrls[i];
      link.download = dataUrls.length > 1 ? `${filename}_第${i + 1}段_${new Date().getTime()}.png` : `${filename}_${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise(resolve => setTimeout(resolve, 600));
    }
    return;
  }

  // Tablet/Mobile behavior
  const showFallbackOverlay = () => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh;
      background: rgba(15, 23, 42, 0.98); z-index: 999999;
      display: flex; flex-direction: column; align-items: center;
      overflow-y: auto; padding: 2rem 1rem; overscroll-behavior: contain;
    `;
    
    const title = document.createElement('h3');
    title.innerText = '✅ 圖片生成成功！\n請長按下方圖片並選擇「儲存圖片」';
    title.style.cssText = 'color: white; font-size: 1.1rem; font-weight: 800; margin-bottom: 1.5rem; text-align: center; line-height: 1.5; flex-shrink: 0;';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerText = '我已經儲存了，關閉畫面';
    closeBtn.style.cssText = 'background: #3b82f6; color: white; border: none; padding: 1rem 2rem; border-radius: 99px; font-weight: 800; margin-bottom: 2rem; flex-shrink: 0; cursor: pointer; font-size: 1rem; box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);';
    closeBtn.onclick = () => document.body.removeChild(overlay);

    overlay.appendChild(title);
    overlay.appendChild(closeBtn);

    dataUrls.forEach((url, i) => {
      if (dataUrls.length > 1) {
        const label = document.createElement('div');
        label.innerText = `第 ${i + 1} 段圖片`;
        label.style.cssText = 'color: #94a3b8; font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: bold;';
        overlay.appendChild(label);
      }
      const img = document.createElement('img');
      img.src = url;
      img.style.cssText = 'max-width: 100%; border-radius: 12px; margin-bottom: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); user-select: auto; -webkit-user-select: auto; touch-action: auto; pointer-events: auto;';
      overlay.appendChild(img);
    });

    document.body.appendChild(overlay);
  };

  try {
    const files: File[] = [];
    dataUrls.forEach((dataUrl, index) => {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)![1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      const blob = new Blob([u8arr], { type: mime });
      const fileNameWithExt = dataUrls.length > 1 ? `${filename}_第${index + 1}段.png` : `${filename}.png`;
      files.push(new File([blob], fileNameWithExt, { type: mime }));
    });

    if (navigator.canShare && navigator.share && navigator.canShare({ files })) {
      await new Promise<void>((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh;
          background: rgba(15, 23, 42, 0.85); z-index: 999999;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          backdrop-filter: blur(8px);
        `;
        
        const card = document.createElement('div');
        card.style.cssText = `
          background: white; padding: 2.5rem 2rem; border-radius: 1.5rem; text-align: center;
          width: 90%; max-width: 320px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        `;
        
        const icon = document.createElement('div');
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
        icon.style.cssText = 'margin: 0 auto 1rem auto; background: #eff6ff; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center;';
        
        const titleEl = document.createElement('h3');
        titleEl.innerText = '圖片生成完畢';
        titleEl.style.cssText = 'margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 900; color: #0f172a;';
        
        const desc = document.createElement('p');
        desc.innerText = dataUrls.length > 1 ? `共生成了 ${dataUrls.length} 張分段圖片\n請點擊下方按鈕分享或儲存` : `請點擊下方按鈕分享或儲存`;
        desc.style.cssText = 'margin: 0 0 1.5rem 0; color: #64748b; font-size: 0.875rem; font-weight: 600; line-height: 1.5; white-space: pre-wrap;';
        
        const btn = document.createElement('button');
        btn.innerText = '立即儲存 / 分享';
        btn.style.cssText = `
          background: #2563eb; color: white; border: none; padding: 0.875rem;
          font-size: 1rem; border-radius: 0.75rem; cursor: pointer; font-weight: 800;
          width: 100%; transition: background 0.2s;
        `;
        
        const fallbackBtn = document.createElement('button');
        fallbackBtn.innerText = '分享沒反應？點此長按儲存';
        fallbackBtn.style.cssText = `
          background: transparent; color: #64748b; border: none; padding: 0.75rem;
          font-size: 0.875rem; border-radius: 0.75rem; cursor: pointer; font-weight: 700;
          width: 100%; margin-top: 0.5rem; text-decoration: underline;
        `;
        
        btn.onclick = async () => {
          try {
            await navigator.share({ files, title: filename });
            document.body.removeChild(overlay);
            resolve();
          } catch (e: any) {
            if (e.name !== 'AbortError') {
              document.body.removeChild(overlay);
              showFallbackOverlay();
              resolve();
            }
          }
        };
        
        fallbackBtn.onclick = () => {
          document.body.removeChild(overlay);
          showFallbackOverlay();
          resolve();
        };
        
        card.appendChild(icon);
        card.appendChild(titleEl);
        card.appendChild(desc);
        card.appendChild(btn);
        card.appendChild(fallbackBtn);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
      });
    } else {
      showFallbackOverlay();
    }
  } catch (e) {
    console.error('Mobile share setup failed:', e);
    showFallbackOverlay();
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
  const expandContainers = element.querySelectorAll('.overflow-auto, .overflow-y-auto, .overflow-x-auto, .hide-scrollbar, .overflow-hidden, .flex-1, .min-h-0');
  const originalExpandStyles = Array.from(expandContainers).map((el: any) => el.style.cssText);

  try {
    // 1. 簡單展開容器 (還原至原本不會出錯的寫法)
    element.style.setProperty('height', 'max-content', 'important');
    element.style.setProperty('width', 'max-content', 'important');
    element.style.setProperty('overflow', 'visible', 'important');
    // 強制桌面寬度避免跑版
    element.style.setProperty('min-width', '900px', 'important'); 
    
    expandContainers.forEach((el: any) => {
      el.style.setProperty('height', 'max-content', 'important');
      el.style.setProperty('min-height', 'max-content', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('flex', 'none', 'important');
      if (el.scrollTop) el.scrollTop = 0;
    });
    element.style.setProperty('flex', 'none', 'important');

    const stickyElements = element.querySelectorAll('.sticky');
    const originalStickyStyles = Array.from(stickyElements).map((el: any) => el.style.getPropertyValue('position'));
    stickyElements.forEach((el: any) => {
      el.style.setProperty('position', 'relative', 'important');
    });

    // 2. 轉換顏色為 RGB，避免 Tailwind v4 色彩解析失敗
    restoreColors = convertToComputedRgb(element);

    await new Promise(resolve => setTimeout(resolve, 50));

    const targetHeight = element.scrollHeight;
    const targetWidth = Math.max(element.scrollWidth, 900);
    const pixelRatio = targetHeight > 2000 ? 1 : 1.5; 
    const isMobileOrTablet = /iPad|iPhone|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // 超過 iOS/iPadOS 畫布上限時，自動分段下載
    const MAX_CANVAS_HEIGHT = 8000;
    const MAX_CHUNK_HEIGHT = Math.floor(MAX_CANVAS_HEIGHT / pixelRatio);

    if (isMobileOrTablet && targetHeight > MAX_CHUNK_HEIGHT) {
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
    expandContainers.forEach((el: any, i) => {
      el.style.cssText = originalExpandStyles[i];
    });
    stickyElements.forEach((el: any, i) => {
      if (originalStickyStyles[i]) {
        el.style.setProperty('position', originalStickyStyles[i]);
      } else {
        el.style.removeProperty('position');
      }
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
  const expandContainers = element.querySelectorAll('.overflow-auto, .overflow-y-auto, .overflow-x-auto, .hide-scrollbar, .overflow-hidden, .flex-1, .min-h-0');
  const originalExpandStyles = Array.from(expandContainers).map((el: any) => el.style.cssText);

  try {
    element.style.setProperty('height', 'max-content', 'important');
    element.style.setProperty('width', 'max-content', 'important');
    element.style.setProperty('overflow', 'visible', 'important');
    element.style.setProperty('min-width', '900px', 'important'); 
    
    expandContainers.forEach((el: any) => {
      el.style.setProperty('height', 'max-content', 'important');
      el.style.setProperty('min-height', 'max-content', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('flex', 'none', 'important');
      if (el.scrollTop) el.scrollTop = 0;
    });
    element.style.setProperty('flex', 'none', 'important');

    const stickyElements = element.querySelectorAll('.sticky');
    const originalStickyStyles = Array.from(stickyElements).map((el: any) => el.style.getPropertyValue('position'));
    stickyElements.forEach((el: any) => {
      el.style.setProperty('position', 'relative', 'important');
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
  } catch (err: any) {
    console.error('Failed to generate dataUrl:', err);
    alert(`匯出分段圖片失敗：${err.message || err}`);
    return null;
  } finally {
    if (restoreColors) restoreColors();
    element.style.cssText = originalStyle;
    expandContainers.forEach((el: any, i) => {
      el.style.cssText = originalExpandStyles[i];
    });
    stickyElements.forEach((el: any, i) => {
      if (originalStickyStyles[i]) {
        el.style.setProperty('position', originalStickyStyles[i]);
      } else {
        el.style.removeProperty('position');
      }
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
        el.style.setProperty('overflow', 'visible', 'important');
        el.style.setProperty('max-height', 'none', 'important');
        el.style.setProperty('flex', 'none', 'important');
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
    const isMobileOrTablet = /iPad|iPhone|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // 超過畫布上限時，自動分段匯出
    const MAX_CANVAS_HEIGHT = 8000;
    if (isMobileOrTablet && totalHeight > MAX_CANVAS_HEIGHT) {
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
