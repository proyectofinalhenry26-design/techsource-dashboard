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
  const doc = new jsPDF("p", "mm", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const colors = {
    primary: [29, 49, 93],        // azul oscuro
    secondary: [47, 111, 237],    // azul marca
    lightBlue: [232, 239, 249],   // azul claro
    border: [220, 228, 240],      // borde
    text: [35, 57, 93],           // texto
    muted: [107, 124, 152],       // gris texto
    successBg: [215, 243, 227],   // verde suave
    successText: [23, 125, 72],
    warnBg: [255, 247, 232],      // naranja suave
    warnBorder: [242, 192, 120],
    warnText: [146, 91, 5]
  };

  let y = 16;

  function setText(color = colors.text, size = 10, style = "normal") {
    doc.setTextColor(...color);
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  }

  function roundRect(x, y, w, h, fillColor = null, drawColor = colors.border) {
    if (fillColor) {
      doc.setFillColor(...fillColor);
      doc.setDrawColor(...drawColor);
      doc.roundedRect(x, y, w, h, 3, 3, "FD");
    } else {
      doc.setDrawColor(...drawColor);
      doc.roundedRect(x, y, w, h, 3, 3, "S");
    }
  }

  function textLine(label, value, x, yPos, labelWidth = 28) {
    setText(colors.muted, 10, "bold");
    doc.text(label, x, yPos);
    setText(colors.text, 10, "normal");
    doc.text(value || "", x + labelWidth, yPos);
  }

  function money(value, moneda = "USD") {
    return `$${Number(value || 0).toFixed(2)} ${moneda}`;
  }

  function formatDateLong(fecha) {
    return new Date(fecha).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function ensureSpace(required) {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + required > pageHeight - 18) {
      doc.addPage();
      y = 16;
    }
  }

  const productos = Array.isArray(cotizacionGuardada.productos)
    ? cotizacionGuardada.productos
    : [];

  const productosNoVigentes = productos.filter(p => p.precio_vigente === false);

  /* HEADER */
  roundRect(margin, y, contentWidth, 24, [248, 251, 255], colors.border);

  try {
    doc.addImage("assets/logo.png", "PNG", margin + 4, y + 3, 28, 18);
  } catch (e) {
    setText(colors.primary, 16, "bold");
    doc.text("TechSource Solutions", margin + 4, y + 11);
  }

  setText(colors.primary, 16, "bold");
  doc.text("Cotización", margin + 38, y + 10);

  setText(colors.muted, 9, "normal");
  doc.text(`ID: ${cotizacionGuardada.id}`, margin + 38, y + 16);
  doc.text(`Fecha de emisión: ${formatDateLong(cotizacionGuardada.fecha_creacion)}`, margin + 38, y + 21);

  y += 32;

  /* DATOS CLIENTE */
  ensureSpace(28);
  roundRect(margin, y, contentWidth, 24, [255, 255, 255], colors.border);

  setText(colors.primary, 12, "bold");
  doc.text("Datos del cliente", margin + 4, y + 7);

  textLine("Nombre:", cotizacionGuardada.nombre_cliente || "", margin + 4, y + 15);
  textLine("Email:", cotizacionGuardada.email_cliente || "", margin + 4, y + 21);

  y += 30;

  /* TABLA */
  ensureSpace(20);
  setText(colors.primary, 12, "bold");
  doc.text("Detalle de cotización", margin, y);
  y += 5;

  const cols = {
    producto: margin,
    categoria: margin + 58,
    proveedor: margin + 86,
    precio: margin + 122,
    cantidad: margin + 150,
    subtotal: margin + 168
  };

  const rowHeight = 10;

  roundRect(margin, y, contentWidth, rowHeight, colors.lightBlue, colors.border);

  setText(colors.primary, 9, "bold");
  doc.text("Producto", cols.producto + 2, y + 6.5);
  doc.text("Categoría", cols.categoria + 2, y + 6.5);
  doc.text("Proveedor", cols.proveedor + 2, y + 6.5);
  doc.text("Precio Unit.", cols.precio + 2, y + 6.5);
  doc.text("Cant.", cols.cantidad + 2, y + 6.5);
  doc.text("Subtotal", cols.subtotal + 2, y + 6.5);

  y += rowHeight;

  productos.forEach((p) => {
    ensureSpace(12);

    const stale = p.precio_vigente === false;
    const rowBg = stale ? [255, 249, 240] : [255, 255, 255];

    roundRect(margin, y, contentWidth, 12, rowBg, colors.border);

    setText(stale ? colors.warnText : colors.text, 8.8, stale ? "bold" : "normal");
    const nombre = `${stale ? "⚠ " : ""}${String(p.nombre || "").slice(0, 30)}`;
    doc.text(nombre, cols.producto + 2, y + 7.5);

    setText(colors.text, 8.5, "normal");
    doc.text(String(p.categoria || "").slice(0, 16), cols.categoria + 2, y + 7.5);
    doc.text(String(p.proveedor || "").slice(0, 18), cols.proveedor + 2, y + 7.5);

    setText(stale ? colors.warnText : colors.text, 8.5, stale ? "bold" : "normal");
    doc.text(money(p.precio_unitario, p.moneda), cols.precio + 2, y + 7.5);

    setText(colors.text, 8.5, "normal");
    doc.text(String(p.cantidad || 1), cols.cantidad + 2, y + 7.5);

    setText(stale ? colors.warnText : colors.text, 8.5, stale ? "bold" : "normal");
    doc.text(money(p.subtotal, p.moneda), cols.subtotal + 2, y + 7.5);

    y += 12;
  });

  /* TOTAL */
  ensureSpace(16);
  roundRect(margin, y, contentWidth, 12, [248, 251, 255], colors.border);

  setText(colors.primary, 11, "bold");
  doc.text("TOTAL GENERAL", margin + 122, y + 7.5);
  doc.text(money(cotizacionGuardada.total, "USD"), margin + 168, y + 7.5);

  y += 18;

  /* AVISO */
  if (productosNoVigentes.length) {
    ensureSpace(28);
    roundRect(margin, y, contentWidth, 24, colors.warnBg, colors.warnBorder);

    setText(colors.warnText, 10, "bold");
    doc.text("⚠ Atención", margin + 4, y + 7);

    setText(colors.warnText, 9, "normal");
    const nota1 = "Algunos precios en esta cotización fueron actualizados hace más de 48 horas.";
    const nota2 = "Se recomienda confirmar con el proveedor antes de proceder.";
    const nota3 = `Productos pendientes de actualización: ${productosNoVigentes.map(p => p.nombre).join(", ")}.`;

    doc.text(doc.splitTextToSize(nota1, contentWidth - 10), margin + 4, y + 13);
    doc.text(doc.splitTextToSize(nota2, contentWidth - 10), margin + 4, y + 18);
    y += 26;

    const extraLines = doc.splitTextToSize(nota3, contentWidth - 10);
    roundRect(margin, y, contentWidth, 8 + extraLines.length * 4.5, colors.warnBg, colors.warnBorder);
    doc.text(extraLines, margin + 4, y + 7);
    y += 10 + extraLines.length * 4.5;
  } else {
    ensureSpace(16);
    roundRect(margin, y, contentWidth, 14, colors.successBg, colors.border);
    setText(colors.successText, 9, "bold");
    doc.text("✓ Precios vigentes al momento de la emisión. Validez: 48 horas.", margin + 4, y + 8.5);
    y += 20;
  }

  /* FOOTER */
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 16;

  setText(colors.muted, 8, "normal");
  doc.text("Cotización generada automáticamente por TechSource Solutions", margin, footerY - 4);
  doc.text(`Generado: ${new Date().toLocaleString("es-CO")}`, margin, footerY);

  doc.save(`Cotizacion_TechSource_${cotizacionGuardada.id}.pdf`);
}




document.addEventListener("DOMContentLoaded", initNuevaCotizacion);