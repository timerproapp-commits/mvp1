// -----------------------------------------------------------------------------
// PANTALLA HOME
// -----------------------------------------------------------------------------
// Esta pagina funciona como menu principal.
// Idea ABAP equivalente:
// - Seria parecido a un "selection-screen" con 3 botones de accion.
// - Cada boton hace un "CALL SCREEN" / "LEAVE TO TRANSACTION" hacia otra vista.

const goTo = (target, params) => {
    // Si existe el router central, usamos ese (equivalente a usar una clase
    // utilitaria comun, por ejemplo zcl_navigation=>go_to( ) en ABAP OO).
    if (window.TPANavigation) {
        window.TPANavigation.goTo(target, params);
        return;
    }

    // Fallback defensivo: rutas hardcodeadas por si no cargo navigation.js.
    // En ABAP seria similar a tener un CASE con transacciones fallback.
    const fallback = {
        cronometro: '../pages/cronometro/cronometro.html',
        cargaTiempos: '../pages/carga-tiempos/carga-tiempos.html',
        cargaExterna: '../pages/carga-externa/carga-externa.html',
        listaNadadores: '../pages/lista-nadadores/lista-nadadores.html'
    };

    const path = fallback[target];
    // Guard clause: si el target no existe, no hacemos nada.
    // Patron equivalente a CHECK target IS NOT INITIAL.
    if (!path) return;
    window.location.href = path;
};

// BIND de eventos de UI.
// Equivalente ABAP mental: USER-COMMAND en dynpro, pero aqui cada boton
// tiene su listener dedicado.
document.getElementById('btnCronometro').addEventListener('click', () => {
    // from=home queda en la URL como contexto de navegacion.
    goTo('cronometro', { from: 'home' });
});

document.getElementById('btnCargaExterna').addEventListener('click', () => {
    goTo('cargaExterna', { from: 'home' });
});

document.getElementById('btnListaNadadores').addEventListener('click', () => {
    goTo('listaNadadores', { from: 'home' });
});
