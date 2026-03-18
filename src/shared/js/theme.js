(function () {
    const THEME_KEY = 'tpa_theme';

    function getPreferredTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem(THEME_KEY, next);
        updateToggleLabel(next);
    }

    function updateToggleLabel(theme) {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;
        btn.textContent = theme === 'dark' ? '☀' : '☾';
        btn.setAttribute('aria-label', theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro');
        btn.title = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
    }

    function mountToggle() {
        if (document.getElementById('themeToggle')) return;

        const btn = document.createElement('button');
        btn.id = 'themeToggle';
        btn.className = 'theme-toggle';
        btn.type = 'button';
        btn.addEventListener('click', toggleTheme);
        document.body.appendChild(btn);
        updateToggleLabel(document.documentElement.getAttribute('data-theme') || 'light');
    }

    applyTheme(getPreferredTheme());

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountToggle);
    } else {
        mountToggle();
    }
})();
