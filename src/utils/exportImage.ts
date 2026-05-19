/**
 * 匯出工具 — print-to-PDF 策略
 *
 * 核心：用 window.open + window.print，讓瀏覽器原生渲染
 * 避免 html2canvas 的 oklch 解析問題與 html-to-image 的 foreignObject 限制。
 *
 * 關鍵設計：
 * 1. 同時走 originalDOM 與 cloneDOM，依計算樣式決定如何處理每個元素
 * 2. scroll 容器 → overflow:visible + height=scrollHeight（展開全部內容）
 * 3. overflow:hidden 容器 → 只改 overflow，保留 height（不破壞 grid 高度計算）
 * 4. sticky → relative
 * 5. 完全不使用全域 CSS 覆蓋（避免誤傷）
 */

function prepareClone(original: HTMLElement): HTMLElement {
  const clone = original.cloneNode(true) as HTMLElement;

  const walk = (orig: HTMLElement, cloned: HTMLElement) => {
    const cs = window.getComputedStyle(orig);
    const ov = cs.overflow;
    const ovY = cs.overflowY;
    const ovX = cs.overflowX;

    const isScroll =
      ov === 'auto' || ov === 'scroll' ||
      ovY === 'auto' || ovY === 'scroll' ||
      ovX === 'auto' || ovX === 'scroll';

    const isHidden =
      ov === 'hidden' || ovY === 'hidden' || ovX === 'hidden';

    if (isScroll) {
      // 展開 scroll 容器：overflow visible + 完整高度
      cloned.style.setProperty('overflow', 'visible', 'important');
      cloned.style.setProperty('overflow-x', 'visible', 'important');
      cloned.style.setProperty('overflow-y', 'visible', 'important');
      cloned.style.setProperty('height', `${orig.scrollHeight}px`, 'important');
      cloned.style.setProperty('min-height', `${orig.scrollHeight}px`, 'important');
      cloned.style.setProperty('max-height', 'none', 'important');
      cloned.style.setProperty('flex', 'none', 'important');
    } else if (isHidden) {
      // overflow:hidden：只改 overflow，不動 height（避免破壞 grid row 高度）
      cloned.style.setProperty('overflow', 'visible', 'important');
      cloned.style.setProperty('overflow-x', 'visible', 'important');
      cloned.style.setProperty('overflow-y', 'visible', 'important');
      cloned.style.setProperty('max-height', 'none', 'important');
    }

    if (cs.position === 'sticky') {
      cloned.style.setProperty('position', 'relative', 'important');
    }

    // 隱藏 tooltip / fixed overlay
    if (cs.position === 'fixed') {
      cloned.style.setProperty('display', 'none', 'important');
    }

    // 遞迴
    const origKids = Array.from(orig.children) as HTMLElement[];
    const clonedKids = Array.from(cloned.children) as HTMLElement[];
    origKids.forEach((child, i) => {
      if (clonedKids[i]) walk(child, clonedKids[i]);
    });
  };

  walk(original, clone);
  return clone;
}

function collectAllCss(): string {
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((r) => r.cssText);
      } catch {
        const href = (sheet as CSSStyleSheet).href;
        return href ? [`@import url("${href}");`] : [];
      }
    })
    .join('\n');
}

function printElement(element: HTMLElement, title: string) {
  const clone = prepareClone(element);
  const css = collectAllCss();

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }
    @media print {
      @page { margin: 0; size: auto; }
    }
  </style>
  <style>${css}</style>
</head>
<body style="background:#fff;overflow:visible;">
${clone.outerHTML}
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1400,height=900');
  if (!win) {
    alert('請允許本頁彈出視窗（Pop-up），再重試一次。');
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  win.addEventListener('load', () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 600);
  });
}

// ─── 公開 API ─────────────────────────────────────────────────────────────────

export function exportComponentAsImage(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    alert(`找不到元素 #${elementId}，無法匯出。`);
    return;
  }
  printElement(element, filename);
}

export function exportMultipleAsImage(elementIds: string[], filename: string) {
  const elements = elementIds
    .map((id) => document.getElementById(id))
    .filter(Boolean) as HTMLElement[];

  if (elements.length === 0) {
    alert('找不到任何可匯出的元素。');
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex-direction:column;background:#fff;';
  elements.forEach((el) => wrapper.appendChild(prepareClone(el)));

  // wrapper 沒有 original 可走，直接用 printElement 的 clone 參數版
  const css = collectAllCss();
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <title>${filename}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin:0; padding:0; background:#fff;
      -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    @media print { @page { margin:0; size:auto; } }
  </style>
  <style>${css}</style>
</head>
<body style="background:#fff;overflow:visible;">
${wrapper.outerHTML}
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1400,height=900');
  if (!win) { alert('請允許本頁彈出視窗（Pop-up），再重試一次。'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.addEventListener('load', () => {
    setTimeout(() => { win.focus(); win.print(); }, 600);
  });
}
