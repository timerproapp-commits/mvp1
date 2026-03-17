const goTo = (target, params) => {
    if (window.TPANavigation) {
        window.TPANavigation.goTo(target, params);
        return;
    }

    const fallback = {
        cronometro: '../pages/cronometro/cronometro.html',
        cargaTiempos: '../pages/carga-tiempos/carga-tiempos.html',
        cargaExterna: '../pages/carga-externa/carga-externa.html',
        listaNadadores: '../pages/lista-nadadores/lista-nadadores.html'
    };

    const path = fallback[target];
    if (!path) return;
    window.location.href = path;
};

document.getElementById('btnCronometro').addEventListener('click', () => {
    goTo('cronometro', { from: 'home' });
});

document.getElementById('btnCargaExterna').addEventListener('click', () => {
    goTo('cargaExterna', { from: 'home' });
});

document.getElementById('btnListaNadadores').addEventListener('click', () => {
    goTo('listaNadadores', { from: 'home' });
});
