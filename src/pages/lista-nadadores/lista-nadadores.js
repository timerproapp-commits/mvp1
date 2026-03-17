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
const $ = (s) => document.querySelector(s);

function formatDateToUi(isoDate) {
    const [y, m, d] = String(isoDate).split('-');
    return `${d}/${m}/${y}`;
}

function render() {
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
            selectedId = swimmer.id;
            $('#status').textContent = '';
        });

        container.appendChild(row);
    });
}

function nextId() {
    return swimmers.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function addMockSwimmer() {
    const id = nextId();
    const seeded = [
        { nombre: 'Nadia', apellido: 'Ferreiro', fechaNacimiento: '2013-08-25', sexo: 'F' },
        { nombre: 'Santino', apellido: 'Lopez', fechaNacimiento: '2010-01-14', sexo: 'M' },
        { nombre: 'Dylan', apellido: 'Acosta', fechaNacimiento: '2007-10-06', sexo: 'X' }
    ];
    const sample = seeded[(id - 1) % seeded.length];
    swimmers.push({ id, ...sample });
    selectedId = id;
    render();
    $('#status').textContent = `Nadador mock agregado (ID ${id}).`;
}

function editSelectedSwimmer() {
    if (!selectedId) {
        $('#status').textContent = 'Selecciona un nadador para editar.';
        return;
    }

    swimmers = swimmers.map((swimmer) => {
        if (swimmer.id !== selectedId) return swimmer;
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
    if (!selectedId) {
        $('#status').textContent = 'Selecciona un nadador para eliminar.';
        return;
    }

    swimmers = swimmers.filter((swimmer) => swimmer.id !== selectedId);
    $('#status').textContent = `Nadador ID ${selectedId} eliminado (mock).`;
    selectedId = null;
    render();
}

$('#btnAdd').addEventListener('click', addMockSwimmer);
$('#btnEdit').addEventListener('click', editSelectedSwimmer);
$('#btnDelete').addEventListener('click', deleteSelectedSwimmer);
$('#btnBack').addEventListener('click', () => {
    if (window.TPANavigation) {
        window.TPANavigation.goTo('home');
        return;
    }
    window.location.href = '../../app/index.html';
});

render();
