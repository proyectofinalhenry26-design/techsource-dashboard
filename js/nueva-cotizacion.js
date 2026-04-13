let catalogoData = [];
let productosFiltrados = [];
let productosCotizacion = [];
let cotizacionGuardada = null;

async function initNuevaCotizacion() {
  const { data, error } = await supabaseClient
    .from("catalogo_proveedores")
    .select("*")
    .eq("vigente", true)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error cargando catálogo:", error);
    return;
  }

  catalogoData = data || [];
  productosFiltrados = [...catalogoData];

  llenarUltimaSync();
  renderSelectProductos(productosFiltrados);
  renderDetalleCotizacion();

  document.getElementById("buscar-producto").addEventListener("input", filtrarProductos);
  document.getElementById("select-producto").addEventListener("change", agregarProductoSeleccionado);
  document.getElementById("btn-generar-cotizacion").addEventListener("click", guardarCotizacion);
  document.getElementById("btn-descargar-pdf").addEventListener("click", descargarPdfCotizacion);
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

function filtrarProductos() {
  const texto = document.getElementById("buscar-producto").value.toLowerCase().trim();

  productosFiltrados = catalogoData.filter(p =>
    (p.nombre || "").toLowerCase().includes(texto)
  );

  renderSelectProductos(productosFiltrados);
}

function renderSelectProductos(rows) {
  const select = document.getElementById("select-producto");
  select.innerHTML = `<option value="">Seleccionar producto</option>`;

  rows.forEach(p => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = `${p.nombre} — $${Number(p.precio).toFixed(2)} ${p.moneda || ""}`;
    select.appendChild(option);
  });
}

function agregarProductoSeleccionado() {
  const value = document.getElementById("select-producto").value;
  if (!value) return;

  const producto = catalogoData.find(p => String(p.id) === String(value));
  if (!producto) return;

  const existente = productosCotizacion.find(p => String(p.producto_id) === String(producto.id));
  if (existente) {
    existente.cantidad += 1;
    existente.subtotal = existente.cantidad * existente.precio_unitario;
  } else {
    const vigente = esPrecioVigente(producto.fecha_sync);
    productosCotizacion.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      categoria: producto.categoria,
      proveedor: producto.proveedor,
      precio_unitario: Number(producto.precio),
      moneda: producto.moneda || "USD",
      cantidad: 1,
      subtotal: Number(producto.precio),
      precio_vigente: vigente,
      fecha_sync: producto.fecha_sync
    });
  }

  document.getElementById("select-producto").value = "";
  renderDetalleCotizacion();
  renderAdvertencia();
}

function esPrecioVigente(fechaSync) {
  if (!fechaSync) return false;
  const ahora = new Date();
  const fecha = new Date(fechaSync);
  const diffHoras = (ahora - fecha) / (1000 * 60 * 60);
  return diffHoras <= 48;
}

function renderAdvertencia() {
  const alerta = document.getElementById("alerta-precios");
  const texto = document.getElementById("alerta-precios-texto");

  const productosAntiguos = productosCotizacion.filter(p => !p.precio_vigente);

  if (!productosAntiguos.length) {
    alerta.style.display = "none";
    return;
  }

  const nombres = productosAntiguos.map(p => p.nombre).join(", ");
  const ultimo = productosAntiguos
    .map(p => p.fecha_sync)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  texto.innerHTML = `⚠ <strong>Atención:</strong> el precio de <strong>${nombres}</strong> fue actualizado hace más de 48 horas y podría no estar vigente. Último sync: ${ultimo ? new Date(ultimo).toLocaleString("es-CO") : "--"}.`;

  alerta.style.display = "block";
}

