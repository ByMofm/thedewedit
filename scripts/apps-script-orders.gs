/**
 * Apps Script para persistir órdenes de MP en una pestaña "Órdenes" del Sheet.
 *
 * Setup:
 * 1. Abrir el Google Sheet → Extensiones → Apps Script.
 * 2. Pegar este código.
 * 3. Crear pestaña "Órdenes" (si no existe). La primera fila se autollena con headers
 *    en el primer POST si está vacía.
 * 4. Setear ORDERS_TOKEN abajo (mismo valor que ORDERS_WEBHOOK_TOKEN en Vercel).
 * 5. Implementar → Nueva implementación → Tipo "App web":
 *    - Ejecutar como: yo
 *    - Quién tiene acceso: Cualquier persona
 * 6. Copiar la URL y pegarla como ORDERS_WEBHOOK_URL en Vercel.
 *
 * Idempotencia: si llega un paymentId que ya está en la columna A, se ignora.
 */

const ORDERS_TOKEN = "CAMBIAR_POR_EL_MISMO_VALOR_QUE_ORDERS_WEBHOOK_TOKEN";
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
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== ORDERS_TOKEN) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: "unauthorized" }),
      ).setMimeType(ContentService.MimeType.JSON);
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
      return ContentService.createTextOutput(
        JSON.stringify({ ok: true, duplicate: true }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const itemsStr = (order.items || [])
      .map(function (it) {
        return it.quantity + "x " + it.title + " ($" + it.unitPrice + ")";
      })
      .join(" | ");

    sheet.appendRow([
      order.paymentId,
      order.createdAt,
      order.approvedAt,
      order.status,
      order.statusDetail,
      order.amount,
      order.currency,
      order.paymentMethod,
      order.installments,
      order.payerEmail,
      order.payerName,
      order.payerPhone,
      order.shippingAddress,
      order.shippingZip,
      itemsStr,
      order.preferenceId,
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, name: "orders-webhook" }),
  ).setMimeType(ContentService.MimeType.JSON);
}
