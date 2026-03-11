let startTime = null;
let timerInterval = null;
let swimmers = [];
let currentRaceName = 'Carrera N/D';
const IMPORT_CSV_BUFFER_KEY = 'nado_import_csv_buffer';

function toggleMenu() {
    const dot = document.getElementById('myDropdown');
    dot.style.display = dot.style.display === 'block' ? 'none' : 'block';
}

function initRace() {
    const numRaw = document.getElementById('num-swimmers').value;
    const style = document.getElementById('race-style').value;
    const distanceRaw = document.getElementById('race-distance').value;
    const setupError = document.getElementById('setup-error');

    const num = parseInt(numRaw, 10);
    const distance = parseInt(distanceRaw, 10);

    if (!Number.isInteger(num) || num <= 0) {
        setupError.textContent = 'Ingresa una cantidad de nadadores valida.';
        return;
    }
    if (!style) {
        setupError.textContent = 'Selecciona un estilo para la carrera.';
        return;
    }
    if (!Number.isInteger(distance) || distance <= 0) {
        setupError.textContent = 'La distancia debe ser un numero entero mayor a 0.';
        return;
    }

    setupError.textContent = '';
    currentRaceName = `${style} ${distance}m`;
    document.getElementById('race-name').textContent = currentRaceName;

    const container = document.getElementById('lanes-container');
    container.innerHTML = '';
    swimmers = [];

    for (let i = 1; i <= num; i++) {
        swimmers.push({ id: i, laps: [], final: null, active: true });
        container.innerHTML += `
            <div class="lane-card" id="card-${i}">
                <div class="lane-header">
                    <input type="text" class="lane-input" value="NADADOR ${i}" id="name-${i}">
                    <div class="lap-display">
                        <div class="last-lap-display" id="last-${i}">00:00.00</div>
                        <div class="last-lap-diff" id="lastdiff-${i}">00:00.00</div>
                    </div>
                </div>
                <div class="btn-group">
                    <button class="btn-lap" onclick="recordLap(${i})" id="lap-${i}" disabled>PARCIAL</button>
                    <button class="btn-pause" onclick="toggleSwimmer(${i})" id="pause-${i}" disabled>🔴</button>
                </div>
            </div>
        `;
    }

    document.getElementById('setup').style.display = 'none';
    document.getElementById('header-ui').style.display = 'flex';
    document.getElementById('run-controls').style.display = 'block';
}

function startGlobalTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        document.getElementById('main-clock').innerText = formatTime(Date.now() - startTime);
    }, 10);
    document.getElementById('run-controls').style.display = 'none';
    swimmers.forEach((s) => {
        document.getElementById(`lap-${s.id}`).disabled = false;
        document.getElementById(`pause-${s.id}`).disabled = false;
        document.getElementById(`card-${s.id}`).classList.add('active-lane');
    });
}

function formatTime(ms) {
    const t = new Date(ms);
    const m = String(t.getUTCMinutes()).padStart(2, '0');
    const s = String(t.getUTCSeconds()).padStart(2, '0');
    const mil = String(Math.floor(t.getUTCMilliseconds() / 10)).padStart(2, '0');
    return `${m}:${s}.${mil}`;
}

// helper para convertir "MM:SS.cc" a centesimas
function toCentis(t) {
    const [mmss, cc = '00'] = String(t).split('.');
    const [mm = '00', ss = '00'] = (mmss || '').split(':');
    return (parseInt(mm || 0, 10) * 60 + parseInt(ss || 0, 10)) * 100 + parseInt(cc || 0, 10);
}

function recordLap(id) {
    const s = swimmers.find((sw) => sw.id === id);
    if (!s.active) return;

    const nowMs = Date.now() - startTime;
    const timeStr = formatTime(nowMs);

    let lapCentis;
    if (s.laps.length === 0) {
        lapCentis = toCentis(timeStr);
    } else {
        lapCentis = toCentis(timeStr) - toCentis(s.laps[s.laps.length - 1]);
    }
    const lapStr = formatTime(lapCentis * 10);

    s.laps.push(timeStr);
    document.getElementById(`last-${id}`).innerText = timeStr;
    document.getElementById(`lastdiff-${id}`).innerText = lapStr;
}

function toggleSwimmer(id) {
    const s = swimmers.find((sw) => sw.id === id);
    const btn = document.getElementById(`pause-${id}`);
    const card = document.getElementById(`card-${id}`);

    if (s.active) {
        s.final = formatTime(Date.now() - startTime);
        s.active = false;
        btn.innerText = '♻️';
        btn.style.background = '#555';
        btn.style.color = 'white';
        card.classList.replace('active-lane', 'paused-lane');
    } else {
        s.active = true;
        btn.innerText = '🔴';
        btn.style.background = 'var(--pause)';
        btn.style.color = 'black';
        card.classList.replace('paused-lane', 'active-lane');
    }
}

function buildMultiTimerExportText() {
    const parseToCentis = (t) => {
        const [mmss, cc = '00'] = String(t).split('.');
        const [mm = '00', ss = '00'] = (mmss || '').split(':');
        return (parseInt(mm || 0, 10) * 60 + parseInt(ss || 0, 10)) * 100 + parseInt(cc || 0, 10);
    };
    const fmtFromCentis = (centis) => {
        const totalSec = Math.floor(centis / 100);
        const cc = String(centis % 100).padStart(2, '0');
        const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
        const ss = String(totalSec % 60).padStart(2, '0');
        return `${mm}:${ss}.${cc}`;
    };

    const lines = [];
    swimmers.forEach((s) => {
        const nombre = document.getElementById(`name-${s.id}`)?.value || `NADADOR ${s.id}`;
        const raceMeta = currentRaceName || 'Carrera N/D';

        lines.push('Multi Timer Lista de vueltas');
        lines.push(`${nombre} (${raceMeta})`);
        lines.push('Numero ; Duration ; Vuelta');

        let prev = 0;
        if (s.laps.length === 0 && s.final) {
            const dur = parseToCentis(s.final);
            lines.push(`1 ; ${fmtFromCentis(dur)} ; ${fmtFromCentis(dur)}`);
        } else {
            s.laps.forEach((durStr, idx) => {
                const dur = parseToCentis(durStr);
                const lap = Math.max(dur - prev, 0);
                prev = dur;
                lines.push(`${idx + 1} ; ${fmtFromCentis(dur)} ; ${fmtFromCentis(lap)}`);
            });
        }
    });

    return lines.join('\r\n');
}

function goToCargaTiempos() {
    const exportText = buildMultiTimerExportText();
    if (exportText.trim()) {
        localStorage.setItem(IMPORT_CSV_BUFFER_KEY, exportText);
    }
    window.location.href = '../carga-tiempos/carga-tiempos.html';
}

function downloadCSV() {
    toggleMenu?.();

    const blob = new Blob([buildMultiTimerExportText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'multi_timer_export.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

window.onclick = function (event) {
    if (!event.target.matches('.dots-btn')) {
        document.getElementById('myDropdown').style.display = 'none';
    }
};