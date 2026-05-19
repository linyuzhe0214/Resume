/**
 * 匯出工具 — 以 print-to-PDF 為核心
 *
 * 為什麼不用 html2canvas / html-to-image：
 *   - html2canvas 有內建 CSS parser，遇到 oklch/oklab 就 throw
 *   - html-to-image 用 SVG foreignObject，在 Chrome 對 oklch 的支援存在渲染問題
 *
 * 新策略：
 *   1. 把目標 element 的 outerHTML 連同所有 stylesheet 貼進新視窗
 *   2. 套用 print-optimized CSS（白底、無邊距、exact color）
 *   3. 呼叫 window.print()，瀏覽器原生渲染 → 另存為 PDF
 *
 * 優點：
 *   - 零 CSS 解析：由瀏覽器自己算，oklch/oklab/color() 全部正確
 *   - 無 Canvas 尺寸限制：pdf 可以任意長
 *   - 顏色完全保真（-webkit-print-color-adjust: exact）
 */

/** 把所有 stylesheet rules 抽出成 CSS 文字（跨 origin 忽略）*/
function collectAllCss(): string {
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((r) => r.cssText);
      } catch {
        // cross-origin stylesheet：改用 <link> 帶入
        const href = (sheet as CSSStyleSheet).href;
        return href ? [`@import url("${href}");`] : [];
      }
    })
    .join('\n');
}

/**
 * 核心匯出：把 element 完整內容開新視窗列印（→ PDF）
 * @param element  要匯出的 DOM 元素
 * @param title    新視窗標題（也作為 PDF 預設檔名）
 * @param extraCss 額外注入的 CSS（可用於調整印刷版面）
 */
function printElement(element: HTMLElement, title: string, extraCss = '') {
  // 展開 overflow / height 限制以取得完整 outerHTML
  const clone = element.cloneNode(true) as HTMLElement;

  // 移除 overflow hidden / max-height，讓 clone 完整顯示
  const removeScrollLimits = (el: HTMLElement) => {
    el.style.removeProperty('overflow');
    el.style.removeProperty('max-height');
    el.style.removeProperty('height');
    el.style.setProperty('overflow', 'visible');
    el.querySelectorAll<HTMLElement>('*').forEach((child) => {
      const cs = window.getComputedStyle(child);
      if (
        cs.overflow === 'hidden' ||
        cs.overflowY === 'hidden' ||
        cs.overflowX === 'hidden'
      ) {
        child.style.setProperty('overflow', 'visible', 'important');
        child.style.setProperty('max-height', 'none', 'important');
        child.style.setProperty('height', 'auto', 'important');
      }
    });
  };
  removeScrollLimits(clone);

  const css = collectAllCss();

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    /* ── reset ── */
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }
    /* ── print page ── */
    @media print {
      @page { margin: 0; size: auto; }
      body { background: #fff !important; }
      /* 移除互動用 class 對應的 height/overflow 限制 */
      .overflow-hidden, .overflow-auto, .overflow-y-auto,
      .flex-1, .min-h-0, [class*="h-full"], [class*="max-h-"] {
        overflow: visible !important;
        max-height: none !important;
        height: auto !important;
        flex: none !important;
      }
      .sticky, [class*="sticky"] {
        position: relative !important;
      }
      /* 隱藏非列印用元件 */
      button, .fixed, [class*="z-50"], [class*="z-["] {
        display: none !important;
      }
    }
    /* ── screen preview ── */
    body {
      overflow: visible !important;
    }
    .overflow-hidden, .overflow-auto, .overflow-y-auto,
    .flex-1, .min-h-0, [class*="h-full"], [class*="max-h-"] {
      overflow: visible !important;
      max-height: none !important;
      height: auto !important;
      flex: none !important;
    }
    .sticky, [class*="sticky"] {
      position: relative !important;
    }
    button, .fixed { display: none !important; }
    ${extraCss}
  </style>
  <style id="app-styles">
    ${css}
  </style>
</head>
<body>
${clone.outerHTML}
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1200,height=900');
  if (!win) {
    alert('請允許本頁彈出視窗（Pop-up），再重試一次。');
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  // 等字型/圖片載入後再 print
  win.addEventListener('load', () => {
    setTimeout(() => {
      win.focus();
      win.print();
      // print dialog 關閉後不自動 close，讓使用者確認結果
    }, 500);
  });
}

// ─── 公開 API ─────────────────────────────────────────────────────────────────

/**
 * 匯出單一元素（by id）為 PDF
 */
export function exportComponentAsImage(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('exportComponentAsImage: Element not found:', elementId);
    alert(`找不到元素 #${elementId}，無法匯出。`);
    return;
  }
  printElement(element, filename);
}

/**
 * 匯出多個元素（by ids）垂直拼接為 PDF
 */
export function exportMultipleAsImage(elementIds: string[], filename: string) {
  const elements = elementIds
    .map((id) => document.getElementById(id))
    .filter(Boolean) as HTMLElement[];

  if (elements.length === 0) {
    console.error('exportMultipleAsImage: No elements found:', elementIds);
    alert('找不到任何可匯出的元素。');
    return;
  }

  // 建立容器把所有 element clone 垂直排列
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex-direction:column;gap:0;background:#fff;';
  elements.forEach((el) => {
    wrapper.appendChild(el.cloneNode(true));
  });

  printElement(wrapper, filename);
}
