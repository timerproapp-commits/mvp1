// --- LÓGICA DE NAVEGACIÓN ---
// Cambia entre 'view-carga', 'view-historial', etc., ocultando las demás.
function showView(viewId, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  btn.classList.add('active');
}

// --- LÓGICA DE DATOS ---
const SS_STAGING = 'nado_staging_session'; // Nombre de la "llave" para guardar datos temporales en el navegador
const $ = s => document.querySelector(s); // Atajo para no escribir document.querySelector siempre

// Convierte el formato 00:00:00.000 a un número total de segundos (útil para cálculos matemáticos)
const toSec = (t) => {
  const parts = (t || '0:0:0').split(':');
  if (parts.length < 3) return 0;
  const [h, m] = parts;
  const [s, ms] = parts[2].split('.');
  return (+h) * 3600 + (+m) * 60 + (+s) + ((+ms || 0) / 1000);
};

// Convierte un número de segundos de vuelta a formato de texto 00:00.000 para que el humano lo lea bien
const fmtMs = (sec) => {
  const m = Math.floor(sec / 60), s = Math.floor(sec - m * 60), ms = Math.round((sec - m * 60 - s) * 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
};

// Carga los datos guardados en la memoria temporal (sessionStorage)
function loadStaging() { try { const s = sessionStorage.getItem(SS_STAGING); return s ? JSON.parse(s) : { items: [] }; } catch (e) { return { items: [] }; } }

// Guarda los datos en la memoria temporal para que no se borren al refrescar por error
function saveStaging(obj) { sessionStorage.setItem(SS_STAGING, JSON.stringify(obj)); }

// FUNCIÓN CRÍTICA: Procesa el texto pegado. Soporta múltiples bloques si se pegan varios nadadores juntos.
function parseMultipleBlocks(rawText) {
  // Divide el texto cada vez que encuentra la frase de inicio de Multi Timer
  const blocks = rawText.split(/Multi Timer Lista de vueltas/i).filter(b => b.trim().length > 10);
  return blocks.map(block => {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const metaLine = lines[0]; // La línea que tiene el nombre y la carrera
    const mRace = metaLine.match(/\(([^)]+)\)/); // Busca lo que hay entre paréntesis para la carrera
    const carrera = mRace ? mRace[1].trim() : "Carrera N/D";
    const nadador = metaLine.split('(')[0].trim() || "Atleta N/D";

    // Busca dónde empiezan los números (debajo del encabezado Número;Duration;Vuelta)
    const headerIdx = lines.findIndex(l => /n[uú]mero/i.test(l) && /vuelta/i.test(l));
    const dataLines = lines.slice(headerIdx + 1);
    const rows = [];
    let lastDur = "";

    // Procesa cada línea de tiempos separada por punto y coma (;)
    dataLines.forEach(l => {
      if (l.includes(';')) {
        const p = l.split(';').map(x => x.trim());
        if (p.length >= 3) {
          rows.push({ lap: p[0], duration: p[1], vuelta: p[2] });
          lastDur = p[2]; // Guarda el último tiempo para mostrarlo como "Total"
        }
      }
    });
    return { nadador, carrera, totalTxt: lastDur, rawRows: rows };
  });
}

// Dibuja la lista de nadadores en la sección "Paso 2"
function renderStaging() {
  const cont = $('#summaryBody'); cont.innerHTML = '';
  loadStaging().items.forEach((it, idx) => {
    const div = document.createElement('div'); div.className = 'inline-row';
    div.innerHTML = `<div><b>${it.nadador}</b></div><div>${it.carrera}</div><div style="font-size:1.1rem; font-weight:700">${it.totalTxt}</div><button class="btn light" style="width:auto; padding:8px" onclick="viewDetails(${idx})">🔍 Ver</button>`;
    cont.appendChild(div);
  });
}

