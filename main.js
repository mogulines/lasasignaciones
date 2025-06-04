const API_BASE_URL = "https://bitter-scene-e2f5.milibarraza18.workers.dev/api/";

let legajosNombres = [];

async function cargarLegajosNombres() {
  try {
    const res = await fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vTRbyYnTDk6oZnYZ1JZznd9oOSrw_2slT9CkYR4mVDKAorMln3NXIPcjEreGI_NvdpDmavIIIBXPdfq/pub?output=csv&gid=0");
    const csvText = await res.text();
    legajosNombres = csvText.trim().split("\n").slice(1).map(line => {
      const [legajo, nombre] = line.split(",");
      return { legajo: legajo.trim(), nombre: nombre.trim() };
    });
    console.log("Legajos y nombres cargados:", legajosNombres);
  } catch (e) {
    console.error("Error cargando legajos y nombres:", e);
  }
}

function nombrePorLegajo(legajo) {
  const encontrado = legajosNombres.find(l => l.legajo === legajo);
  return encontrado ? encontrado.nombre : "Sin nombre";
}

async function buscarAsignaciones() {
  const legajo = document.getElementById("legajo").value.trim();
  if (!legajo) {
    alert("Ingresá un legajo.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}asignaciones/legajos/${legajo}`);
    if (!res.ok) throw new Error("No se pudo obtener la respuesta");
    const data = await res.json();
    if (!data.asignaciones) throw new Error("No hay asignaciones");

    data.asignaciones.forEach(a => a.nombre = nombrePorLegajo(legajo));

    mostrarTabla(data.asignaciones, `Horarios para ${legajo} (${nombrePorLegajo(legajo)})`, true);
  } catch (e) {
    console.error(e);
    alert("No se pudieron cargar los datos para ese legajo.");
  }
}

async function mostrarTodos() {
  const contenedor = document.getElementById("tabla-asignaciones");
  contenedor.innerHTML = "Cargando...";
  contenedor.style.display = "block";

  const todas = [];

  for (const { legajo, nombre } of legajosNombres) {
    try {
      const res = await fetch(`${API_BASE_URL}asignaciones/legajos/${legajo}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.asignaciones) {
        data.asignaciones.forEach(asig => {
          todas.push({
            ...asig,
            nombre,
          });
        });
      }
    } catch {
      // omitimos errores
    }
  }

  // Ordenar por fecha y horaEntrada con fecha en formato DD/MM
  todas.sort((a, b) => {
    const [dA, mA] = a.fecha.split("/").map(Number);
    const [dB, mB] = b.fecha.split("/").map(Number);

    const dateA = new Date(2000, mA - 1, dA);
    const dateB = new Date(2000, mB - 1, dB);

    if (dateA - dateB !== 0) return dateA - dateB;

    return a.horaEntrada.localeCompare(b.horaEntrada);
  });

  mostrarTablaPorDias(todas);
}

function mostrarTablaPorDias(asignaciones) {
  const contenedor = document.getElementById("tabla-asignaciones");

  // Agrupar asignaciones por fecha
  const agrupadoPorFecha = asignaciones.reduce((acc, a) => {
    if (!acc[a.fecha]) acc[a.fecha] = [];
    acc[a.fecha].push(a);
    return acc;
  }, {});

  // Ordenar fechas correctamente (DD/MM)
  const fechasOrdenadas = Object.keys(agrupadoPorFecha).sort((a, b) => {
    const [dA, mA] = a.split("/").map(Number);
    const [dB, mB] = b.split("/").map(Number);

    const dateA = new Date(2000, mA - 1, dA);
    const dateB = new Date(2000, mB - 1, dB);

    return dateA - dateB;
  });

  let html = `<h2>Horarios de todos</h2><div class="contenedor-dias">`;

  for (const fecha of fechasOrdenadas) {
    const asigns = agrupadoPorFecha[fecha];

    html += `<div class="dia-cuadro">`;
    html += `<h3>${fecha}</h3>`;
    html += `<table><thead><tr><th>Entrada</th><th>Salida</th><th>Tienda</th><th>Nombre</th></tr></thead><tbody>`;

    asigns.forEach(a => {
      html += `<tr><td>${a.horaEntrada}</td><td>${a.horaSalida}</td><td>${a.tienda}</td><td>${a.nombre}</td></tr>`;
    });

    html += `</tbody></table>`;
    html += `</div>`;
  }

  html += `</div>`;

  contenedor.innerHTML = html;
}

function mostrarTabla(asignaciones, titulo, mostrarContador) {
  const contenedor = document.getElementById("tabla-asignaciones");
  let html = `<h2>${titulo}</h2><table><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Tienda</th>`;

  if (!mostrarContador) html += "<th>Nombre</th>";
  html += "</tr>";

  let totalHoras = 0;

  asignaciones.forEach(a => {
    html += `<tr><td>${a.fecha}</td><td>${a.horaEntrada}</td><td>${a.horaSalida}</td><td>${a.tienda}</td>`;
    if (!mostrarContador) html += `<td>${a.nombre}</td>`;
    html += "</tr>";

    const [h1, m1] = a.horaEntrada.split(":").map(Number);
    const [h2, m2] = a.horaSalida.split(":").map(Number);
    totalHoras += (h2 + m2/60) - (h1 + m1/60);
  });

  html += "</table>";

  if (mostrarContador) {
    html += `<div class="contador">Total de horas asignadas: ${totalHoras.toFixed(1)} hs</div>`;
  }

  contenedor.innerHTML = html;
  contenedor.style.display = 'block';
}

document.addEventListener("DOMContentLoaded", async () => {
  await cargarLegajosNombres();

  document.getElementById("btn-ver-mis-horarios").addEventListener("click", buscarAsignaciones);

  document.getElementById('modo').addEventListener('change', (e) => {
    const modo = e.target.value;
    if (modo === 'mias') {
      document.getElementById('form-legajo').style.display = 'block';
      document.getElementById('tabla-asignaciones').style.display = 'none';
    } else {
      document.getElementById('form-legajo').style.display = 'none';
      mostrarTodos();
    }
  });

  // Ocultar loader suavemente cuando cargue todo
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.transition = 'opacity 0.5s ease';
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.display = 'none';
    }, 500);
  }
});
