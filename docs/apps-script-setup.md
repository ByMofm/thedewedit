# Apps Script — setup y testing

Guía para dejar andando los dos Apps Script del proyecto:

- **`scripts/apps-script-orders.gs`** — recibe los pagos aprobados de Mercado Pago
  (web app), guarda la orden en la pestaña **Órdenes**, **descuenta el stock**
  vendido y dispara un **redeploy** automático del sitio.
- **`scripts/apps-script-publish.gs`** — agrega un botón **"🚀 Tienda → Publicar
  cambios"** en el Sheet para publicar a mano lo que cargues (alta/edición de
  productos y stock sin git).

## Flujo de datos

```
Cliente paga ──► Mercado Pago ──► webhook /api/mercadopago/webhook (Next)
                                      │  (pago "approved", firma verificada)
                                      ▼
                          forwardOrderToSheets() ──POST──► apps-script-orders.gs
                                                              ├─ guarda orden (Órdenes)
                                                              ├─ descuenta stock (Stock)
                                                              └─ POST /api/publish ─► redeploy

Dueña edita el Sheet ──► botón "Publicar cambios" (apps-script-publish.gs)
                              └─ POST /api/publish ─► redeploy (re-sync desde Sheets)
```

## 0) Variables en Vercel (recap)

En el proyecto de Vercel deben estar:

| Var | Para qué |
|---|---|
| `MP_ACCESS_TOKEN`, `NEXT_PUBLIC_MP_PUBLIC_KEY` | Mercado Pago |
| `MP_WEBHOOK_SECRET` | Verificar la firma del webhook de MP |
| `ORDERS_WEBHOOK_URL` | URL de la web app de `apps-script-orders.gs` (paso 1) |
| `ORDERS_WEBHOOK_TOKEN` | Token compartido con el Apps Script de órdenes |
| `PUBLISH_SECRET` | Secret que valida `/api/publish` |
| `VERCEL_DEPLOY_TOKEN`, `VERCEL_PROJECT_ID` | Para que `/api/publish` dispare el redeploy |
| `SHEETS_PRODUCTOS_ID`, `SHEETS_VARIANTES_ID`, `SHEETS_STOCK_ID` (o `SHEETS_ID`) | Sync del catálogo/stock desde Sheets |

## 1) Script de órdenes (web app)

1. Abrí el Sheet **donde querés que vivan las Órdenes** → **Extensiones → Apps Script**.
2. Pegá `scripts/apps-script-orders.gs` y completá la **CONFIG** de arriba:
   - `ORDERS_TOKEN` = mismo valor que `ORDERS_WEBHOOK_TOKEN` en Vercel.
   - `STOCK_SHEET_ID` = ID de la planilla de **Stock** (la parte entre `/d/` y `/edit`
     en la URL). Si el Stock está en **esta misma** planilla, dejalo vacío.
   - `STOCK_TAB_NAME` = nombre exacto de la pestaña de stock (default `"Stock"`).
   - `SITE_URL` = dominio del sitio, sin barra final (ej. `https://thedewedit.ar`).
   - `PUBLISH_SECRET` = mismo valor que en Vercel.
   - `NOTIFY_EMAIL` (opcional) = tu email para recibir aviso de cada venta.
3. **Implementar → Nueva implementación → Tipo "App web"**:
   - Ejecutar como: **yo**
   - Quién tiene acceso: **Cualquier persona**
4. Copiá la **URL de la web app** y pegala como `ORDERS_WEBHOOK_URL` en Vercel.
5. En Mercado Pago (panel → Webhooks) configurá la notification URL del sitio:
   `https://TU-DOMINIO/api/mercadopago/webhook` y copiá la **clave secreta** a
   `MP_WEBHOOK_SECRET` en Vercel.

> ⚠️ **Al actualizar el código** del script tenés que **Implementar → Gestionar
> implementaciones → editar → Versión: Nueva versión**. Si no, la web app sigue
> corriendo la versión vieja aunque hayas pegado el código nuevo. La URL no cambia.

## 2) Botón "Publicar"

1. Abrí el Sheet que **editás a diario** (Productos / Stock) → **Extensiones → Apps Script**.
2. Pegá `scripts/apps-script-publish.gs`.
   - Si lo pegás en el **mismo proyecto** que el de órdenes, **borrá** las líneas
     `SITE_URL` y `PUBLISH_SECRET` del publish (ya están en el de órdenes; se comparten).
3. Completá `SITE_URL` y `PUBLISH_SECRET` (si no están ya).
4. Recargá el Sheet → aparece el menú **"🚀 Tienda"**. Tocá **Publicar cambios**
   (autorizá permisos la primera vez).

## 3) Probar el flujo end-to-end

**Ping rápido (sin pago):** abrí la URL de la web app de órdenes en el navegador.
Debe responder `{"ok":true,"name":"orders-webhook"}` (eso es el `doGet`).

**Test de descuento aislado (sin MP):** en el editor de Apps Script, pegá y corré
esta función temporal — descuenta 1 unidad de un SKU real y revisá la pestaña Stock:

```js
function _testDescuento() {
  Logger.log(decrementStock([{ id: "biodance-bio-collagen-mask", quantity: 1 }]));
}
```

(Usá un `id` que exista en tu pestaña Stock; para variantes es `productId::variantId`.)

**Pago sandbox (flujo completo):**
1. Con credenciales **sandbox** de MP en Vercel, hacé una compra de prueba.
2. Pagá con una [tarjeta de prueba de MP](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards).
3. Verificá, en orden:
   - Pestaña **Órdenes**: aparece una fila nueva con el pago.
   - Pestaña **Stock**: bajó la cantidad del/los producto(s) comprado(s).
   - **Deploy** nuevo en Vercel (disparado por el republish).
   - Si configuraste `NOTIFY_EMAIL`: te llegó el mail.

### ✅ La validación clave

El descuento depende de que MP devuelva, en `additional_info.items[].id`, el
**mismo id** que mandamos al crear la preferencia (`productId` o
`productId::variantId`). Si tras el pago sandbox la fila quedó en Órdenes **pero
el stock NO bajó**, abrí esa fila: si dice `⚠️ STOCK NO ACTUALIZADO`, es config
(`STOCK_SHEET_ID` / `STOCK_TAB_NAME`); si no dice nada y el stock no bajó, MP no
está devolviendo los `id` como esperamos y hay que ajustar el matcheo.

## Problemas comunes

- **El stock no baja / la web sigue vieja:** ¿re-deployaste el script con *Nueva
  versión*? (ver aviso del paso 1).
- **`unauthorized` en las Órdenes:** `ORDERS_TOKEN` ≠ `ORDERS_WEBHOOK_TOKEN`.
- **`401` al Publicar:** `PUBLISH_SECRET` no coincide con Vercel.
- **`no_stock_tab` / `bad_header`:** la pestaña de stock no se llama como
  `STOCK_TAB_NAME`, o le faltan las columnas `productId` / `stock` en la fila 1.

## Limitación conocida

Hoy **no se repone stock automáticamente ante un refund o contracargo** (el
webhook solo procesa pagos `approved`). Si reembolsás una venta, ajustá el stock
a mano en el Sheet. Se puede automatizar más adelante manejando esos eventos de MP.
