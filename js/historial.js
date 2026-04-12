let historialData = [];
let catalogoData = [];
let historialFiltrado = [];

async function cargarHistorialPage() {
  const { data: historial, error: err1 } = await supabaseClient
    .from("historial_precios")
    .select("*")
    .order("fecha_cambio", { ascending: true });

  const { data: catalogo, error: err2 } = await supabaseClient
    .from("catalogo_proveedores")
    .select("sku,nombre,categoria,proveedor,source,fecha_sync");

  if (err1 || err2) {
    console.error("Errores cargando historial:", err1, err2);
    return;
  }

  historialData = historial || [];
  catalogoData = catalogo || [];
  historialFiltrado = [...historialData];

  llenarUltimaSync();
  llenarFiltrosHistorial();
  aplicarFiltrosHistorial();

  document.getElementById("buscar-historial").addEventListener("input", aplicarFiltrosHistorial);
  document.getElementById("filtro-categoria-historial").addEventListener("change", aplicarFiltrosHistorial);
  document.getElementById("filtro-producto-historial").addEventListener("change", aplicarFiltrosHistorial);
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

function llenarFiltrosHistorial() {
  const categorias = [...new Set(catalogoData.map(x => x.categoria).filter(Boolean))].sort();
  const productos = [...new Set(historialData.map(x => x.nombre).filter(Boolean))].sort();

  const selCategoria = document.getElementById("filtro-categoria-historial");
  const selProducto = document.getElementById("filtro-producto-historial");

  categorias.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    selCategoria.appendChild(option);
  });

  productos.forEach(prod => {
    const option = document.createElement("option");
    option.value = prod;
    option.textContent = prod;
    selProducto.appendChild(option);
  });
}

function aplicarFiltrosHistorial() {
  const texto = document.getElementById("buscar-historial").value.toLowerCase().trim();
  const categoria = document.getElementById("filtro-categoria-historial").value;
  const producto = document.getElementById("filtro-producto-historial").value;

  historialFiltrado = historialData.filter(item => {
    const meta = catalogoData.find(c => c.sku === item.sku);
    const nombre = (item.nombre || "").toLowerCase();
    const itemCategoria = meta?.categoria || "";
    const itemProducto = item.nombre || "";

    const cumpleTexto = !texto || nombre.includes(texto);
    const cumpleCategoria = !categoria || itemCategoria === categoria;
    const cumpleProducto = !producto || itemProducto === producto;

    return cumpleTexto && cumpleCategoria && cumpleProducto;
  });

  renderHistorialTable(historialFiltrado.slice().reverse());
  renderHistorialChart(historialFiltrado);
  actualizarTituloCantidad(historialFiltrado.length);
}

function actualizarTituloCantidad(total) {
  const el = document.getElementById("historial-count");
  if (el) {
    el.textContent = `Registro de Cambios (${total})`;
  }
}

function renderHistorialTable(rows) {
  const el = document.getElementById("tabla-historial-full");
  if (!el) return;

  if (!rows.length) {
    el.innerHTML = "<p style='color:#6b7c98;'>No se encontraron registros.</p>";
    return;
  }

  const html = `
    <div class="tabla-wrapper">
      <table class="table table-historial">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Proveedor</th>
            <th>Precio Anterior</th>
            <th>Precio Nuevo</th>
            <th>Cambio</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => {
            const diff = Number(r.precio_nuevo) - Number(r.precio_anterior);
            const pct = Number(r.precio_anterior) !== 0
              ? (diff / Number(r.precio_anterior)) * 100
              : 0;

            const isUp = diff >= 0;
            const cls = isUp ? "up" : "down";
            const arrow = isUp ? "↗" : "↘";
            const proveedor = r.proveedor || "Proveedor_Mockaroo";

            return `
              <tr>
                <td>${r.nombre ?? ""}</td>
                <td><span class="badge badge-gray">${proveedor}</span></td>
                <td>$${Number(r.precio_anterior).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td><strong>$${Number(r.precio_nuevo).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                <td class="${cls}">
                  ${arrow} ${pct.toFixed(1)}%
                </td>
                <td>${r.fecha_cambio ? new Date(r.fecha_cambio).toLocaleString("es-CO") : ""}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  el.innerHTML = html;
}

function renderHistorialChart(rows) {
  const el = document.querySelector("#chart-historial");
  if (!el) return;

  el.innerHTML = "";

  if (!rows.length) {
    el.innerHTML = "<p style='color:#6b7c98;'>Sin datos para graficar.</p>";
    return;
  }

  const labels = rows.map(r => {
    const d = new Date(r.fecha_cambio);
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }).replace(".", "");
  });

  const values = rows.map(r => Number(r.precio_nuevo));

  const options = {
    chart: {
      type: "line",
      height: 320,
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "transparent"
    },
    series: [{
      name: "Precio",
      data: values
    }],
    xaxis: {
      categories: labels,
      labels: {
        style: {
          colors: "#7083a3",
          fontSize: "11px"
        }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        formatter: val => `$${Math.round(val).toLocaleString("en-US")}`,
        style: {
          colors: "#7083a3",
          fontSize: "11px"
        }
      }
    },
    stroke: {
      curve: "smooth",
      width: 3
    },
    colors: ["#2f80ed"],
    dataLabels: {
      enabled: false
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      colors: ["#ffffff"],
      strokeColors: "#2f80ed",
      hover: { size: 5 }
    },
    grid: {
      borderColor: "#e8eef7",
      strokeDashArray: 4
    },
    tooltip: {
      theme: "light"
    }
  };

  const chart = new ApexCharts(el, options);
  chart.render();
}

document.addEventListener("DOMContentLoaded", cargarHistorialPage);