// -----------------------------------------------------------------------------
// LISTA DE NADADORES (MVP / MOCK)
// -----------------------------------------------------------------------------
// Pantalla de mantenimiento basico (alta, cambio, baja) sobre datos mock.
// ABAP analogia:
// - swimmers ~ internal table en memoria
// - render() ~ ALV refresh
// - selectedId ~ linea actualmente seleccionada

const MOCK_SWIMMERS = [
    { id: 1, nombre: 'Lucia', apellido: 'Benitez', fechaNacimiento: '2015-09-21', sexo: 'F' },
    { id: 2, nombre: 'Tomas', apellido: 'Aguirre', fechaNacimiento: '2012-03-04', sexo: 'M' },
    { id: 3, nombre: 'Camila', apellido: 'Soria', fechaNacimiento: '2009-11-18', sexo: 'F' },
    { id: 4, nombre: 'Bruno', apellido: 'Maldonado', fechaNacimiento: '2006-07-30', sexo: 'M' },
    { id: 5, nombre: 'Alex', apellido: 'Roldan', fechaNacimiento: '2004-02-12', sexo: 'X' },
    { id: 6, nombre: 'Valentina', apellido: 'Pereyra', fechaNacimiento: '1999-05-09', sexo: 'F' }
];

let swimmers = [...MOCK_SWIMMERS];
let selectedId = null;
// Helper corto para seleccionar elementos del DOM.
const $ = (s) => document.querySelector(s);

function formatDateToUi(isoDate) {
    // Convierte YYYY-MM-DD -> DD/MM/YYYY
    // Similar a conversion exit para formato de salida en ABAP.
    const [y, m, d] = String(isoDate).split('-');
    return `${d}/${m}/${y}`;
}

function render() {
    // Redibujo completo de la lista.
    // Patron simple y robusto para UI pequenas: clear + append.
    const container = $('#listContainer');
    container.innerHTML = '';

    swimmers.forEach((swimmer) => {
        const row = document.createElement('label');
        row.className = 'list-row';
        row.innerHTML = `
      <input type="radio" name="selected-swimmer" value="${swimmer.id}" ${selectedId === swimmer.id ? 'checked' : ''}>
      <div class="row-main">
        <div class="row-title">${swimmer.nombre} ${swimmer.apellido} (${swimmer.sexo})</div>
        <div class="row-meta">ID: ${swimmer.id} | Nacimiento: ${formatDateToUi(swimmer.fechaNacimiento)}</div>
      </div>
    `;

        const radio = row.querySelector('input[type="radio"]');
        radio.addEventListener('change', () => {
            // Guardamos seleccion activa para operaciones editar/eliminar.
            selectedId = swimmer.id;
            $('#status').textContent = '';
        });

        container.appendChild(row);
    });
}

function nextId() {
    // Busca max ID y suma 1.
    // ABAP analogia: REDUCE max + 1 sobre itab.
    return swimmers.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function addMockSwimmer() {
    // Alta mock: usa set de ejemplos para poblar datos rapidos.
    const id = nextId();
    const seeded = [
        { nombre: 'Nadia', apellido: 'Ferreiro', fechaNacimiento: '2013-08-25', sexo: 'F' },
        { nombre: 'Santino', apellido: 'Lopez', fechaNacimiento: '2010-01-14', sexo: 'M' },
        { nombre: 'Dylan', apellido: 'Acosta', fechaNacimiento: '2007-10-06', sexo: 'X' }
    ];
    // Elegimos muestra por modulo para rotar ejemplos.
    const sample = seeded[(id - 1) % seeded.length];
    swimmers.push({ id, ...sample });
    selectedId = id;
    render();
    $('#status').textContent = `Nadador mock agregado (ID ${id}).`;
}

function editSelectedSwimmer() {
    // Validacion previa: debe haber seleccion.
    if (!selectedId) {
        $('#status').textContent = 'Selecciona un nadador para editar.';
        return;
    }

    // Update inmutable con map (evita efectos colaterales).
    swimmers = swimmers.map((swimmer) => {
        if (swimmer.id !== selectedId) return swimmer;
        // Mock de edicion: rota sexo y agrega * al apellido.
        const toggledSex = swimmer.sexo === 'M' ? 'F' : (swimmer.sexo === 'F' ? 'X' : 'M');
        return {
            ...swimmer,
            apellido: `${swimmer.apellido}*`,
            sexo: toggledSex
        };
    });

    render();
    $('#status').textContent = `Nadador ID ${selectedId} editado (mock).`;
}

function deleteSelectedSwimmer() {
    // Validacion previa: debe haber seleccion.
    if (!selectedId) {
        $('#status').textContent = 'Selecciona un nadador para eliminar.';
        return;
    }

    // Delete logico en memoria.
    // ABAP analogia: DELETE itab WHERE id = selectedId.
    swimmers = swimmers.filter((swimmer) => swimmer.id !== selectedId);
    $('#status').textContent = `Nadador ID ${selectedId} eliminado (mock).`;
    selectedId = null;
    render();
}

// Registro de comandos de la barra.
$('#btnAdd').addEventListener('click', addMockSwimmer);
$('#btnEdit').addEventListener('click', editSelectedSwimmer);
$('#btnDelete').addEventListener('click', deleteSelectedSwimmer);
$('#btnBack').addEventListener('click', () => {
    // Volver a inicio.
    if (window.TPANavigation) {
        window.TPANavigation.goTo('home');
        return;
    }
    window.location.href = '../../app/index.html';
});

// Primer render al abrir pantalla.
render();
