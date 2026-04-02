# Timer Pro App

Mock app dividida en dos módulos principales:

- Cronometro
- Carga de tiempos

## Estructura del proyecto

```text
docs/
  ejemplos/
    multiTimer-export-ejemplo.txt
src/
  app/
  pages/
    cronometro/
      cronometro.html
      cronometro.css
      cronometro.js
    carga-tiempos/
      carga-tiempos.html
      carga-tiempos.css
      carga-tiempos.js
    historial/
    entrenos/
  shared/
    css/
      base.css
    js/
```

## Convenciones aplicadas

- Estructura por modulo: cada pagina tiene su `html + css + js`.
- Estilos compartidos en `src/shared/css/base.css`.
- Recursos de ejemplo y soporte en `docs/`.
- Nombres de carpetas y archivos en `kebab-case`.

## Como testear localmente

Abrir cada HTML en navegador:

- `src/pages/cronometro/cronometro.html`
- `src/pages/carga-tiempos/carga-tiempos.html`

## Git workflow sugerido

1. Trabajar en branch de refactor.
2. Commits pequenos y atomicos por tipo de cambio.
3. Validar comportamiento local.
4. Hacer `push` y luego merge a `main`.
