// --- LÓGICA DE DATOS ---
// Esta pantalla es una "zona de staging" para revisar tiempos antes de confirmar.
// ABAP analogia:
// - SS_STAGING ~ memoria temporal tipo EXPORT TO MEMORY ID.
// - items[] ~ internal table con resultados parseados.
// - modal de detalle ~ doble click sobre ALV para ver linea detallada.
const SS_STAGING = 'nado_staging_session'; // Nombre de la "llave" para guardar datos temporales en el navegador
const IMPORT_CSV_BUFFER_KEY = 'nado_import_csv_buffer';
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
function loadStaging() {
    try {
        // Lee JSON y lo transforma a objeto JS.
        const s = sessionStorage.getItem(SS_STAGING);
        return s ? JSON.parse(s) : { items: [] };
    } catch (e) {
        // Fallback defensivo ante JSON corrupto.
        return { items: [] };
    }
}

// Guarda los datos en la memoria temporal para que no se borren al refrescar por error
function saveStaging(obj) {
    sessionStorage.setItem(SS_STAGING, JSON.stringify(obj));
}

function getStatusBox() {
    // Punto unico de acceso al label de estado para no repetir querySelector.
    return document.querySelector('#status');
}

function buildSummaryShareText() {
    // Construye un TXT legible para copiar/pegar en WhatsApp, mail, etc.
    // ABAP analogia: similar a armar un spool/export de reporte en texto plano.
    const items = loadStaging().items || [];
    if (!items.length) return '';

    const lines = [];
    lines.push('Resumen de precarga - Timer Pro App');
    lines.push(`Total nadadores: ${items.length}`);
    lines.push('');

    items.forEach((it, idx) => {
        const vueltas = it.rawRows || [];
        // secs = lista de parciales convertidos a numero para estadistica.
        const secs = vueltas.map(r => toSec(r.vuelta)).filter(v => Number.isFinite(v));
        const sorted = [...secs].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const mediana = sorted.length
            ? (sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2)
            : 0;

        const topMejores = sorted.slice(0, 3).map(v => fmtMs(v));
        const topPeores = sorted.slice(-3).reverse().map(v => fmtMs(v));

        lines.push(`${idx + 1}. ${it.nadador}`);
        lines.push(`Carrera: ${it.carrera}`);
        lines.push(`Total: ${it.totalTxt || 'N/D'}`);
        lines.push(`Parciales: ${vueltas.length}`);
        lines.push(`Mediana: ${fmtMs(mediana)}`);
        lines.push(`Top mejores: ${topMejores.join(', ') || 'N/D'}`);
        lines.push(`Top peores: ${topPeores.join(', ') || 'N/D'}`);
        lines.push('');
    });

    return lines.join('\n');
}

async function copySummaryToClipboard() {
    // Flujo async porque clipboard API retorna Promise.
    const text = buildSummaryShareText();
    const status = getStatusBox();
    if (!text) {
        if (status) status.textContent = 'No hay datos en la revision para copiar.';
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        if (status) status.textContent = 'Resumen copiado al portapapeles.';
    } catch (e) {
        if (status) status.textContent = 'No se pudo copiar automaticamente. Intenta descargar TXT.';
    }
}

function downloadSummaryTxt() {
    // Descarga local de archivo .txt (sin backend).
    const text = buildSummaryShareText();
    const status = getStatusBox();
    if (!text) {
        if (status) status.textContent = 'No hay datos en la revision para descargar.';
        return;
    }

    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    // createObjectURL genera una URL temporal apuntando al blob en memoria.
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen-precarga-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if (status) status.textContent = 'Resumen descargado en TXT.';
}

