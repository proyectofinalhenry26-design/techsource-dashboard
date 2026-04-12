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
  if (Array.isArray(data.productos)) {
    productosHtml = `
      <ul style="padding-left:18px; margin:8px 0;">
        ${data.productos.map(p => `
          <li>
            ${p.nombre || "Producto"} - ${p.moneda || ""} ${p.precio || ""}
          </li>
        `).join("")}
      </ul>
    `;
  } else {
    productosHtml = "<p>No hay detalle de productos disponible.</p>";
  }

  const mensaje = `
Cliente: ${data.nombre_cliente || ""}
Email: ${data.email_cliente || ""}
Estado: ${data.estado || ""}
Total: ${formatearMoneda(data.total)}

Productos:
${Array.isArray(data.productos)
  ? data.productos.map(p => `- ${p.nombre || "Producto"} (${p.moneda || ""} ${p.precio || ""})`).join("\n")
  : "No disponible"}
  `;

  alert(mensaje);
}

document.addEventListener("DOMContentLoaded", cargarCotizacionesPage);