// Muestra los detalles de parciales en el modal. Aquí ocurre el cálculo de mejor/peor tiempo.
/*window.viewDetails = (idx) => {
  const it = loadStaging().items[idx];
  const modalTbody = $('#modalTbody');
  const metricsBox = $('#metrics');
  modalTbody.innerHTML = ''; metricsBox.innerHTML = '';
  $('#modalTitle').textContent = it.nadador;

  // Convierte todas las vueltas a segundos para comparar
  const secs = it.rawRows.map(r => toSec(r.vuelta));
  const min = Math.min(...secs), max = Math.max(...secs), delta = max - min;

  // Crea las filas de la tabla del modal
  it.rawRows.forEach((r, i) => {
    // Si el tiempo es el mínimo, pone fondo verde. Si es el máximo, fondo rojo.
    const style = secs[i] === min ? 'background:#B7E1C2' : (secs[i] === max ? 'background:#F5B5B5' : '');
    modalTbody.innerHTML += `<tr style="${style}"><td>${r.lap}</td><td>${r.duration}</td><td>${r.vuelta}</td></tr>`;
  });

  // Agrega los chips de resumen debajo de la tabla
  const metrics = [['Mejor', fmtMs(min)], ['Peor', fmtMs(max)], ['Var Δ', fmtMs(delta)]];
  metrics.forEach(([l, v]) => metricsBox.innerHTML += `<div class=\"chip\"><b>${l}:</b> ${v}</div>`);

  $('#modal').classList.add('open');
  $('.modal-body').scrollTop = 0; // Vuelve arriba el scroll del modal por si estaba abajo
};*/



window.viewDetails = (idx) => {
  const it = loadStaging().items[idx];
  const modalTbody = $('#modalTbody');
  const metricsBox = $('#metrics');
  modalTbody.innerHTML = ''; metricsBox.innerHTML = '';
  $('#modalTitle').textContent = it.nadador;

  const secs = it.rawRows.map(r => toSec(r.vuelta));

  // --- LÓGICA DE ESTADÍSTICAS ---
  const sorted = [...secs].sort((a, b) => a - b);

  // 1. Cálculo de Mediana
  const mid = Math.floor(sorted.length / 2);
  const mediana = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // 2. Límites para Top 3 (Mejores y Peores)
  const topMejoresLimite = sorted[2];
  const topPeoresLimite = sorted[sorted.length - 3];

  // --- RENDERIZADO DE LA TABLA ---
  it.rawRows.forEach((r, i) => {
    const val = secs[i];
    let style = '';
    let icono = '';

    if (val <= topMejoresLimite) {
      style = 'background:#B7E1C2; font-weight:bold;'; // Verde
    } else if (val >= topPeoresLimite) {
      style = 'background:#F5B5B5;'; // Rojo
    }

    modalTbody.innerHTML += `
          <tr style="${style}">
            <td>${r.lap}</td>
            <td>${r.duration}</td>
            <td>${r.vuelta}${icono}</td>
          </tr>`;
  });

  // --- RENDERIZADO DE CHIPS ---
  metricsBox.innerHTML = `
        <div class="chip"><b>Tiempo Total:</b> <span style="font-size:1.1rem">${it.totalTxt}</span></div>
        <div class="chip"><b>Mediana:</b> ${fmtMs(mediana)}</div>
      `;

  $('#modal').classList.add('open');
  $('.modal-body').scrollTop = 0;
};

// Evento al tocar "Cargar tiempos"
$('#btnLoad').addEventListener('click', () => {
  const results = parseMultipleBlocks($('#txtRaw').value);
  if (results.length) {
    const st = loadStaging(); st.items.push(...results); // Agrega los nuevos nadadores a la lista existente
    saveStaging(st);
    $('#txtRaw').value = ''; // Limpia el área de texto
    renderStaging(); // Redibuja la lista
    $('#status').textContent = `✔ ${results.length} cargados`;
  }
});

// Evento al tocar "Confirmar y Guardar"
$('#btnConfirm').addEventListener('click', () => {
  sessionStorage.removeItem(SS_STAGING); // Borra la precarga
  renderStaging(); // Limpia la pantalla
  alert('¡Guardado!');
});

// Cierra el modal
$('#btnClose').addEventListener('click', () => $('#modal').classList.remove('open'));

// Ejecuta al iniciar para mostrar datos si ya había algo cargado antes de refrescar
renderStaging();// --- LÃ“GICA DE NAVEGACIÃ“N ---
// Cambia entre 'view-carga', 'view-historial', etc., ocultando las demÃ¡s.
function showView(viewId, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  btn.classList.add('active');
}

