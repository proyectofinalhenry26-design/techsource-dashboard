async function cargarResumen() {
  const { data: catalogo, error: err1 } = await supabaseClient
    .from("catalogo_proveedores")
    .select("*");

  const { data: historial, error: err2 } = await supabaseClient
    .from("historial_precios")
    .select("*")
    .order("fecha_cambio", { ascending: false });

  if (err1 || err2) {
    console.error(err1 || err2);
    return;
  }

  const vigentes = catalogo.filter(x => x.vigente).length;
  const proveedores = [...new Set(catalogo.map(x => x.source))].length;
  const ultimaSync = catalogo
    .map(x => x.fecha_sync)
    .sort()
    .reverse()[0];

  document.getElementById("kpi-vigentes").textContent = vigentes;
  document.getElementById("kpi-proveedores").textContent = proveedores;
  document.getElementById("kpi-cambios").textContent = historial.length;
  document.getElementById("kpi-sync").textContent = ultimaSync
    ? new Date(ultimaSync).toLocaleString()
    : "--";
  document.getElementById("ultima-sync").textContent = `Última sync: ${ultimaSync ? new Date(ultimaSync).toLocaleString() : "--"}`;

  renderCambios(historial.slice(0, 10));
  renderCatalogo(catalogo.slice(0, 20));
  renderPriceChart(historial.slice(0, 12).reverse());
}

function renderCambios(rows) {
  const el = document.getElementById("tabla-cambios");
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
          const diff = Number(r.precio_nuevo) - Number(r.precio_anterior);
          const cls = diff >= 0 ? "up" : "down";
          const sign = diff >= 0 ? "+" : "";
          return `
            <tr>
              <td>${r.sku}</td>
              <td>${r.nombre}</td>
              <td>${r.precio_anterior}</td>
              <td>${r.precio_nuevo}</td>
              <td class="${cls}">${sign}${diff.toFixed(2)}</td>
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
            <td>${r.sku}</td>
            <td>${r.nombre}</td>
            <td>${r.categoria}</td>
            <td>${r.precio}</td>
            <td>${r.proveedor}</td>
            <td>${r.stock}</td>
            <td><span class="badge ${r.source === 'dummyjson' ? 'badge-blue' : 'badge-gray'}">${r.source}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
  el.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", cargarResumen);