// ===== 主線 GAS 腳本 (多工作表版本 + 支援高速分塊快取) =====
// 貼到 MAINLINE_URL 對應的 Apps Script 專案

// SECURITY: 合法工作表名稱白名單（防止任意 insertSheet DoS）
// 請在 Script Properties 設定 API_TOKEN
const MAINLINE_ALLOWED_SHEETS = new Set([
  'Mainline', '國道1號', '國道2號', '國道3號', '國道3甲',
  '國道4號', '國道5號', '國道6號', '國道8號', '國道10號',
]);

const CACHE_KEY_MAINLINE = 'cache_getMainline';
const CACHE_TTL_SECONDS = 21600; // 6 小時

function isAuthorized_(payload) {
  const token = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  // 若未設定 API_TOKEN，預設拒絕所有寫入請求
  if (!token) return false;
  return payload && payload.token === token;
}

function doGet(e) {
  const action = e.parameter.action;
  const nocache = e.parameter.nocache === '1' || e.parameter.nocache === 'true';
  try {
    if (action === 'getMainline') {
      // 1. 若未指定 nocache，優先從 Apps Script CacheService 秒讀
      if (!nocache) {
        const cached = getLargeCache(CACHE_KEY_MAINLINE);
        if (cached !== null) {
          return jsonResponse(cached);
        }
      }
      // 2. Cache miss 或 nocache=1：從試算表讀取並更新快取
      const records = getAllRecords();
      setLargeCache(CACHE_KEY_MAINLINE, records, CACHE_TTL_SECONDS);
      return jsonResponse(records);
    }
    return jsonResponse({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents || e.postData.contents.length > 500000) {
      return jsonResponse({ error: 'Invalid or oversized payload' });
    }
    const payload = JSON.parse(e.postData.contents);

    // SECURITY FINDING-01: 鑑權驗證，拒絕未攜帶有效 token 的請求
    if (!isAuthorized_(payload)) {
      return jsonResponse({ error: 'Unauthorized' });
    }

    const action = payload.action;
    const sheetName = payload.sheetName; // 從前端傳遞過來 (如 "國道1號")

    let result;
    if (action === 'saveMainline') {
      result = save(payload.record, sheetName);
      clearLargeCache(CACHE_KEY_MAINLINE);
      return result;
    } else if (action === 'deleteMainline') {
      result = remove(payload.id, sheetName);
      clearLargeCache(CACHE_KEY_MAINLINE);
      return result;
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
function getAllRecords() {
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

  return allRecords;
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

// ─── 高效能分塊快取（Chunked Cache）機制 ───────────────────
function setLargeCache(key, dataObj, ttl) {
  var cache = CacheService.getScriptCache();
  var json = JSON.stringify(dataObj);
  var chunkSize = 90000;
  var count = Math.ceil(json.length / chunkSize);
  var cacheObj = {};
  cacheObj[key + '_count'] = String(count);
  for (var i = 0; i < count; i++) {
    cacheObj[key + '_' + i] = json.slice(i * chunkSize, (i + 1) * chunkSize);
  }
  try {
    cache.putAll(cacheObj, ttl || 21600);
  } catch (e) {
    console.warn('Cache put failed', e);
  }
}

function getLargeCache(key) {
  var cache = CacheService.getScriptCache();
  var countStr = cache.get(key + '_count');
  if (!countStr) return null;
  var count = parseInt(countStr, 10);
  var keys = [];
  for (var i = 0; i < count; i++) {
    keys.push(key + '_' + i);
  }
  var chunks = cache.getAll(keys);
  var json = '';
  for (var i = 0; i < count; i++) {
    var chunk = chunks[key + '_' + i];
    if (!chunk) return null;
    json += chunk;
  }
  try {
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function clearLargeCache(key) {
  var cache = CacheService.getScriptCache();
  try {
    var countStr = cache.get(key + '_count');
    if (countStr) {
      var count = parseInt(countStr, 10);
      var keys = [key + '_count'];
      for (var i = 0; i < count; i++) {
        keys.push(key + '_' + i);
      }
      cache.removeAll(keys);
    }
    cache.remove(key);
  } catch (_) {}
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
