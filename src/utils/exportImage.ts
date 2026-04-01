import { toPng } from 'html-to-image';

export const exportComponentAsImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found:', elementId);
    return;
  }
  
  try {
    // 暫時將容器及內部滾動區域展開，以便捕捉完整內容
    const originalStyle = element.style.cssText;
    element.style.setProperty('height', 'max-content', 'important');
    element.style.setProperty('overflow', 'visible', 'important');
    
    // 找出內部的 overflow-auto 元素並展開
    const scrollContainers = element.querySelectorAll('.overflow-auto, .overflow-y-auto, .hide-scrollbar');
    const originalScrollStyles = Array.from(scrollContainers).map((el: any) => el.style.cssText);
    scrollContainers.forEach((el: any) => {
      el.style.setProperty('height', 'max-content', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('max-height', 'none', 'important');
    });

    // 等待 DOM 更新
    await new Promise(resolve => setTimeout(resolve, 100));

    // 計算適當的縮放比例 (避免 Canvas 過大導致 toDataURL 失敗)
    const targetHeight = element.scrollHeight;
    const pixelRatio = targetHeight > 8000 ? 1 : 2; 

    try {
      // 改用 html-to-image，原生支援 oklch 以及 Tailwind CSS v4 的所有新特性
      const dataUrl = await toPng(element, {
        backgroundColor: '#f7f9fc',
        pixelRatio: pixelRatio,
        width: element.scrollWidth,
        height: element.scrollHeight,
        style: {
          transform: 'none',
        }
      });
      
      const link = document.createElement('a');
      link.download = `${filename}_${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      // 復原 DOM 樣式
      element.style.cssText = originalStyle;
      scrollContainers.forEach((el: any, i) => {
        el.style.cssText = originalScrollStyles[i];
      });
    }
  } catch (err: any) {
    console.error('Failed to export image:', err);
    alert(`匯出圖片失敗：${err.message || err} \n請檢查 F12 主控台錯誤訊息。`);
  }
};
