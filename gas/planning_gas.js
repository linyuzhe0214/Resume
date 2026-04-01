// ===== 整修規劃 GAS 腳本 (多工作表版本) =====
// 貼到 PLANNING_URL 對應的 Apps Script 專案

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'getPlanning') {
      return getAll();
    }
    return jsonResponse({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const sheetName = payload.sheetName; // 從前端傳遞過來 (如 "國道1號")

    if (action === 'savePlanning') {
      return save(payload.record, sheetName);
    } else if (action === 'deletePlanning') {
      return remove(payload.id, sheetName);
    }
    return jsonResponse({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetName = name || 'Planning';
  let sheet = ss.getSheetByName(targetName);
  if (!sheet) {
    sheet = ss.insertSheet(targetName);
  }
  return sheet;
}

/**
 * 讀取試算表中所有的工作表並彙整資料
 */
function getAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const allRecords = [];

  sheets.forEach(sheet => {
    const lastRow = sheet.getLastRow();
    if (lastRow === 0) return;

    const data = sheet.getRange(1, 1, lastRow, 1).getValues();
    for (let i = 0; i < data.length; i++) {
        try {
            if (data[i][0]) {
                const record = JSON.parse(data[i][0]);
                allRecords.push(record);
            }
        } catch (e) {
            // 跳過非 JSON 格式的行
        }
    }
  });

  return jsonResponse(allRecords);
}

/**
 * 在指定工作表中儲存資料 (Upsert)
 */
function save(record, sheetName) {
  if (!record || !record.id) return jsonResponse({ error: 'Missing record.id' });
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();

  // 嘗試在目標分頁找到現有 row 更新
  if (lastRow > 0) {
    const data = sheet.getRange(1, 1, lastRow, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      try {
        const row = JSON.parse(data[i][0]);
        if (row.id === record.id) {
          sheet.getRange(i + 1, 1).setValue(JSON.stringify(record));
          return jsonResponse({ success: true, action: 'updated', id: record.id, sheet: sheet.getName() });
        }
      } catch (e) { /* skip */ }
    }
  }

  // 找不到就新增
  sheet.appendRow([JSON.stringify(record)]);
  return jsonResponse({ success: true, action: 'inserted', id: record.id, sheet: sheet.getName() });
}

/**
 * 在指定工作表中刪除資料
 */
function remove(id, sheetName) {
  if (!id) return jsonResponse({ error: 'Missing id' });
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) return jsonResponse({ success: true, action: 'no_rows' });

  const data = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    try {
      const row = JSON.parse(data[i][0]);
      if (row.id === id) {
        sheet.deleteRow(i + 1);
        return jsonResponse({ success: true, action: 'deleted', id, sheet: sheet.getName() });
      }
    } catch (e) { /* skip */ }
  }
  return jsonResponse({ success: true, action: 'not_found', id, sheet: sheet.getName() });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