function renderDetalleCotizacion() {
  const el = document.getElementById("detalle-cotizacion");

  if (!productosCotizacion.length) {
    el.innerHTML = `<p style="color:#6b7c98;">Aún no has agregado productos.</p>`;
    return;
  }

  const total = productosCotizacion.reduce((acc, p) => acc + p.subtotal, 0);

  el.innerHTML = `
    <div class="tabla-wrapper">
      <table class="table table-cotizacion-detalle">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Proveedor</th>
            <th>Precio Unit.</th>
            <th>Cantidad</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${productosCotizacion.map((p, i) => `
            <tr>
              <td>
                ${p.nombre}
                ${!p.precio_vigente ? '<span class="warn-inline">⚠</span>' : ''}
              </td>
              <td><span class="badge badge-blue">${p.proveedor}</span></td>
              <td class="${!p.precio_vigente ? 'stale-price' : ''}">
                $${p.precio_unitario.toFixed(2)}
                ${!p.precio_vigente ? ' ⚠' : ''}
              </td>
              <td>
                <input type="number" min="1" value="${p.cantidad}" class="qty-input" onchange="cambiarCantidad(${i}, this.value)">
              </td>
              <td class="${!p.precio_vigente ? 'stale-price' : ''}">
                $${p.subtotal.toFixed(2)}
              </td>
              <td>
                <button class="btn-icon" onclick="eliminarProducto(${i})">🗑</button>
              </td>
            </tr>
          `).join("")}
          <tr>
            <td colspan="4" style="text-align:right;"><strong>Total General</strong></td>
            <td><strong>$${total.toFixed(2)}</strong></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function cambiarCantidad(index, value) {
  const cantidad = Math.max(1, Number(value || 1));
  productosCotizacion[index].cantidad = cantidad;
  productosCotizacion[index].subtotal = cantidad * productosCotizacion[index].precio_unitario;
  renderDetalleCotizacion();
  renderAdvertencia();
}

function eliminarProducto(index) {
  productosCotizacion.splice(index, 1);
  renderDetalleCotizacion();
  renderAdvertencia();
}

async function guardarCotizacion() {
  const nombre = document.getElementById("cliente-nombre").value.trim();
  const email = document.getElementById("cliente-email").value.trim();

  if (!nombre || !email) {
    alert("Debes completar nombre y email del cliente.");
    return;
  }

  if (!productosCotizacion.length) {
    alert("Debes agregar al menos un producto.");
    return;
  }

  const total = productosCotizacion.reduce((acc, p) => acc + p.subtotal, 0);
  const todosVigentes = productosCotizacion.every(p => p.precio_vigente === true);

  const payload = {
    nombre_cliente: nombre,
    email_cliente: email,
    productos: productosCotizacion.map(p => ({
      nombre: p.nombre,
      cantidad: p.cantidad,
      subtotal: p.subtotal,
      categoria: p.categoria,
      proveedor: p.proveedor,
      producto_id: p.producto_id,
      precio_unitario: p.precio_unitario,
      moneda: p.moneda,
      precio_vigente: p.precio_vigente
    })),
    total: total,
    fecha_creacion: new Date().toISOString(),
    estado: "emitida",
    precios_vigentes: todosVigentes
  };

  const { data, error } = await supabaseClient
    .from("cotizaciones")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Error guardando cotización:", error);
    alert("No fue posible guardar la cotización.");
    return;
  }

  cotizacionGuardada = data;
  mostrarResultado();
}

function mostrarResultado() {
  document.getElementById("detalle-cotizacion-card").style.display = "none";
  document.getElementById("resultado-cotizacion").style.display = "block";

  const texto = document.getElementById("resultado-texto");
  texto.innerHTML = `La cotización para <strong>${cotizacionGuardada.nombre_cliente}</strong> ha sido guardada con el ID <code>${String(cotizacionGuardada.id).substring(0, 8)}</code>.`;

  const warning = document.getElementById("resultado-warning");
  if (cotizacionGuardada.precios_vigentes === false) {
    warning.style.display = "block";
    warning.innerHTML = `⚠ Esta cotización contiene precios que fueron actualizados hace más de 48 horas. Se recomienda verificar con el proveedor.`;
  } else {
    warning.style.display = "none";
  }
}

function descargarPdfCotizacion() {
  if (!cotizacionGuardada) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 18;
  doc.setFontSize(18);
  doc.text("TechSource Solutions", 14, y);

  y += 10;
  doc.setFontSize(16);
  doc.text("Cotización", 14, y);

  y += 8;
  doc.setFontSize(10);
  doc.text(`ID: ${cotizacionGuardada.id}`, 14, y);

  y += 6;
  doc.text(`Fecha de emisión: ${new Date(cotizacionGuardada.fecha_creacion).toLocaleDateString("es-CO")}`, 14, y);

  y += 12;
  doc.setFontSize(12);
  doc.text("Datos del Cliente", 14, y);

  y += 7;
  doc.setFontSize(10);
  doc.text(`Nombre: ${cotizacionGuardada.nombre_cliente}`, 14, y);
  y += 6;
  doc.text(`Email: ${cotizacionGuardada.email_cliente}`, 14, y);

  y += 12;
  doc.setFontSize(10);
  doc.text("Producto", 14, y);
  doc.text("Categoría", 65, y);
  doc.text("Proveedor", 100, y);
  doc.text("Precio Unit.", 140, y);
  doc.text("Cant.", 170, y);
  doc.text("Subtotal", 185, y);

  y += 6;

  const productosNoVigentes = [];

  cotizacionGuardada.productos.forEach(p => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.text(`${p.precio_vigente ? "" : "⚠ "}${p.nombre}`, 14, y);
    doc.text(String(p.categoria || ""), 65, y);
    doc.text(String(p.proveedor || ""), 100, y);
    doc.text(`$${Number(p.precio_unitario).toFixed(2)} ${p.moneda || ""}`, 140, y);
    doc.text(String(p.cantidad), 170, y);
    doc.text(`$${Number(p.subtotal).toFixed(2)} ${p.moneda || ""}`, 185, y);

    if (!p.precio_vigente) productosNoVigentes.push(p.nombre);
    y += 8;
  });

  y += 8;
  doc.setFontSize(12);
  doc.text(`TOTAL: $${Number(cotizacionGuardada.total).toFixed(2)}`, 14, y);

  y += 12;
  doc.setFontSize(10);

  if (productosNoVigentes.length) {
    doc.text("Nota: Algunos precios en esta cotización fueron actualizados hace más de 48 horas.", 14, y);
    y += 6;
    doc.text("Se recomienda confirmar con el proveedor antes de proceder.", 14, y);
    y += 6;
    doc.text(`Productos con precios pendientes de actualización: ${productosNoVigentes.join(", ")}.`, 14, y);
  } else {
    doc.text("Precios vigentes al momento de la emisión. Validez: 48 horas.", 14, y);
  }

  y += 12;
  doc.text(`Generado: ${new Date().toLocaleString("es-CO")}`, 14, y);

  doc.save(`Cotizacion_TechSource_${cotizacionGuardada.id}.pdf`);
}

document.addEventListener("DOMContentLoaded", initNuevaCotizacion);