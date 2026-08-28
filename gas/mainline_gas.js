// ===== 主線 GAS 腳本 (多工作表版本) =====
// 貼到 MAINLINE_URL 對應的 Apps Script 專案

// SECURITY: 合法工作表名稱白名單（防止任意 insertSheet DoS）
// 請在 Script Properties 設定 API_TOKEN
const MAINLINE_ALLOWED_SHEETS = new Set([
  'Mainline', '國道1號', '國道2號', '國道3號', '國道3甲',
  '國道4號', '國道5號', '國道6號', '國道8號', '國道10號',
]);

function isAuthorized_(payload) {
  const token = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  // 若未設定 API_TOKEN，預設拒絕所有寫入請求
  if (!token) return false;
  return payload && payload.token === token;
}

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'getMainline') {
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

    // SECURITY FINDING-01: 鑑權驗證，拒絕未攜帶有效 token 的請求
    if (!isAuthorized_(payload)) {
      return jsonResponse({ error: 'Unauthorized' });
    }

    const action = payload.action;
    const sheetName = payload.sheetName; // 從前端傳遞過來 (如 "國道1號")

    if (action === 'saveMainline') {
      return save(payload.record, sheetName);
    } else if (action === 'deleteMainline') {
      return remove(payload.id, sheetName);
    }
    return jsonResponse({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // SECURITY FINDING-02: 僅允許白名單內的工作表名稱，防止任意建表 DoS
  const targetName = (name && MAINLINE_ALLOWED_SHEETS.has(name)) ? name : 'Mainline';
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
