(function () {
    const APP_PATHS = {
        home: './index.html',
        cronometro: '../pages/cronometro/cronometro.html',
        cargaTiempos: '../pages/carga-tiempos/carga-tiempos.html',
        cargaExterna: '../pages/carga-externa/carga-externa.html',
        listaNadadores: '../pages/lista-nadadores/lista-nadadores.html'
    };

    const PAGE_PATHS = {
        home: '../../app/index.html',
        cronometro: '../cronometro/cronometro.html',
        cargaTiempos: '../carga-tiempos/carga-tiempos.html',
        cargaExterna: '../carga-externa/carga-externa.html',
        listaNadadores: '../lista-nadadores/lista-nadadores.html'
    };

    function getPathMap() {
        const path = window.location.pathname.replace(/\\/g, '/').toLowerCase();
        return path.includes('/src/app/') ? APP_PATHS : PAGE_PATHS;
    }

    function getCurrentSection() {
        const path = window.location.pathname.replace(/\\/g, '/').toLowerCase();
        if (path.includes('/src/app/index.html') || path.endsWith('/src/app/')) return 'home';
        if (path.includes('/src/pages/cronometro/')) return 'cronometro';
        if (path.includes('/src/pages/carga-tiempos/')) return 'cargaTiempos';
        if (path.includes('/src/pages/carga-externa/')) return 'cargaExterna';
        if (path.includes('/src/pages/lista-nadadores/')) return 'listaNadadores';
        return 'home';
    }

    function buildUrl(target, params) {
        const pathMap = getPathMap();
        const targetPath = pathMap[target];
        if (!targetPath) return null;

        const url = new URL(targetPath, window.location.href);
        Object.entries(params || {}).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return;
            url.searchParams.set(key, String(value));
        });
        return url;
    }

    function goTo(target, params) {
        const merged = { ...(params || {}) };
        if (!merged.from) {
            merged.from = getCurrentSection();
        }

        const url = buildUrl(target, merged);
        if (!url) return;
        window.location.href = url.toString();
    }

    function goBack(defaultTarget) {
        const from = new URLSearchParams(window.location.search).get('from');
        const pathMap = getPathMap();

        if (from && pathMap[from]) {
            goTo(from);
            return;
        }

        goTo(defaultTarget || 'home');
    }

    function getParam(name) {
        return new URLSearchParams(window.location.search).get(name) || '';
    }

    window.TPANavigation = {
        goTo,
        goBack,
        getParam,
        getCurrentSection
    };
})();
