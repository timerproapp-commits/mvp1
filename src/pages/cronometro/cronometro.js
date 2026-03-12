let startTime = null;
let timerInterval = null;
let swimmers = [];
let currentRaceName = 'Carrera N/D';
let raceStarted = false;
let nextSwimmerId = 1;
const LONG_PRESS_MS = 900;
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
    raceStarted = false;
    nextSwimmerId = 1;

    for (let i = 0; i < num; i++) {
        addSwimmer();
    }

    document.getElementById('setup').style.display = 'none';
    document.getElementById('header-ui').style.display = 'flex';
    document.getElementById('run-controls').style.display = 'block';
    document.getElementById('add-swimmer-wrap').style.display = 'block';
}

function createSwimmerCard(swimmerId, defaultName) {
    return `
        <div class="lane-card" id="card-${swimmerId}">
            <div class="lane-header">
                <input type="text" class="lane-input" value="${defaultName}" id="name-${swimmerId}">
                <div class="lap-counter" id="laps-count-${swimmerId}">0</div>
                <button class="delete-swimmer-btn" onclick="removeSwimmer(${swimmerId})">Eliminar</button>
                <div class="lap-display">
                    <div class="last-lap-display" id="last-${swimmerId}">00:00.00</div>
                    <div class="last-lap-diff" id="lastdiff-${swimmerId}">00:00.00</div>
                </div>
            </div>
            <div class="btn-group">
                <button class="btn-lap" onclick="recordLap(${swimmerId})" id="lap-${swimmerId}" disabled>PARCIAL</button>
                <button class="btn-pause" onclick="toggleSwimmer(${swimmerId})" id="pause-${swimmerId}" disabled>🔴</button>
            </div>
        </div>
    `;
}

function bindLongPressToCard(swimmerId) {
    const card = document.getElementById(`card-${swimmerId}`);
    if (!card) return;

    let pressTimer = null;
    const clearPressTimer = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    const onPressStart = () => {
        if (raceStarted) return;
        clearPressTimer();
        pressTimer = setTimeout(() => {
            hideDeleteOptions();
            card.classList.add('show-delete');
        }, LONG_PRESS_MS);
    };

    const onPressEnd = () => clearPressTimer();

    card.addEventListener('pointerdown', onPressStart);
    card.addEventListener('pointerup', onPressEnd);
    card.addEventListener('pointerleave', onPressEnd);
    card.addEventListener('pointercancel', onPressEnd);
}

function hideDeleteOptions() {
    document.querySelectorAll('.lane-card.show-delete').forEach((card) => {
        card.classList.remove('show-delete');
    });
}

function addSwimmer() {
    if (raceStarted) return;

    const swimmerId = nextSwimmerId;
    nextSwimmerId += 1;

    const swimmerNumber = swimmers.length + 1;
    swimmers.push({ id: swimmerId, laps: [], final: null, active: true });

    const container = document.getElementById('lanes-container');
    container.insertAdjacentHTML('beforeend', createSwimmerCard(swimmerId, `NADADOR ${swimmerNumber}`));
    bindLongPressToCard(swimmerId);
}

function removeSwimmer(id) {
    if (raceStarted) return;
    if (swimmers.length <= 1) {
        alert('Debe quedar al menos 1 nadador.');
        return;
    }

    swimmers = swimmers.filter((sw) => sw.id !== id);
    const card = document.getElementById(`card-${id}`);
    if (card) card.remove();
}

function startGlobalTimer() {
    raceStarted = true;
    hideDeleteOptions();
    document.getElementById('add-swimmer-wrap').style.display = 'none';

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
    document.getElementById(`laps-count-${id}`).innerText = String(s.laps.length);
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
        if (!s.laps || s.laps.length === 0) return;

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

function goToTimerProAnalisis() {
    const exportText = buildMultiTimerExportText();
    if (exportText.trim()) {
        localStorage.setItem(IMPORT_CSV_BUFFER_KEY, exportText);
    }
    window.location.href = '../carga-tiempos/carga-tiempos.html';
}

function goToCargaExterna() {
    window.location.href = '../carga-externa/carga-externa.html';
}

function goToListaNadadores() {
    window.location.href = '../lista-nadadores/lista-nadadores.html';
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
    if (!event.target.closest('.lane-card')) {
        hideDeleteOptions();
    }
};