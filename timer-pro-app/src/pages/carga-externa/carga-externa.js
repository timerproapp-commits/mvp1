// -----------------------------------------------------------------------------
// CARGA EXTERNA
// -----------------------------------------------------------------------------
// Esta pantalla recibe un texto tipo CSV exportado desde Multi Timer,
// lo valida minimamente y lo deja en buffer para que luego la pantalla
// de carga-tiempos haga el procesamiento completo.
// ABAP analogia: staging area (tabla temporal) antes del commit final.

const IMPORT_CSV_BUFFER_KEY = 'nado_import_csv_buffer';
const CSV_DRAFT_KEY = 'nado_csv_textarea_draft';
// Alias corto para querySelector. Similar a crear una macro/helper local.
const $ = (s) => document.querySelector(s);

function parseMultipleBlocks(rawText) {
    // Un mismo pegado puede traer varios bloques "Multi Timer".
    // Lo partimos por cabecera.
    const blocks = rawText.split(/Multi Timer Lista de vueltas/i).filter(b => b.trim().length > 10);
    return blocks.map(block => {
        // Normalizamos lineas: trim + quitamos vacias.
        const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const metaLine = lines[0] || '';
        // Carrera viene entre parentesis: "Nombre (Libre 100m)".
        const mRace = metaLine.match(/\(([^)]+)\)/);
        const carrera = mRace ? mRace[1].trim() : 'Carrera N/D';
        const nadador = metaLine.split('(')[0].trim() || 'Atleta N/D';
        // Buscamos cabecera para saber donde empiezan filas de tiempos.
        const headerIdx = lines.findIndex(l => /n[uú]mero/i.test(l) && /vuelta/i.test(l));
        const dataLines = lines.slice(headerIdx + 1);
        const rows = [];

        dataLines.forEach((l) => {
            // Formato esperado: Numero;Duration;Vuelta
            if (!l.includes(';')) return;
            const p = l.split(';').map(x => x.trim());
            if (p.length >= 3) {
                rows.push({ lap: p[0], duration: p[1], vuelta: p[2] });
            }
        });

        // Devolvemos estructura intermedia.
        return { nadador, carrera, rawRows: rows };
        // Ejemplo resultado:
        // {
        //   nadador: 'Juan Perez',
        //   carrera: 'Libre 100m',
        //   rawRows: [ { lap:'1', duration:'00:25.30', vuelta:'00:25.30' } ]
        // }
    }).filter((item) => item.rawRows.length > 0);
}

$('#btnLoad').addEventListener('click', () => {
    // Lee textarea de entrada.
    const raw = $('#txtRaw').value || '';
    const status = $('#status');

    // Validacion rapida de estructura minima.
    const parsed = parseMultipleBlocks(raw);
    if (!parsed.length) {
        status.textContent = 'No se detectaron bloques validos para cargar.';
        return;
    }

    // Guardamos el texto RAW para que la siguiente pantalla lo procese.
    // ABAP analogia: exportar payload a memoria compartida antes de navegar.
    localStorage.setItem(IMPORT_CSV_BUFFER_KEY, raw);
    // Borramos borrador porque la carga se considero valida.
    sessionStorage.removeItem(CSV_DRAFT_KEY);
    if (window.TPANavigation) {
        window.TPANavigation.goTo('cargaTiempos', { from: 'cargaExterna' });
        return;
    }
    window.location.href = '../carga-tiempos/carga-tiempos.html';
});

$('#btnBack').addEventListener('click', () => {
    // Navegacion de retorno a Home.
    if (window.TPANavigation) {
        window.TPANavigation.goTo('home');
        return;
    }
    window.location.href = '../../app/index.html';
});

const txtRaw = $('#txtRaw');
// Recupera borrador previo (si el usuario salio sin cargar).
const savedDraft = sessionStorage.getItem(CSV_DRAFT_KEY);
if (savedDraft) txtRaw.value = savedDraft;
txtRaw.addEventListener('input', () => {
    // Autosave del textarea en cada cambio.
    sessionStorage.setItem(CSV_DRAFT_KEY, txtRaw.value);
});
