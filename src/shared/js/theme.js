(function () {
    // -------------------------------------------------------------------------
    // MODULO DE TEMA (CLARO/OSCURO)
    // -------------------------------------------------------------------------
    // ABAP analogia:
    // - localStorage ~ tabla Z de configuracion de usuario persistida.
    // - data-theme en HTML ~ "estado global de pantalla" (como una variable
    //   global de dynpro que impacta renderizado).

    const THEME_KEY = 'tpa_theme';

    function getPreferredTheme() {
        // 1) Prioridad al tema guardado por el usuario.
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
        // 2) Si no hay preferencia guardada, usamos preferencia del sistema.
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        // Al setear este atributo, CSS aplica variables de tema.
        // Piensalo como "SET PF-STATUS" pero para estilos.
        document.documentElement.setAttribute('data-theme', theme);
    }

    function toggleTheme() {
        // Lee tema actual desde DOM.
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        // Alterna entre dark y light.
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        // Persistimos seleccion para la proxima carga.
        localStorage.setItem(THEME_KEY, next);
        updateToggleLabel(next);
    }

    function updateToggleLabel(theme) {
        // Si el boton no existe (todavia), salimos sin error.
        const btn = document.getElementById('themeToggle');
        if (!btn) return;
        // Icono y textos de accesibilidad segun estado.
        btn.textContent = theme === 'dark' ? '☀' : '☾';
        btn.setAttribute('aria-label', theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro');
        btn.title = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
    }

    function mountToggle() {
        // Evitamos crear dos botones si la funcion corre mas de una vez.
        if (document.getElementById('themeToggle')) return;

        // Creamos boton flotante de tema.
        const btn = document.createElement('button');
        btn.id = 'themeToggle';
        btn.className = 'theme-toggle';
        btn.type = 'button';
        btn.addEventListener('click', toggleTheme);
        document.body.appendChild(btn);
        // Sincroniza etiqueta inicial con tema activo.
        updateToggleLabel(document.documentElement.getAttribute('data-theme') || 'light');
    }

    // Aplicamos tema inmediatamente para evitar "parpadeo" visual al cargar.
    applyTheme(getPreferredTheme());

    // Si el DOM aun no esta listo, esperamos; si no, montamos directo.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountToggle);
    } else {
        mountToggle();
    }
})();
