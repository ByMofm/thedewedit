/**
 * Botón "Publicar" para el Google Sheet del catálogo.
 *
 * Agrega un menú "🚀 Tienda → Publicar cambios" que dispara un redeploy del
 * sitio: Vercel corre el build (que re-sincroniza desde los Sheets) y la web
 * queda actualizada con lo que cargaste. Es el flujo para alta/edición manual
 * de productos y stock SIN tocar git.
 *
 * Setup:
 * 1. Abrí el Sheet que editás (Productos / Stock) → Extensiones → Apps Script.
 * 2. Pegá este código.
 *    - Si lo pegás en el MISMO proyecto que apps-script-orders.gs, NO repitas
 *      las líneas SITE_URL y PUBLISH_SECRET (ya están ahí; se comparten).
 * 3. Completá SITE_URL y PUBLISH_SECRET abajo (si no están ya).
 * 4. Volvé al Sheet y recargá la página: aparece el menú "🚀 Tienda".
 * 5. La primera vez que toques "Publicar cambios" te va a pedir autorizar permisos.
 */

// Borrá estas 2 líneas si ya están declaradas en el mismo proyecto (orders).
const SITE_URL = "";       // ej. "https://thedewedit.ar" (sin barra final)
const PUBLISH_SECRET = "";  // mismo valor que PUBLISH_SECRET en Vercel

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🚀 Tienda")
    .addItem("Publicar cambios", "publicarCambios")
    .addToUi();
}

function publicarCambios() {
  const ui = SpreadsheetApp.getUi();
  if (!SITE_URL || !PUBLISH_SECRET) {
    ui.alert("Falta configurar SITE_URL y PUBLISH_SECRET en el script (Extensiones → Apps Script).");
    return;
  }

  const confirm = ui.alert(
    "Publicar cambios",
    "Esto actualiza la tienda online con lo que está cargado en el Sheet. ¿Continuar?",
    ui.ButtonSet.OK_CANCEL,
  );
  if (confirm !== ui.Button.OK) return;

  try {
    const resp = UrlFetchApp.fetch(SITE_URL + "/api/publish", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ secret: PUBLISH_SECRET }),
      muteHttpExceptions: true,
    });
    const code = resp.getResponseCode();
    if (code >= 200 && code < 300) {
      ui.alert("✅ Publicado. La tienda se actualiza en 1–2 minutos.");
    } else if (code === 401) {
      ui.alert("⚠️ PUBLISH_SECRET incorrecto. Revisá que coincida con el de Vercel.");
    } else {
      ui.alert("⚠️ No se pudo publicar (código " + code + ").\n" + resp.getContentText());
    }
  } catch (err) {
    ui.alert("⚠️ Error al publicar: " + err);
  }
}
