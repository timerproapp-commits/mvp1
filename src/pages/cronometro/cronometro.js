let startTime = null;
let timerInterval = null;
let swimmers = [];
let currentRaceName = 'Carrera N/D';
let raceStarted = false;
let nextSwimmerId = 1;
const LONG_PRESS_MS = 900;
const IMPORT_CSV_BUFFER_KEY = 'nado_import_csv_buffer';
const CRONO_STATE_KEY = 'nado_crono_state';
const CLUB_SWIMMERS_MOCK = [
    { id: 1, nombre: 'Lucia', apellido: 'Benitez', fechaNacimiento: '2015-09-21', sexo: 'F' },
    { id: 2, nombre: 'Tomas', apellido: 'Aguirre', fechaNacimiento: '2012-03-04', sexo: 'M' },
    { id: 3, nombre: 'Camila', apellido: 'Soria', fechaNacimiento: '2009-11-18', sexo: 'F' },
    { id: 4, nombre: 'Bruno', apellido: 'Maldonado', fechaNacimiento: '2006-07-30', sexo: 'M' },
    { id: 5, nombre: 'Alex', apellido: 'Roldan', fechaNacimiento: '2004-02-12', sexo: 'X' },
    { id: 6, nombre: 'Valentina', apellido: 'Pereyra', fechaNacimiento: '1999-05-09', sexo: 'F' }
];

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getSwimmerState(swimmerId) {
    return swimmers.find((sw) => sw.id === swimmerId);
}

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

