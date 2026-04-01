import html2canvas from 'html2canvas';

export const exportComponentAsImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found:', elementId);
    return;
  }
  
  try {
    // Add a temporary class to ensure the element is visible and properly styled during capture
    const originalStyle = element.style.cssText;
    
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution
      useCORS: true,
      backgroundColor: '#f7f9fc',
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });
    
    const image = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = `${filename}_${new Date().getTime()}.png`;
    link.href = image;
    link.click();
  } catch (err) {
    console.error('Failed to export image', err);
    alert('匯出圖片失敗，請檢查主控台錯誤訊息');
  }
};
