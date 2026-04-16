let catalogoDataHistorial = [];

async function initHistorialCotizaciones() {
  await llenarUltimaSyncHistorial();

  document.getElementById("btn-buscar-historial")?.addEventListener("click", buscarHistorialCotizaciones);
  document.getElementById("email-historial")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      buscarHistorialCotizaciones();
    }
  });
}

async function llenarUltimaSyncHistorial() {
  const { data, error } = await supabaseClient
    .from("catalogo_proveedores")
    .select("fecha_sync")
    .order("fecha_sync", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error obteniendo última sync:", error);
    return;
  }

  const ultimaSync = data?.[0]?.fecha_sync || null;
  const el = document.getElementById("ultima-sync");

  if (el) {
    el.textContent = `Última sync: ${ultimaSync ? new Date(ultimaSync).toLocaleString("es-CO") : "--"}`;
  }
}

async function buscarHistorialCotizaciones() {
  const email = document.getElementById("email-historial")?.value.trim().toLowerCase();
  const contenedor = document.getElementById("resultado-historial");

  if (!contenedor) return;

  if (!email) {
    contenedor.innerHTML = `<p style="color:#925b05;">Debes ingresar un email.</p>`;
    return;
  }

  contenedor.innerHTML = `<p style="color:#6b7c98;">Buscando historial...</p>`;

  const { data, error } = await supabaseClient
    .from("cotizaciones")
    .select("*")
    .eq("email_cliente", email)
    .order("fecha_creacion", { ascending: false });

  if (error) {
    console.error("Error buscando historial:", error);
    contenedor.innerHTML = `<p style="color:#925b05;">No fue posible consultar el historial.</p>`;
    return;
  }

  if (!data || !data.length) {
    contenedor.innerHTML = `
      <div class="empty-state">
        <h3>Sin historial de cotizaciones</h3>
        <p>No se encontraron cotizaciones asociadas a ese correo.</p>
      </div>
    `;
    return;
  }

  renderHistorialCotizaciones(data);
}

function renderHistorialCotizaciones(rows) {
  const contenedor = document.getElementById("resultado-historial");
  if (!contenedor) return;

  const html = `
    <div class="tabla-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Fecha</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Validación</th>
            <th>Productos</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => {
            const productos = Array.isArray(row.productos) ? row.productos : [];
            const validacion = row.precios_vigentes
              ? `<span class="badge badge-green">Precios vigentes</span>`
              : `<span class="badge badge-orange">Requiere validación</span>`;

            return `
              <tr>
                <td><code>${String(row.id).substring(0, 8)}</code></td>
                <td>${row.fecha_creacion ? new Date(row.fecha_creacion).toLocaleString("es-CO") : ""}</td>
                <td><strong>$${Number(row.total || 0).toFixed(2)} USD</strong></td>
                <td><span class="badge badge-blue">${row.estado || "emitida"}</span></td>
                <td>${validacion}</td>
                <td>
                  <button class="btn-link-mini" onclick='verDetalleCotizacionPublica(${JSON.stringify(JSON.stringify(row)).replace(/'/g, "&apos;")})'>
                    Ver detalle
                  </button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  contenedor.innerHTML = html;
}

function verDetalleCotizacionPublica(raw) {
  const data = JSON.parse(raw);
  const productos = Array.isArray(data.productos) ? data.productos : [];

  const detalle = `
    <div class="modal-backdrop" onclick="cerrarModalCotizacion()">
      <div class="modal-card" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3>Detalle de cotización</h3>
          <button class="btn-close" onclick="cerrarModalCotizacion()">✕</button>
        </div>

        <div class="modal-body">
          <p><strong>ID:</strong> ${String(data.id).substring(0, 8)}</p>
          <p><strong>Cliente:</strong> ${data.nombre_cliente || ""}</p>
          <p><strong>Email:</strong> ${data.email_cliente || ""}</p>
          <p><strong>Fecha:</strong> ${data.fecha_creacion ? new Date(data.fecha_creacion).toLocaleString("es-CO") : ""}</p>
          <p><strong>Total:</strong> $${Number(data.total || 0).toFixed(2)} USD</p>

          <div class="tabla-wrapper" style="margin-top:14px;">
            <table class="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Proveedor</th>
                  <th>Precio Unit.</th>
                  <th>Cantidad</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${productos.map(p => {
                  const stale = p.precio_vigente === false;
                  return `
                    <tr>
                      <td>${p.nombre || ""}</td>
                      <td>${p.proveedor || ""}</td>
                      <td class="${stale ? "stale-price" : ""}">
                        ${stale ? "(!) " : ""}$${Number(p.precio_unitario || 0).toFixed(2)} ${p.moneda || "USD"}
                      </td>
                      <td>${p.cantidad || 1}</td>
                      <td class="${stale ? "stale-price" : ""}">
                        $${Number(p.subtotal || 0).toFixed(2)} ${p.moneda || "USD"}
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>

          ${data.precios_vigentes === false ? `
            <div class="warning-card" style="margin-top:14px;">
              Los productos marcados tenían precios con más de 48 horas de antigüedad al momento de emitir la cotización.
            </div>
          ` : ""}
        </div>
      </div>
    </div>
  `;

  const existing = document.getElementById("modal-cotizacion-publica");
  if (existing) existing.remove();

  const wrapper = document.createElement("div");
  wrapper.id = "modal-cotizacion-publica";
  wrapper.innerHTML = detalle;
  document.body.appendChild(wrapper);
}

function cerrarModalCotizacion() {
  const modal = document.getElementById("modal-cotizacion-publica");
  if (modal) modal.remove();
}

document.addEventListener("DOMContentLoaded", initHistorialCotizaciones);