function createSwimmerCard(swimmerId) {
    return `
        <div class="lane-card" id="card-${swimmerId}">
            <div class="lane-header">
                <div class="name-slot" id="name-slot-${swimmerId}"></div>
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

function renderNameSlot(swimmerId) {
    const swimmer = getSwimmerState(swimmerId);
    const slot = document.getElementById(`name-slot-${swimmerId}`);
    if (!swimmer || !slot) return;

    if (swimmer.nameMode === 'custom') {
        slot.innerHTML = `
            <div class="custom-name-wrap">
                <input
                    type="text"
                    class="lane-input"
                    id="name-custom-${swimmerId}"
                    placeholder="Escribe otro nadador"
                    value="${escapeHtml(swimmer.customName)}"
                    oninput="onCustomNameInput(${swimmerId}, this.value)">
                <button class="name-back-btn" id="name-back-${swimmerId}" onclick="switchToClubList(${swimmerId})">Lista</button>
            </div>
        `;
        return;
    }

    const optionsHtml = CLUB_SWIMMERS_MOCK.map((clubSwimmer) => {
        const selected = String(swimmer.selectedClubId) === String(clubSwimmer.id) ? 'selected' : '';
        return `<option value="${clubSwimmer.id}" ${selected}>${clubSwimmer.nombre} ${clubSwimmer.apellido} (${clubSwimmer.sexo})</option>`;
    }).join('');

    const placeholderClass = swimmer.selectedClubId ? '' : 'is-placeholder';
    slot.innerHTML = `
        <select
            id="name-select-${swimmerId}"
            class="lane-input lane-select ${placeholderClass}"
            onchange="onClubSelectChange(${swimmerId}, this.value)">
            <option value="" ${swimmer.selectedClubId ? '' : 'selected'}>Seleccionar nadador</option>
            <option value="other">Otro nadador</option>
            ${optionsHtml}
        </select>
    `;
}

window.onClubSelectChange = (swimmerId, value) => {
    const swimmer = getSwimmerState(swimmerId);
    if (!swimmer) return;

    if (value === 'other') {
        swimmer.nameMode = 'custom';
        swimmer.customName = '';
        swimmer.selectedClubId = '';
        renderNameSlot(swimmerId);
        return;
    }

    swimmer.nameMode = 'club';
    swimmer.customName = '';
    swimmer.selectedClubId = value || '';
    renderNameSlot(swimmerId);
};

window.onCustomNameInput = (swimmerId, value) => {
    const swimmer = getSwimmerState(swimmerId);
    if (!swimmer) return;
    swimmer.customName = value;
};

window.switchToClubList = (swimmerId) => {
    const swimmer = getSwimmerState(swimmerId);
    if (!swimmer) return;
    swimmer.nameMode = 'club';
    swimmer.customName = '';
    swimmer.selectedClubId = '';
    renderNameSlot(swimmerId);
};

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

    swimmers.push({
        id: swimmerId,
        laps: [],
        final: null,
        active: true,
        nameMode: 'club',
        selectedClubId: '',
        customName: ''
    });

    const container = document.getElementById('lanes-container');
    container.insertAdjacentHTML('beforeend', createSwimmerCard(swimmerId));
    renderNameSlot(swimmerId);
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
    const validationError = validateBeforeStart();
    if (validationError) {
        alert(validationError);
        return;
    }

    raceStarted = true;
    hideDeleteOptions();
    document.getElementById('add-swimmer-wrap').style.display = 'none';

    startTime = Date.now();
    let saveCounter = 0;
    timerInterval = setInterval(() => {
        document.getElementById('main-clock').innerText = formatTime(Date.now() - startTime);
        saveCounter++;
        if (saveCounter % 20 === 0) saveCronoState(); // guarda cada ~200ms
    }, 10);
    document.getElementById('run-controls').style.display = 'none';
    swimmers.forEach((s) => {
        setNameControlsDisabled(s.id, true);
        document.getElementById(`lap-${s.id}`).disabled = false;
        document.getElementById(`pause-${s.id}`).disabled = false;
        document.getElementById(`card-${s.id}`).classList.add('active-lane');
    });
    saveCronoState();
}

function setNameControlsDisabled(swimmerId, disabled) {
    const select = document.getElementById(`name-select-${swimmerId}`);
    const customInput = document.getElementById(`name-custom-${swimmerId}`);
    const backBtn = document.getElementById(`name-back-${swimmerId}`);
    if (select) select.disabled = disabled;
    if (customInput) customInput.disabled = disabled;
    if (backBtn) backBtn.disabled = disabled;
}

function validateBeforeStart() {
    const selectedClubIds = new Set();

    for (let i = 0; i < swimmers.length; i++) {
        const swimmer = swimmers[i];
        const laneNumber = i + 1;

        if (swimmer.nameMode === 'custom') {
            if (!(swimmer.customName || '').trim()) {
                return `Completa el nombre de "Otro nadador" en el carril ${laneNumber}.`;
            }
            continue;
        }

        if (!swimmer.selectedClubId) {
            return `Selecciona un nadador para el carril ${laneNumber}.`;
        }

        if (selectedClubIds.has(swimmer.selectedClubId)) {
            return 'No se puede repetir el mismo nadador del club en dos carriles.';
        }
        selectedClubIds.add(swimmer.selectedClubId);
    }

    return '';
}

function resolveSwimmerName(swimmer) {
    if (swimmer.nameMode === 'custom') {
        const custom = (swimmer.customName || '').trim();
        return custom || `NADADOR ${swimmer.id}`;
    }

    const clubSwimmer = CLUB_SWIMMERS_MOCK.find((item) => String(item.id) === String(swimmer.selectedClubId));
    if (clubSwimmer) {
        return `${clubSwimmer.nombre} ${clubSwimmer.apellido}`;
    }

    return `NADADOR ${swimmer.id}`;
}

function formatTime(ms) {
    const t = new Date(ms);
    const m = String(t.getUTCMinutes()).padStart(2, '0');
    const s = String(t.getUTCSeconds()).padStart(2, '0');
    const mil = String(Math.floor(t.getUTCMilliseconds() / 10)).padStart(2, '0');
    return `${m}:${s}.${mil}`;
}

function saveCronoState() {
    const numInput = document.getElementById('num-swimmers');
    const styleSelect = document.getElementById('race-style');
    const distInput = document.getElementById('race-distance');
    const state = {
        startTime: startTime,
        elapsed: startTime ? Date.now() - startTime : 0,
        swimmers: swimmers,
        currentRaceName: currentRaceName,
        raceStarted: raceStarted,
        nextSwimmerId: nextSwimmerId,
        setupConfig: {
            numSwimmers: numInput ? numInput.value : '',
            style: styleSelect ? styleSelect.value : '',
            distance: distInput ? distInput.value : ''
        }
    };
    sessionStorage.setItem(CRONO_STATE_KEY, JSON.stringify(state));
}

function restoreCronoState() {
    const raw = sessionStorage.getItem(CRONO_STATE_KEY);
    if (!raw) return;

    let state;
    try {
        state = JSON.parse(raw);
    } catch (e) {
        sessionStorage.removeItem(CRONO_STATE_KEY);
        return;
    }

    if (state.raceStarted) {
        swimmers = state.swimmers;
        currentRaceName = state.currentRaceName;
        raceStarted = state.raceStarted;
        nextSwimmerId = state.nextSwimmerId;

        document.getElementById('setup').style.display = 'none';
        document.getElementById('header-ui').style.display = 'flex';
        document.getElementById('run-controls').style.display = 'none';
        document.getElementById('add-swimmer-wrap').style.display = 'none';
        document.getElementById('race-name').textContent = currentRaceName;

        const container = document.getElementById('lanes-container');
        container.innerHTML = '';
        swimmers.forEach((sw) => {
            container.insertAdjacentHTML('beforeend', createSwimmerCard(sw.id));
            renderNameSlot(sw.id);
            bindLongPressToCard(sw.id);
            setNameControlsDisabled(sw.id, true);

            const lapBtn = document.getElementById(`lap-${sw.id}`);
            const pauseBtn = document.getElementById(`pause-${sw.id}`);
            if (lapBtn) lapBtn.disabled = false;
            if (pauseBtn) pauseBtn.disabled = false;

            if (sw.laps && sw.laps.length > 0) {
                document.getElementById(`last-${sw.id}`).innerText = sw.laps[sw.laps.length - 1];
                document.getElementById(`laps-count-${sw.id}`).innerText = String(sw.laps.length);
            }

            const card = document.getElementById(`card-${sw.id}`);
            if (!sw.active) {
                const btn = document.getElementById(`pause-${sw.id}`);
                if (btn) { btn.innerText = '\u267B\uFE0F'; btn.style.background = '#555'; btn.style.color = 'white'; }
                if (card) card.classList.add('paused-lane');
            } else {
                if (card) card.classList.add('active-lane');
            }
        });

        const elapsed = state.elapsed || 0;
        startTime = Date.now() - elapsed;
        timerInterval = setInterval(() => {
            document.getElementById('main-clock').innerText = formatTime(Date.now() - startTime);
        }, 10);

    } else if (state.setupConfig) {
        const numInput = document.getElementById('num-swimmers');
        const styleSelect = document.getElementById('race-style');
        const distInput = document.getElementById('race-distance');
        if (numInput && state.setupConfig.numSwimmers) numInput.value = state.setupConfig.numSwimmers;
        if (styleSelect && state.setupConfig.style) styleSelect.value = state.setupConfig.style;
        if (distInput && state.setupConfig.distance) distInput.value = state.setupConfig.distance;
    }
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
    saveCronoState();
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
    saveCronoState();
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

        const nombre = resolveSwimmerName(s);
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

function openAnalisisConfirmModal() {
    const modal = document.getElementById('confirm-analisis-modal');
    if (!modal) return;
    modal.style.display = 'flex';
}

function closeAnalisisConfirmModal() {
    const modal = document.getElementById('confirm-analisis-modal');
    if (!modal) return;
    modal.style.display = 'none';
}

function openRefreshConfirmModal() {
    const modal = document.getElementById('confirm-refresh-modal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
}

function closeRefreshConfirmModal() {
    const modal = document.getElementById('confirm-refresh-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
}

function proceedToAnalisis() {
    const exportText = buildMultiTimerExportText();
    if (exportText.trim()) {
        localStorage.setItem(IMPORT_CSV_BUFFER_KEY, exportText);
    }

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    sessionStorage.removeItem(CRONO_STATE_KEY);

    if (window.TPANavigation) {
        window.TPANavigation.goTo('cargaTiempos', { from: 'cronometro', locked: '1' });
        return;
    }
    window.location.href = '../carga-tiempos/carga-tiempos.html';
}

function goToTimerProAnalisis() {
    openAnalisisConfirmModal();
}

function resetRaceToReadyState() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    startTime = null;
    raceStarted = false;
    hideDeleteOptions();
    sessionStorage.removeItem(CRONO_STATE_KEY);

    const clock = document.getElementById('main-clock');
    if (clock) clock.innerText = '00:00.00';

    const runControls = document.getElementById('run-controls');
    if (runControls) runControls.style.display = 'block';

    const addWrap = document.getElementById('add-swimmer-wrap');
    if (addWrap) addWrap.style.display = 'block';

    swimmers.forEach((s) => {
        s.laps = [];
        s.final = null;
        s.active = true;

        const lapBtn = document.getElementById(`lap-${s.id}`);
        const pauseBtn = document.getElementById(`pause-${s.id}`);
        const card = document.getElementById(`card-${s.id}`);
        const lastLap = document.getElementById(`last-${s.id}`);
        const lastDiff = document.getElementById(`lastdiff-${s.id}`);
        const lapsCount = document.getElementById(`laps-count-${s.id}`);

        if (lapBtn) lapBtn.disabled = true;
        if (pauseBtn) {
            pauseBtn.disabled = true;
            pauseBtn.innerText = '🔴';
            pauseBtn.style.background = 'var(--pause)';
            pauseBtn.style.color = 'black';
        }
        if (card) {
            card.classList.remove('active-lane');
            card.classList.remove('paused-lane');
        }
        if (lastLap) lastLap.innerText = '00:00.00';
        if (lastDiff) lastDiff.innerText = '00:00.00';
        if (lapsCount) lapsCount.innerText = '0';

        setNameControlsDisabled(s.id, false);
    });
}

function resetCronoState() {
    resetRaceToReadyState();

    document.getElementById('header-ui').style.display = 'none';
    document.getElementById('setup').style.display = 'block';
}

function goToHome() {
    if (window.TPANavigation) {
        window.TPANavigation.goTo('home', { from: 'cronometro' });
        return;
    }
    window.location.href = '../../app/index.html';
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

restoreCronoState();

const confirmNoBtn = document.getElementById('btnConfirmNo');
const confirmSiBtn = document.getElementById('btnConfirmSi');
const btnRefreshReset = document.getElementById('btnRefreshReset');
const btnRefreshCancel = document.getElementById('btnRefreshCancel');
if (confirmNoBtn) {
    confirmNoBtn.addEventListener('click', closeAnalisisConfirmModal);
}
if (confirmSiBtn) {
    confirmSiBtn.addEventListener('click', () => {
        closeAnalisisConfirmModal();
        proceedToAnalisis();
    });
}
if (btnRefreshReset) {
    btnRefreshReset.addEventListener('click', () => {
        closeRefreshConfirmModal();
        resetRaceToReadyState();
    });
}
if (btnRefreshCancel) {
    btnRefreshCancel.addEventListener('click', closeRefreshConfirmModal);
}

function askAndResetRace() {
    if (!raceStarted) return;
    openRefreshConfirmModal();
}

window.addEventListener('keydown', (e) => {
    const isF5 = e.key === 'F5';
    const isCtrlR = (e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R');

    if (!raceStarted || (!isF5 && !isCtrlR)) return;

    e.preventDefault();
    askAndResetRace();
});

window.addEventListener('beforeunload', (e) => {
    if (!raceStarted) return;

    // Respaldo para refresh desde UI del navegador (mobile/desktop).
    e.preventDefault();
    e.returnValue = '';
});

window.onclick = function (event) {
    if (!event.target.matches('.dots-btn')) {
        document.getElementById('myDropdown').style.display = 'none';
    }
    if (!event.target.closest('.lane-card')) {
        hideDeleteOptions();
    }
    if (event.target && event.target.id === 'confirm-analisis-modal') {
        closeAnalisisConfirmModal();
    }
    if (event.target && event.target.id === 'confirm-refresh-modal') {
        closeRefreshConfirmModal();
    }
};