// FUNCIÓN CRÍTICA: Procesa el texto pegado. Soporta múltiples bloques si se pegan varios nadadores juntos.
function parseMultipleBlocks(rawText) {
    // Divide el texto cada vez que encuentra la frase de inicio de Multi Timer
    const blocks = rawText.split(/Multi Timer Lista de vueltas/i).filter(b => b.trim().length > 10);
    return blocks.map(block => {
        const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const metaLine = lines[0]; // La línea que tiene el nombre y la carrera
        const mRace = metaLine.match(/\(([^)]+)\)/); // Busca lo que hay entre paréntesis para la carrera
        const carrera = mRace ? mRace[1].trim() : 'Carrera N/D';
        const nadador = metaLine.split('(')[0].trim() || 'Atleta N/D';

        // Busca dónde empiezan los números (debajo del encabezado Número;Duration;Vuelta)
        const headerIdx = lines.findIndex(l => /n[uú]mero/i.test(l) && /vuelta/i.test(l));
        const dataLines = lines.slice(headerIdx + 1);
        const rows = [];
        // lastDur guarda ultimo tiempo para mostrar resumen rapido.
        let lastDur = '';

        // Procesa cada línea de tiempos separada por punto y coma (;)
        dataLines.forEach(l => {
            if (l.includes(';')) {
                const p = l.split(';').map(x => x.trim());
                if (p.length >= 3) {
                    // Estructura por fila:
                    // p[0] -> numero de parcial
                    // p[1] -> duration (acumulado)
                    // p[2] -> vuelta (tiempo de ese parcial)
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
    // Render completo (limpiar y volver a pintar).
    // ABAP analogia: REFRESH alv + LOOP AT itab para repintar salida.
    const cont = $('#summaryBody');
    cont.innerHTML = '';
    loadStaging().items.forEach((it, idx) => {
        const div = document.createElement('div');
        div.className = 'inline-row';
        div.innerHTML = `<div><b>${it.nadador}</b></div><div>${it.carrera}</div><div style="font-size:1.1rem; font-weight:700">${it.totalTxt}</div><button class="btn light" style="width:auto; padding:8px" onclick="viewDetails(${idx})">🔍 Ver</button>`;
        cont.appendChild(div);
    });
}

window.viewDetails = (idx) => {
    // Handler global para boton inline "Ver".
    const it = loadStaging().items[idx];
    const modalTbody = $('#modalTbody');
    const metricsBox = $('#metrics');
    modalTbody.innerHTML = '';
    metricsBox.innerHTML = '';
    $('#modalTitle').textContent = it.nadador;

    const secs = it.rawRows.map(r => toSec(r.vuelta));
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

        if (val <= topMejoresLimite) {
            style = 'background:#B7E1C2; font-weight:bold;'; // Verde
        } else if (val >= topPeoresLimite) {
            style = 'background:#F5B5B5;'; // Rojo
        }

        modalTbody.innerHTML += `
      <tr style="${style}">
        <td>${r.lap}</td>
        <td>${r.duration}</td>
        <td>${r.vuelta}</td>
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

// Evento al tocar "Confirmar y Guardar"
$('#btnConfirm').addEventListener('click', () => {
    // MVP actual: "Guardar" limpia staging y muestra aviso.
    // En version futura esto podria persistir en backend/API.
    sessionStorage.removeItem(SS_STAGING); // Borra la precarga
    renderStaging(); // Limpia la pantalla
    alert('¡Guardado!');
    onFlowComplete();
});

$('#btnCopySummary').addEventListener('click', () => {
    // Copiar y habilitar boton "Cargar nuevos tiempos".
    copySummaryToClipboard();
    onFlowComplete();
});

$('#btnDownloadSummary').addEventListener('click', () => {
    downloadSummaryTxt();
    onFlowComplete();
});

// --- FUNCIONES DE COMPARTIR (MAIL Y WHATSAPP) ---
// Configuracion de destinatarios
// ABAP analogia: constantes de configuracion tipo parametros de programa.
const SHARE_CONFIG = {
    mailRecipient: 'entrenandoteam@gmail.com',
    whatsappPhone: '5493413471972' // Formato internacional sin +
};

function sendSummaryViaEmail() {
    // Construye y abre mailto link con resumen de resultados.
    // Este flujo abre el cliente de mail default del usuario.
    const text = buildSummaryShareText();
    const status = getStatusBox();

    if (!text) {
        if (status) status.textContent = 'No hay datos en la revision para enviar.';
        return;
    }

    const subject = 'Resultados de entrenamiento - Timer Pro App';
    const mailtoURL = `mailto:${SHARE_CONFIG.mailRecipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

    try {
        window.location.href = mailtoURL;
        if (status) status.textContent = '✅ Abriendo cliente de email...';
    } catch (e) {
        if (status) status.textContent = '❌ No se pudo abrir el cliente de mail.';
    }
}

function sendSummaryViaWhatsApp() {
    // Construye y abre link de WhatsApp Web o app móvil con resumen.
    // URL: https://wa.me/<PHONE>?text=<MESSAGE>
    // ABAP analogia: similar a una llamada de funcion externa (RFC).
    const text = buildSummaryShareText();
    const status = getStatusBox();

    if (!text) {
        if (status) status.textContent = 'No hay datos en la revision para enviar.';
        return;
    }

    const waURL = `https://wa.me/${SHARE_CONFIG.whatsappPhone}?text=${encodeURIComponent(text)}`;

    try {
        window.open(waURL, '_blank');
        if (status) status.textContent = '✅ Abriendo WhatsApp...';
    } catch (e) {
        if (status) status.textContent = '❌ No se pudo abrir WhatsApp.';
    }
}

$('#btnSendEmail').addEventListener('click', () => {
    sendSummaryViaEmail();
    onFlowComplete();
});

$('#btnSendWhatsApp').addEventListener('click', () => {
    sendSummaryViaWhatsApp();
    onFlowComplete();
});

function onFlowComplete() {
    // Al finalizar el flujo de revision, permitimos volver a iniciar ciclo.
    const newLoadBtn = $('#btnNewLoad');
    if (newLoadBtn) newLoadBtn.style.display = 'block';
}

$('#btnNewLoad').addEventListener('click', () => {
    // Limpieza total de buffers temporales.
    // ABAP analogia: CLEAR / FREE de estructuras temporales antes de nuevo proceso.
    sessionStorage.removeItem(SS_STAGING);
    sessionStorage.removeItem('nado_crono_state');
    sessionStorage.removeItem('nado_csv_textarea_draft');
    localStorage.removeItem(IMPORT_CSV_BUFFER_KEY);

    if (window.TPANavigation) {
        window.TPANavigation.goTo('home');
        return;
    }
    window.location.href = '../../app/index.html';
});

// Cierra el modal
$('#btnClose').addEventListener('click', () => $('#modal').classList.remove('open'));

// Ejecuta al iniciar para cargar automaticamente datos importados desde Cronometro o Carga Externa
function importBufferedCsvToStaging() {
    // Este buffer es puente entre pantallas (localStorage).
    const importedCsv = localStorage.getItem(IMPORT_CSV_BUFFER_KEY);
    if (!importedCsv) return;

    // Parseamos y anexamos al staging actual.
    const results = parseMultipleBlocks(importedCsv);
    if (results.length) {
        const st = loadStaging();
        st.items.push(...results);
        saveStaging(st);
    }

    const status = $('#status');
    if (status) {
        status.textContent = results.length
            ? `CSV importado automaticamente (${results.length} nadador(es)).`
            : 'No se detectaron bloques validos en el CSV importado.';
    }

    localStorage.removeItem(IMPORT_CSV_BUFFER_KEY);
}

// Bootstrapping de pantalla: 1) importar si hay buffer, 2) renderizar lista.
importBufferedCsvToStaging();
renderStaging();
