// ===== 匝道 GAS 腳本 =====
// 貼到 RAMP_URL 對應的 Apps Script 專案

const SHEET_NAME = 'Ramp';

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'getRamp') {
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

    if (action === 'saveRamp') {
      return save(payload.record);
    } else if (action === 'deleteRamp') {
      return remove(payload.id);
    }
    return jsonResponse({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function getAll() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) return jsonResponse([]);

  const data = sheet.getRange(1, 1, lastRow, 1).getValues();
  const records = [];
  for (let i = 0; i < data.length; i++) {
    try {
      if (data[i][0]) records.push(JSON.parse(data[i][0]));
    } catch (e) { /* skip malformed rows */ }
  }
  return jsonResponse(records);
}

function save(record) {
  if (!record || !record.id) return jsonResponse({ error: 'Missing record.id' });
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  // 嘗試找到現有 row 更新
  if (lastRow > 0) {
    const data = sheet.getRange(1, 1, lastRow, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      try {
        const row = JSON.parse(data[i][0]);
        if (row.id === record.id) {
          sheet.getRange(i + 1, 1).setValue(JSON.stringify(record));
          return jsonResponse({ success: true, action: 'updated', id: record.id });
        }
      } catch (e) { /* skip */ }
    }
  }

  // 找不到就新增
  sheet.appendRow([JSON.stringify(record)]);
  return jsonResponse({ success: true, action: 'inserted', id: record.id });
}

function remove(id) {
  if (!id) return jsonResponse({ error: 'Missing id' });
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) return jsonResponse({ success: true });

  const data = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    try {
      const row = JSON.parse(data[i][0]);
      if (row.id === id) {
        sheet.deleteRow(i + 1);
        return jsonResponse({ success: true, action: 'deleted', id });
      }
    } catch (e) { /* skip */ }
  }
  return jsonResponse({ success: true, action: 'not_found', id });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
