/**
 * Apps Script para persistir órdenes de MP en una pestaña "Órdenes" del Sheet,
 * DESCONTAR el stock vendido y disparar un redeploy del sitio.
 *
 * Setup:
 * 1. Abrir el Google Sheet → Extensiones → Apps Script.
 * 2. Pegar este código.
 * 3. Crear pestaña "Órdenes" (si no existe). La primera fila se autollena con headers
 *    en el primer POST si está vacía.
 * 4. Completar la CONFIG de abajo (token, IDs, URL del sitio, publish secret).
 * 5. Implementar → Nueva implementación → Tipo "App web":
 *    - Ejecutar como: yo
 *    - Quién tiene acceso: Cualquier persona
 * 6. Copiar la URL y pegarla como ORDERS_WEBHOOK_URL en Vercel.
 *
 * Idempotencia: si llega un paymentId que ya está en la columna A, se ignora
 * (no se vuelve a appendear NI a descontar stock).
 */

// ── CONFIG ───────────────────────────────────────────────────────────────────
const ORDERS_TOKEN = "CAMBIAR_POR_EL_MISMO_VALOR_QUE_ORDERS_WEBHOOK_TOKEN";

// Planilla y pestaña donde vive el stock (columnas: productId, variantId, stock).
// STOCK_SHEET_ID = el ID de la planilla de Stock (la parte entre /d/ y /edit en la URL).
//   - Modo 3 Sheets separados: poné el ID del Sheet de Stock.
//   - Modo 1 Sheet con 3 pestañas: poné el ID de ese Sheet.
// Si lo dejás vacío, usa la planilla activa (la que contiene este script).
const STOCK_SHEET_ID = "";
const STOCK_TAB_NAME = "Stock";

// Auto-republish: tras descontar, dispara un redeploy para que la web muestre el
// stock nuevo. Dejá SITE_URL vacío para desactivar el republish automático.
const SITE_URL = ""; // ej. "https://thedewedit.ar" (sin barra final)
const PUBLISH_SECRET = "CAMBIAR_POR_EL_MISMO_VALOR_QUE_PUBLISH_SECRET_EN_VERCEL";
// ──────────────────────────────────────────────────────────────────────────────

const SHEET_NAME = "Órdenes";

const HEADERS = [
  "paymentId",
  "createdAt",
  "approvedAt",
  "status",
  "statusDetail",
  "amount",
  "currency",
  "paymentMethod",
  "installments",
  "payerEmail",
  "payerName",
  "payerPhone",
  "shippingAddress",
  "shippingZip",
  "items",
  "preferenceId",
];

function doPost(e) {
  // Serializa webhooks concurrentes: evita que dos pagos pisen el read-modify-write
  // del stock y garantiza idempotencia (dedup + append + descuento atómicos).
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return jsonOut({ ok: false, error: "busy" });
  }

  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== ORDERS_TOKEN) {
      return jsonOut({ ok: false, error: "unauthorized" });
    }

    const order = body.order || {};
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }

    // Idempotencia: buscar paymentId en columna A
    const ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
    const exists = ids.some(function (r) {
      return String(r[0]) === String(order.paymentId);
    });
    if (exists) {
      return jsonOut({ ok: true, duplicate: true });
    }

    const itemsStr = (order.items || [])
      .map(function (it) {
        return it.quantity + "x " + it.title + " ($" + it.unitPrice + ")";
      })
      .join(" | ");

    // Append PRIMERO (es el marcador de idempotencia). Si algo falla después,
    // un reintento de MP se deduplica → preferimos descontar de menos que de más.
    sheet.appendRow([
      order.paymentId, order.createdAt, order.approvedAt, order.status,
      order.statusDetail, order.amount, order.currency, order.paymentMethod,
      order.installments, order.payerEmail, order.payerName, order.payerPhone,
      order.shippingAddress, order.shippingZip, itemsStr, order.preferenceId,
    ]);
    const orderRow = sheet.getLastRow();

    // Descontar stock. Si algún ítem quedó en negativo (sobreventa), lo marcamos
    // en la propia orden para que lo veas y puedas resolverlo (refund/contacto).
    var stockResult = decrementStock(order.items || []);
    if (stockResult.oversold && stockResult.oversold.length > 0) {
      var warn = " | ⚠️ FALTÓ STOCK: " + stockResult.oversold.join(", ");
      var itemsCol = HEADERS.indexOf("items") + 1;
      sheet.getRange(orderRow, itemsCol).setValue(itemsStr + warn);
    }

    triggerRepublish();

    return jsonOut({ ok: true, stock: stockResult });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Descuenta del stock las unidades vendidas. Cada item.id viene como
 * "productId" o "productId::variantId" (las líneas de envío u otras que no
 * matcheen una fila de Stock se ignoran). Nunca baja de 0.
 */
function decrementStock(items) {
  if (!items || items.length === 0) return { updated: 0 };

  const ss = STOCK_SHEET_ID ? SpreadsheetApp.openById(STOCK_SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(STOCK_TAB_NAME);
  if (!sheet) return { updated: 0, error: "no_stock_tab" };

  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return { updated: 0 };

  const header = values[0].map(function (h) { return String(h).trim(); });
  const iProduct = header.indexOf("productId");
  const iVariant = header.indexOf("variantId");
  const iStock = header.indexOf("stock");
  if (iProduct === -1 || iStock === -1) return { updated: 0, error: "bad_header" };

  // Mapa "key" → fila (1-based en la planilla)
  const rowByKey = {};
  for (var r = 1; r < values.length; r++) {
    var pid = String(values[r][iProduct]).trim();
    if (!pid) continue;
    var vid = iVariant >= 0 ? String(values[r][iVariant]).trim() : "";
    var key = vid ? pid + "::" + vid : pid;
    rowByKey[key] = r; // índice en values; fila real = r + 1
  }

  var updated = 0;
  var oversold = [];
  for (var k = 0; k < items.length; k++) {
    var it = items[k];
    var id = String(it.id || "").trim();
    var qty = Number(it.quantity || 0);
    if (!id || !qty) continue;
    if (!(id in rowByKey)) continue; // envío u otro item sin fila de stock

    var rowIdx = rowByKey[id];
    var current = Number(values[rowIdx][iStock]) || 0;
    if (current < qty) {
      // Se vendió más de lo que había: dejamos en 0 pero lo reportamos.
      oversold.push(id + " (había " + current + ", se pidió " + qty + ")");
    }
    var next = Math.max(0, current - qty);
    sheet.getRange(rowIdx + 1, iStock + 1).setValue(next);
    updated++;
  }

  return { updated: updated, oversold: oversold };
}

/** Dispara un redeploy del sitio llamando a /api/publish. */
function triggerRepublish() {
  if (!SITE_URL) return;
  try {
    UrlFetchApp.fetch(SITE_URL + "/api/publish", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ secret: PUBLISH_SECRET }),
      muteHttpExceptions: true,
    });
  } catch (err) {
    // No interrumpir el flujo de la orden si el republish falla.
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonOut({ ok: true, name: "orders-webhook" });
}
