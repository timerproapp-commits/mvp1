(function () {
    // -------------------------------------------------------------------------
    // MODULO DE NAVEGACION GLOBAL
    // -------------------------------------------------------------------------
    // Este IIFE (funcion autoejecutable) encapsula variables privadas.
    // ABAP analogia: como una clase local con atributos privados y metodos
    // estaticos expuestos solo por una interfaz publica.

    const APP_PATHS = {
        // Rutas cuando estamos navegando desde src/app/*
        home: './index.html',
        cronometro: '../pages/cronometro/cronometro.html',
        cargaTiempos: '../pages/carga-tiempos/carga-tiempos.html',
        cargaExterna: '../pages/carga-externa/carga-externa.html',
        listaNadadores: '../pages/lista-nadadores/lista-nadadores.html'
    };

    const PAGE_PATHS = {
        // Rutas cuando estamos en src/pages/* (subcarpetas).
        home: '../../app/index.html',
        cronometro: '../cronometro/cronometro.html',
        cargaTiempos: '../carga-tiempos/carga-tiempos.html',
        cargaExterna: '../carga-externa/carga-externa.html',
        listaNadadores: '../lista-nadadores/lista-nadadores.html'
    };

    function getPathMap() {
        // Normalizamos slash/backslash para evitar problemas Win vs URL.
        const path = window.location.pathname.replace(/\\/g, '/').toLowerCase();
        // Elegimos mapa de rutas segun contexto actual.
        return path.includes('/src/app/') ? APP_PATHS : PAGE_PATHS;
    }

    function getCurrentSection() {
        // Deteccion de seccion actual.
        // ABAP analogia: CASE sy-repid / sy-dynnr para saber en que pantalla
        // estamos y decidir comportamiento de BACK.
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

        // URL con query params, equivalente a pasar parametros en memoria
        // (SET PARAMETER ID / GET PARAMETER ID) pero via query string.
        const url = new URL(targetPath, window.location.href);
        Object.entries(params || {}).forEach(([key, value]) => {
            // No incluimos params vacios para mantener URL limpia.
            if (value === undefined || value === null || value === '') return;
            url.searchParams.set(key, String(value));
        });
        return url;
    }

    function goTo(target, params) {
        // Clon simple para no mutar el objeto original recibido.
        const merged = { ...(params || {}) };
        if (!merged.from) {
            // Si no viene origen, lo inferimos automaticamente.
            merged.from = getCurrentSection();
        }

        const url = buildUrl(target, merged);
        if (!url) return;
        window.location.href = url.toString();
    }

    function goBack(defaultTarget) {
        // Lee ?from=... desde URL para volver al origen real.
        const from = new URLSearchParams(window.location.search).get('from');
        const pathMap = getPathMap();

        // Si existe origen valido, volvemos ahi.
        if (from && pathMap[from]) {
            goTo(from);
            return;
        }

        // Si no, fallback a home o al target indicado.
        goTo(defaultTarget || 'home');
    }

    function getParam(name) {
        // Helper reutilizable para leer params desde URL.
        return new URLSearchParams(window.location.search).get(name) || '';
    }

    // API publica del modulo.
    // ABAP analogia: publicar metodos de utilidad en una clase global estatica.
    window.TPANavigation = {
        goTo,
        goBack,
        getParam,
        getCurrentSection
    };
})();