// --- LÃ“GICA DE DATOS ---
const SS_STAGING = 'nado_staging_session'; // Nombre de la "llave" para guardar datos temporales en el navegador
const $ = s => document.querySelector(s); // Atajo para no escribir document.querySelector siempre

// Convierte el formato 00:00:00.000 a un nÃºmero total de segundos (Ãºtil para cÃ¡lculos matemÃ¡ticos)
const toSec = (t) => {
  const parts = (t || '0:0:0').split(':');
  if (parts.length < 3) return 0;
  const [h, m] = parts;
  const [s, ms] = parts[2].split('.');
  return (+h) * 3600 + (+m) * 60 + (+s) + ((+ms || 0) / 1000);
};

// Convierte un nÃºmero de segundos de vuelta a formato de texto 00:00.000 para que el humano lo lea bien
const fmtMs = (sec) => {
  const m = Math.floor(sec / 60), s = Math.floor(sec - m * 60), ms = Math.round((sec - m * 60 - s) * 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
};

// Carga los datos guardados en la memoria temporal (sessionStorage)
function loadStaging() { try { const s = sessionStorage.getItem(SS_STAGING); return s ? JSON.parse(s) : { items: [] }; } catch (e) { return { items: [] }; } }

// Guarda los datos en la memoria temporal para que no se borren al refrescar por error
function saveStaging(obj) { sessionStorage.setItem(SS_STAGING, JSON.stringify(obj)); }

// FUNCIÃ“N CRÃTICA: Procesa el texto pegado. Soporta mÃºltiples bloques si se pegan varios nadadores juntos.
function parseMultipleBlocks(rawText) {
  // Divide el texto cada vez que encuentra la frase de inicio de Multi Timer
  const blocks = rawText.split(/Multi Timer Lista de vueltas/i).filter(b => b.trim().length > 10);
  return blocks.map(block => {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const metaLine = lines[0]; // La lÃ­nea que tiene el nombre y la carrera
    const mRace = metaLine.match(/\(([^)]+)\)/); // Busca lo que hay entre parÃ©ntesis para la carrera
    const carrera = mRace ? mRace[1].trim() : "Carrera N/D";
    const nadador = metaLine.split('(')[0].trim() || "Atleta N/D";

    // Busca dÃ³nde empiezan los nÃºmeros (debajo del encabezado NÃºmero;Duration;Vuelta)
    const headerIdx = lines.findIndex(l => /n[uÃº]mero/i.test(l) && /vuelta/i.test(l));
    const dataLines = lines.slice(headerIdx + 1);
    const rows = [];
    let lastDur = "";

    // Procesa cada lÃ­nea de tiempos separada por punto y coma (;)
    dataLines.forEach(l => {
      if (l.includes(';')) {
        const p = l.split(';').map(x => x.trim());
        if (p.length >= 3) {
          rows.push({ lap: p[0], duration: p[1], vuelta: p[2] });
          lastDur = p[2]; // Guarda el Ãºltimo tiempo para mostrarlo como "Total"
        }
      }
    });
    return { nadador, carrera, totalTxt: lastDur, rawRows: rows };
  });
}

// Dibuja la lista de nadadores en la secciÃ³n "Paso 2"
function renderStaging() {
  const cont = $('#summaryBody'); cont.innerHTML = '';
  loadStaging().items.forEach((it, idx) => {
    const div = document.createElement('div'); div.className = 'inline-row';
    div.innerHTML = `<div><b>${it.nadador}</b></div><div>${it.carrera}</div><div style="font-size:1.1rem; font-weight:700">${it.totalTxt}</div><button class="btn light" style="width:auto; padding:8px" onclick="viewDetails(${idx})">ðŸ” Ver</button>`;
    cont.appendChild(div);
  });
}

