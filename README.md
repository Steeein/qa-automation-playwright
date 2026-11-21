# Framework de automatización E2E con Playwright

Suite de pruebas end-to-end construida como **herramienta reutilizable**, no como colección
de scripts sueltos. Salió de una campaña de QA completa sobre una aplicación web en
producción: 12 casos de prueba manuales, 3 sesiones de testing exploratorio y una suite
automatizada ejecutada 36 veces en dos resoluciones distintas.

Este repositorio publica **el framework y el método**. El informe de defectos del producto
evaluado no se publica aquí por discreción hacia el socio formador del proyecto; está
disponible a solicitud.

---

## La campaña en números

| Indicador | Valor |
|---|---|
| Casos de prueba diseñados y ejecutados | 12 / 12 |
| Tasa de éxito manual | 66,7 % |
| Proporción de casos negativos y de borde | 33,3 % |
| Cobertura de módulos | 6 de 7 (85,7 %) |
| Pruebas automatizadas | 6, ejecutadas 36 veces |
| Consistencia entre ejecuciones | 100 % (36/36) |
| Tiempo por ciclo completo | manual ≈ 90 min · automatizado 2,5 min |
| Corridas necesarias para llegar al 100 % | 5 — las 4 primeras expusieron defectos del propio arnés |

El último número es el más importante de la tabla y está explicado en
[`docs/LECCIONES-ARNES.md`](docs/LECCIONES-ARNES.md).

---

## Decisiones de arquitectura

El requisito de diseño fue que la suite sobreviviera a los cambios del producto y que
otra persona pudiera ampliarla sin leer el código de las pruebas.

**Un solo lugar para los selectores.** Los tres specs importan
[`tests/fixtures/`](tests/fixtures/) y **ninguno contiene selectores propios**. El módulo
expone funciones en lenguaje de negocio — `iniciarSesion`, `irAPestana`, `crearProducto`,
`eliminarProducto`, `leerKpi` — de modo que los specs se leen como un caso de prueba y no
como una secuencia de DOM. Si desarrollo cambia el identificador de un botón, se corrige
en un archivo y no en tres.

**Los datos viven fuera del código.** Los casos se alimentan de
[`tests/data/productos.json`](tests/data/productos.json). Ampliar la cobertura es agregar
una fila al archivo, sin tocar un spec.

**Una suite, dos entornos.** `playwright.config.js` define dos *projects* — escritorio
1366×768 y móvil Pixel 5 (393×851) — que ejecutan el mismo código sin duplicarlo.

**`retries: 0`, a propósito.** Un reintento automático convierte un fallo intermitente en
una prueba que "pasa al segundo intento" y oculta exactamente lo que la consistencia
pretende medir. Sin reintentos, cada inestabilidad queda visible en el reporte y se
diagnostica.

**Ejecución secuencial (`workers: 1`).** Las pruebas comparten cuenta e inventario remoto.
En paralelo se pisarían los datos entre sí y los fallos dejarían de ser atribuibles al
software bajo prueba.

**Cada prueba limpia su estado, antes y después.** La ejecución número 3 parte del mismo
estado que la número 1. Hay además un `limpieza.spec.js` como utilitario de mantenimiento,
excluido de las corridas normales para no contaminar el recuento de ejecuciones.

**La evidencia se genera sola.** Tres reporteros: `list` para consola, `html` para la
evidencia visual con captura por prueba, y `json` para extraer las métricas sin
transcribirlas a mano. Video y traza se conservan solo ante fallo.

**Las credenciales nunca entran al repositorio.** Viven en `.env` (ignorado por git) y el
campo de contraseña se rellena sin registrar su valor en el reporte. Hay una razón concreta
detrás de esa última línea; está en [`docs/LECCIONES-ARNES.md`](docs/LECCIONES-ARNES.md).

---

## Trazabilidad

Cada prueba automatizada declara en su propio título el caso manual que cubre
(`AUTO-01.1 ↔ CP-02`), de modo que la trazabilidad aparece en el reporte HTML sin
necesidad de mantener un documento aparte.

| Spec | Prueba | Caso manual | Aserciones | Por qué se automatizó |
|---|---|---|---|---|
| `auto-01-login.spec.js` | AUTO-01.1 | CP-02 | 5 | Precondición de todo el sistema |
| | AUTO-01.2 | CP-03 | 2 | Caso negativo determinista |
| | AUTO-01.3 | CP-01 | 3 | Control de acceso |
| `auto-02-registro-producto.spec.js` | AUTO-02 (×2) | CP-05 | 6 c/u | Operación núcleo, repetitiva, parametrizable |
| `auto-03-lista-compras.spec.js` | AUTO-03 | CP-08 | 5 | Única regla de negocio calculada; cruza dos módulos |

---

## Cómo se ejecuta

```bash
npm install
npx playwright install chromium
cp .env.example .env     # completar con una cuenta de prueba propia
```

| Comando | Qué hace |
|---|---|
| `npm test` | Ejecuta la suite una vez en los dos entornos |
| `npm run test:repetible` | 3 repeticiones por prueba y entorno — las 36 ejecuciones del informe |
| `npm run test:escritorio` | Solo escritorio 1366×768, 3 repeticiones |
| `npm run test:movil` | Solo móvil Pixel 5, 3 repeticiones |
| `npm run test:headed` | Con navegador visible, para depurar |
| `npm run reporte` | Abre el reporte HTML con las capturas |
| `npm run limpieza` | Utilitario: deja la cuenta de prueba en un estado conocido |

---

## Documentación

- [`docs/METODOLOGIA.md`](docs/METODOLOGIA.md) — diseño de casos, técnicas aplicadas,
  métricas de ejecución y cómo se combinaron casos formales con exploración dirigida.
- [`docs/LECCIONES-ARNES.md`](docs/LECCIONES-ARNES.md) — las cinco corridas, los cuatro
  falsos positivos y por qué ninguno se reportó como defecto del producto.

---

## Contexto

Trabajo realizado para la asignatura *Testing Aplicado al Desarrollo de Sistemas*
(Ingeniería en Informática, Instituto Profesional San Sebastián, 2026), sobre una
aplicación web en producción facilitada como socio formador.

La evaluación se acotó deliberadamente por tratarse de un entorno productivo con usuarios
reales: sin pruebas de carga o estrés, sin escaneo de vulnerabilidades, sin accesos no
autorizados, sin generación masiva de solicitudes y sin confirmar ninguna operación que
pudiera derivar en una compra o un pago real. Toda la evidencia se revisó para eliminar
credenciales antes de incorporarla al informe.

**Diego Abaroa** · [github.com/Steeein](https://github.com/Steeein)
