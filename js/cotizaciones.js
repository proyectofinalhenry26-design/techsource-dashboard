let cotizacionesData = [];
let catalogoData = [];

async function cargarCotizacionesPage() {
  const { data: cotizaciones, error: err1 } = await supabaseClient
    .from("cotizaciones")
    .select("*")
    .order("fecha_creacion", { ascending: false });

  const { data: catalogo, error: err2 } = await supabaseClient
    .from("catalogo_proveedores")
    .select("fecha_sync");

  if (err1 || err2) {
    console.error("Errores cargando cotizaciones:", err1, err2);
    return;
  }

  cotizacionesData = cotizaciones || [];
  catalogoData = catalogo || [];

  llenarUltimaSyncCotizaciones();
  aplicarFiltrosCotizaciones();

  document.getElementById("buscar-cotizacion").addEventListener("input", aplicarFiltrosCotizaciones);
  document.getElementById("filtro-validacion-cotizacion").addEventListener("change", aplicarFiltrosCotizaciones);
  document.getElementById("filtro-desde").addEventListener("change", aplicarFiltrosCotizaciones);
  document.getElementById("filtro-hasta").addEventListener("change", aplicarFiltrosCotizaciones);
}

function llenarUltimaSyncCotizaciones() {
  const ultimaSync = catalogoData
    .map(x => x.fecha_sync)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const el = document.getElementById("ultima-sync");
  if (el) {
    el.textContent = `Última sync: ${ultimaSync ? new Date(ultimaSync).toLocaleString() : "--"}`;
  }
}

function aplicarFiltrosCotizaciones() {
  const texto = document.getElementById("buscar-cotizacion").value.toLowerCase().trim();
  const validacion = document.getElementById("filtro-validacion-cotizacion").value;
  const desde = document.getElementById("filtro-desde").value;
  const hasta = document.getElementById("filtro-hasta").value;

  const filtrado = cotizacionesData.filter(item => {
    const id = (item.id || "").toLowerCase();
    const cliente = (item.nombre_cliente || "").toLowerCase();
    const fecha = item.fecha_creacion ? new Date(item.fecha_creacion) : null;

    const cumpleTexto =
      !texto ||
      id.includes(texto) ||
      cliente.includes(texto);

    let cumpleValidacion = true;
    if (validacion === "vigentes") {
      cumpleValidacion = item.precios_vigentes === true;
    } else if (validacion === "verificacion") {
      cumpleValidacion = item.precios_vigentes === false;
    }

    let cumpleDesde = true;
    if (desde && fecha) {
      const fechaDesde = new Date(`${desde}T00:00:00`);
      cumpleDesde = fecha >= fechaDesde;
    }

    let cumpleHasta = true;
    if (hasta && fecha) {
      const fechaHasta = new Date(`${hasta}T23:59:59`);
      cumpleHasta = fecha <= fechaHasta;
    }

    return cumpleTexto && cumpleValidacion && cumpleDesde && cumpleHasta;
  });

  actualizarResumenCotizaciones(filtrado);
  renderCotizaciones(filtrado);
}

function actualizarResumenCotizaciones(rows) {
  const el = document.getElementById("cotizaciones-count");
  if (!el) return;

  el.textContent = `${rows.length} cotización(es) encontrada(s)`;
}

function renderCotizaciones(rows) {
  const el = document.getElementById("tabla-cotizaciones");
  if (!el) return;

  if (!rows.length) {
    el.innerHTML = "<p style='color:#6b7c98;'>No se encontraron cotizaciones.</p>";
    return;
  }

  const html = `
    <div class="tabla-wrapper">
      <table class="table table-cotizaciones">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Total</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Validación</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${shortId(r.id)}</td>
              <td>${r.nombre_cliente ?? ""}</td>
              <td><strong>${formatearMoneda(r.total)}</strong></td>
              <td>${formatearFecha(r.fecha_creacion)}</td>
              <td>
                <span class="badge badge-gray">
                  ${r.estado ?? ""}
                </span>
              </td>
              <td>
                ${r.precios_vigentes
                  ? `<span class="badge badge-green">◔ Precios vigentes</span>`
                  : `<span class="badge badge-yellow">⚠ Requiere verificación</span>`
                }
              </td>
              <td>
                <button class="btn-icon" onclick='verDetalleCotizacion(${JSON.stringify(JSON.stringify(r))})' title="Ver detalle">
                  👁
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  el.innerHTML = html;
}

function shortId(id) {
  if (!id) return "";
  return String(id).substring(0, 8);
}

function formatearMoneda(valor) {
  const num = Number(valor || 0);
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

function formatearFecha(fecha) {
  if (!fecha) return "";
  const d = new Date(fecha);
  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function verDetalleCotizacion(raw) {
  const data = JSON.parse(raw);

  let productosHtml = "";
  let hayAntiguos = false;

  if (Array.isArray(data.productos)) {
    productosHtml = `
      <table style="width:100%; border-collapse:collapse; margin-top:12px;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Producto</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Proveedor</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Precio Unit.</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Cantidad</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${data.productos.map(p => {
            const stale = p.precio_vigente === false;
            if (stale) hayAntiguos = true;

            return `
              <tr>
                <td style="padding:8px; border-bottom:1px solid #eee;">${p.nombre}</td>
                <td style="padding:8px; border-bottom:1px solid #eee;">${p.proveedor || ""}</td>
                <td style="padding:8px; border-bottom:1px solid #eee; color:${stale ? "#E67E22" : "#23395d"}; font-weight:${stale ? "700" : "500"};">
                  ${stale ? "⚠ " : ""}$${Number(p.precio_unitario || 0).toFixed(2)}
                </td>
                <td style="padding:8px; border-bottom:1px solid #eee;">${p.cantidad || 1}</td>
                <td style="padding:8px; border-bottom:1px solid #eee; color:${stale ? "#E67E22" : "#23395d"}; font-weight:${stale ? "700" : "500"};">
                  $${Number(p.subtotal || 0).toFixed(2)}
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
      ${hayAntiguos ? `
        <p style="margin-top:14px; color:#E67E22; font-size:0.92rem; font-weight:600;">
          Los productos marcados en naranja tenían precios con más de 48 horas de antigüedad al momento de emitir la cotización.
        </p>
      ` : ""}
    `;
  } else {
    productosHtml = "<p>No hay detalle de productos disponible.</p>";
  }

  const nuevaVentana = window.open("", "_blank", "width=1000,height=700");
  nuevaVentana.document.write(`
    <html>
      <head>
        <title>Detalle de cotización</title>
        <style>
          body { font-family: Inter, Arial, sans-serif; padding: 24px; color: #1d315d; }
          h1 { margin-bottom: 8px; }
          p { margin: 6px 0; }
        </style>
      </head>
      <body>
        <h1>Detalle de cotización</h1>
        <p><strong>Cliente:</strong> ${data.nombre_cliente || ""}</p>
        <p><strong>Email:</strong> ${data.email_cliente || ""}</p>
        <p><strong>Estado:</strong> ${data.estado || ""}</p>
        <p><strong>Total:</strong> ${formatearMoneda(data.total)}</p>
        ${productosHtml}
      </body>
    </html>
  `);
  nuevaVentana.document.close();
}

document.addEventListener("DOMContentLoaded", cargarCotizacionesPage);