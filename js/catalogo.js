let catalogoData = [];

async function cargarCatalogoPage() {
  const { data, error } = await supabaseClient
    .from("catalogo_proveedores")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error cargando catálogo:", error);
    return;
  }

  catalogoData = data || [];

  llenarUltimaSync();
  llenarFiltros();
  actualizarResumen(catalogoData);
  renderCatalogoFull(catalogoData);

  document.getElementById("buscar-catalogo").addEventListener("input", aplicarFiltrosCatalogo);
  document.getElementById("filtro-categoria").addEventListener("change", aplicarFiltrosCatalogo);
  document.getElementById("filtro-proveedor").addEventListener("change", aplicarFiltrosCatalogo);
}

function llenarUltimaSync() {
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

function llenarFiltros() {
  const categorias = [...new Set(catalogoData.map(x => x.categoria).filter(Boolean))].sort();
  const proveedores = [...new Set(catalogoData.map(x => x.proveedor).filter(Boolean))].sort();

  const selCategoria = document.getElementById("filtro-categoria");
  const selProveedor = document.getElementById("filtro-proveedor");

  categorias.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    selCategoria.appendChild(option);
  });

  proveedores.forEach(prov => {
    const option = document.createElement("option");
    option.value = prov;
    option.textContent = prov;
    selProveedor.appendChild(option);
  });
}

function aplicarFiltrosCatalogo() {
  const texto = document.getElementById("buscar-catalogo").value.toLowerCase().trim();
  const categoria = document.getElementById("filtro-categoria").value;
  const proveedor = document.getElementById("filtro-proveedor").value;

  const filtrado = catalogoData.filter(item => {
    const nombre = (item.nombre || "").toLowerCase();
    const itemCategoria = item.categoria || "";
    const itemProveedor = item.proveedor || "";

    const cumpleTexto = !texto || nombre.includes(texto);
    const cumpleCategoria = !categoria || itemCategoria === categoria;
    const cumpleProveedor = !proveedor || itemProveedor === proveedor;

    return cumpleTexto && cumpleCategoria && cumpleProveedor;
  });

  actualizarResumen(filtrado);
  renderCatalogoFull(filtrado);
}

function actualizarResumen(rows) {
  const el = document.getElementById("catalogo-resumen");
  if (!el) return;

  el.textContent = `${rows.length} de ${catalogoData.length} productos`;
}

function renderCatalogoFull(rows) {
  const el = document.getElementById("tabla-catalogo-full");
  if (!el) return;

  if (!rows.length) {
    el.innerHTML = "<p style='color:#6b7c98;'>No se encontraron productos.</p>";
    return;
  }

  const html = `
    <div class="tabla-wrapper">
      <table class="table table-catalogo">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Proveedor</th>
            <th>Stock</th>
            <th>Fuente</th>
            <th>Vigente</th>
            <th>Última Sync</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${r.sku ?? ""}</td>
              <td>${r.nombre ?? ""}</td>
              <td>
                <span class="badge badge-blue-soft">
                  ${r.categoria ?? ""}
                </span>
              </td>
              <td>${r.precio ?? ""} ${r.moneda ?? ""}</td>
              <td>${r.proveedor ?? ""}</td>
              <td>${r.stock ?? ""}</td>
              <td>
                <span class="badge ${r.source === "dummyjson" ? "badge-blue" : "badge-gray"}">
                  ${r.source ?? ""}
                </span>
              </td>
              <td>
                <span class="badge ${r.vigente ? "badge-green" : "badge-gray"}">
                  ${r.vigente ? "Sí" : "No"}
                </span>
              </td>
              <td>${r.fecha_sync ? new Date(r.fecha_sync).toLocaleString() : ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  el.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", cargarCatalogoPage);