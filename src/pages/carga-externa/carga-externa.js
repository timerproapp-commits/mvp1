const IMPORT_CSV_BUFFER_KEY = 'nado_import_csv_buffer';
const CSV_DRAFT_KEY = 'nado_csv_textarea_draft';
const $ = (s) => document.querySelector(s);

function parseMultipleBlocks(rawText) {
    const blocks = rawText.split(/Multi Timer Lista de vueltas/i).filter(b => b.trim().length > 10);
    return blocks.map(block => {
        const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const metaLine = lines[0] || '';
        const mRace = metaLine.match(/\(([^)]+)\)/);
        const carrera = mRace ? mRace[1].trim() : 'Carrera N/D';
        const nadador = metaLine.split('(')[0].trim() || 'Atleta N/D';
        const headerIdx = lines.findIndex(l => /n[uú]mero/i.test(l) && /vuelta/i.test(l));
        const dataLines = lines.slice(headerIdx + 1);
        const rows = [];

        dataLines.forEach((l) => {
            if (!l.includes(';')) return;
            const p = l.split(';').map(x => x.trim());
            if (p.length >= 3) {
                rows.push({ lap: p[0], duration: p[1], vuelta: p[2] });
            }
        });

        return { nadador, carrera, rawRows: rows };
    }).filter((item) => item.rawRows.length > 0);
}

$('#btnLoad').addEventListener('click', () => {
    const raw = $('#txtRaw').value || '';
    const status = $('#status');

    const parsed = parseMultipleBlocks(raw);
    if (!parsed.length) {
        status.textContent = 'No se detectaron bloques validos para cargar.';
        return;
    }

    localStorage.setItem(IMPORT_CSV_BUFFER_KEY, raw);
    sessionStorage.removeItem(CSV_DRAFT_KEY);
    if (window.TPANavigation) {
        window.TPANavigation.goTo('cargaTiempos', { from: 'cargaExterna' });
        return;
    }
    window.location.href = '../carga-tiempos/carga-tiempos.html';
});

$('#btnBack').addEventListener('click', () => {
    if (window.TPANavigation) {
        window.TPANavigation.goTo('home');
        return;
    }
    window.location.href = '../../app/index.html';
});

const txtRaw = $('#txtRaw');
const savedDraft = sessionStorage.getItem(CSV_DRAFT_KEY);
if (savedDraft) txtRaw.value = savedDraft;
txtRaw.addEventListener('input', () => {
    sessionStorage.setItem(CSV_DRAFT_KEY, txtRaw.value);
});
