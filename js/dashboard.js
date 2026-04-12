async function cargarResumen() {
  const { data: catalogo, error: err1 } = await supabaseClient
    .from("catalogo_proveedores")
    .select("*");

  const { data: historial, error: err2 } = await supabaseClient
    .from("historial_precios")
    .select("*")
    .order("fecha_cambio", { ascending: false });

  const { data: cotizaciones, error: err3 } = await supabaseClient
    .from("cotizaciones")
    .select("*");

  if (err1 || err2 || err3) {
    console.error("Errores Supabase:", err1, err2, err3);
    return;
  }

  const catalogoSafe = catalogo || [];
  const historialSafe = historial || [];
  const cotizacionesSafe = cotizaciones || [];

  const vigentes = catalogoSafe.filter(x => x.vigente).length;
  const proveedores = [...new Set(catalogoSafe.map(x => x.source))].length;
  const ultimaSync = catalogoSafe
    .map(x => x.fecha_sync)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const elVigentes = document.getElementById("kpi-vigentes");
  const elProveedores = document.getElementById("kpi-proveedores");
  const elCambios = document.getElementById("kpi-cambios");
  const elCotizaciones = document.getElementById("kpi-cotizaciones");
  const elUltimaSync = document.getElementById("ultima-sync");

  if (elVigentes) elVigentes.textContent = vigentes;
  if (elProveedores) elProveedores.textContent = proveedores;
  if (elCambios) elCambios.textContent = historialSafe.length;
  if (elCotizaciones) elCotizaciones.textContent = cotizacionesSafe.length;
  if (elUltimaSync) {
    elUltimaSync.textContent = `Última sync: ${
      ultimaSync ? new Date(ultimaSync).toLocaleString() : "--"
    }`;
  }

  renderCambios(historialSafe);           // todos, pero se ve scroll interno
  renderCatalogo(catalogoSafe.slice(0, 20));
  renderPriceChart(historialSafe.slice(0, 12).reverse());
}

function renderCambios(rows) {
  const el = document.getElementById("tabla-cambios");
  if (!el) return;

  if (!rows || !rows.length) {
    el.innerHTML = "<p style='color:#6b7c98;font-size:0.9rem;'>No hay cambios recientes.</p>";
    return;
  }

  const html = `
    <table class="table">
      <thead>
        <tr>
          <th>SKU</th>
          <th>Producto</th>
          <th>Anterior</th>
          <th>Nuevo</th>
          <th>Cambio</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => {
          const anterior = Number(r.precio_anterior || 0);
          const nuevo = Number(r.precio_nuevo || 0);
          const diff = nuevo - anterior;

          const cls = diff > 0 ? "up" : diff < 0 ? "down" : "";
          const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "•";

          return `
            <tr>
              <td>${r.sku ?? ""}</td>
              <td>${r.nombre ?? ""}</td>
              <td>${anterior}</td>
              <td>${nuevo}</td>
              <td class="${cls}">${arrow} ${Math.abs(diff).toFixed(2)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;

  el.innerHTML = html;
}

function renderCatalogo(rows) {
  const el = document.getElementById("tabla-catalogo");
  if (!el) return;

  if (!rows || !rows.length) {
    el.innerHTML = "<p style='color:#6b7c98;font-size:0.9rem;'>No hay productos disponibles.</p>";
    return;
  }

  const html = `
    <table class="table">
      <thead>
        <tr>
          <th>SKU</th>
          <th>Nombre</th>
          <th>Categoría</th>
          <th>Precio</th>
          <th>Proveedor</th>
          <th>Stock</th>
          <th>Fuente</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.sku ?? ""}</td>
            <td>${r.nombre ?? ""}</td>
            <td>${r.categoria ?? ""}</td>
            <td>${r.precio ?? ""}</td>
            <td>${r.proveedor ?? ""}</td>
            <td>${r.stock ?? ""}</td>
            <td>
              <span class="badge ${r.source === "dummyjson" ? "badge-blue" : "badge-gray"}">
                ${r.source ?? ""}
              </span>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  el.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", cargarResumen);