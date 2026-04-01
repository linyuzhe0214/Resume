import html2canvas from 'html2canvas';

export const exportComponentAsImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found:', elementId);
    return;
  }
  
  try {
    // 暫時將容器及內部滾動區域展開，以便 html2canvas 捕捉完整內容
    const originalStyle = element.style.cssText;
    element.style.setProperty('height', 'max-content', 'important');
    element.style.setProperty('overflow', 'visible', 'important');
    
    // 找出內部的 overflow-auto 元素並展開
    const scrollContainers = element.querySelectorAll('.overflow-auto, .overflow-y-auto');
    const originalScrollStyles = Array.from(scrollContainers).map((el: any) => el.style.cssText);
    scrollContainers.forEach((el: any) => {
      el.style.setProperty('height', 'max-content', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
    });

    // 等待 DOM 更新
    await new Promise(resolve => setTimeout(resolve, 100));

    // 計算適當的縮放比例 (避免 Canvas 過大導致 toDataURL 失敗)
    const targetHeight = element.scrollHeight;
    const scale = targetHeight > 8000 ? 1 : 2; 

    try {
      const canvas = await html2canvas(element, {
        scale: scale,
        useCORS: true,
        backgroundColor: '#f7f9fc',
        logging: true, // 開啟 log 幫助除錯
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `${filename}_${new Date().getTime()}.png`;
      link.href = image;
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