// Muestra los detalles de parciales en el modal. AquÃ­ ocurre el cÃ¡lculo de mejor/peor tiempo.
/*window.viewDetails = (idx) => {
  const it = loadStaging().items[idx];
  const modalTbody = $('#modalTbody');
  const metricsBox = $('#metrics');
  modalTbody.innerHTML = ''; metricsBox.innerHTML = '';
  $('#modalTitle').textContent = it.nadador;
  
  // Convierte todas las vueltas a segundos para comparar
  const secs = it.rawRows.map(r => toSec(r.vuelta));
  const min = Math.min(...secs), max = Math.max(...secs), delta = max - min;

  // Crea las filas de la tabla del modal
  it.rawRows.forEach((r, i) => {
    // Si el tiempo es el mÃ­nimo, pone fondo verde. Si es el mÃ¡ximo, fondo rojo.
    const style = secs[i] === min ? 'background:#B7E1C2' : (secs[i] === max ? 'background:#F5B5B5' : '');
    modalTbody.innerHTML += `<tr style="${style}"><td>${r.lap}</td><td>${r.duration}</td><td>${r.vuelta}</td></tr>`;
  });

  // Agrega los chips de resumen debajo de la tabla
  const metrics = [['Mejor', fmtMs(min)], ['Peor', fmtMs(max)], ['Var Î”', fmtMs(delta)]];
  metrics.forEach(([l, v]) => metricsBox.innerHTML += `<div class=\"chip\"><b>${l}:</b> ${v}</div>`);
  
  $('#modal').classList.add('open');
  $('.modal-body').scrollTop = 0; // Vuelve arriba el scroll del modal por si estaba abajo
};*/




window.viewDetails = (idx) => {
  const it = loadStaging().items[idx];
  const modalTbody = $('#modalTbody');
  const metricsBox = $('#metrics');
  modalTbody.innerHTML = ''; metricsBox.innerHTML = '';
  $('#modalTitle').textContent = it.nadador;

  const secs = it.rawRows.map(r => toSec(r.vuelta));

  // --- LÃ“GICA DE ESTADÃSTICAS ---
  const sorted = [...secs].sort((a, b) => a - b);

  // 1. CÃ¡lculo de Mediana
  const mid = Math.floor(sorted.length / 2);
  const mediana = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // 2. LÃ­mites para Top 3 (Mejores y Peores)
  const topMejoresLimite = sorted[2];
  const topPeoresLimite = sorted[sorted.length - 3];

  // --- RENDERIZADO DE LA TABLA ---
  it.rawRows.forEach((r, i) => {
    const val = secs[i];
    let style = '';
    let icono = '';

    if (val <= topMejoresLimite) {
      style = 'background:#B7E1C2; font-weight:bold;'; // Verde
    } else if (val >= topPeoresLimite) {
      style = 'background:#F5B5B5;'; // Rojo
    }

    modalTbody.innerHTML += `
          <tr style="${style}">
            <td>${r.lap}</td>
            <td>${r.duration}</td>
            <td>${r.vuelta}${icono}</td>
          </tr>`;
  });

  // --- RENDERIZADO DE CHIPS ---
  metricsBox.innerHTML = `
        <div class="chip"><b>Tiempo Total:</b> <span style="font-size:1.1rem">${it.totalTxt}</span></div>
        <div class="chip"><b>Mediana:</b> ${fmtMs(mediana)}</div>
      `;

  $('#modal').classList.add('open');
  $('.modal-body').scrollTop = 0;
};









// Evento al tocar "Cargar tiempos"
$('#btnLoad').addEventListener('click', () => {
  const results = parseMultipleBlocks($('#txtRaw').value);
  if (results.length) {
    const st = loadStaging(); st.items.push(...results); // Agrega los nuevos nadadores a la lista existente
    saveStaging(st);
    $('#txtRaw').value = ''; // Limpia el Ã¡rea de texto
    renderStaging(); // Redibuja la lista
    $('#status').textContent = `âœ” ${results.length} cargados`;
  }
});

// Evento al tocar "Confirmar y Guardar"
$('#btnConfirm').addEventListener('click', () => {
  sessionStorage.removeItem(SS_STAGING); // Borra la precarga
  renderStaging(); // Limpia la pantalla
  alert('Â¡Guardado!');
});

// Cierra el modal
$('#btnClose').addEventListener('click', () => $('#modal').classList.remove('open'));

// Ejecuta al iniciar para mostrar datos si ya habÃ­a algo cargado antes de refrescar
renderStaging();
