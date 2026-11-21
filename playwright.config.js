// @ts-check
/**
 * Configuración de Playwright — suite E2E de despensalo.cl
 *
 * Decisiones técnicas:
 *
 *  1) DOS ENTORNOS DE EJECUCIÓN. Se definen dos "projects" que ejecutan la misma
 *     suite en dos resoluciones distintas: escritorio 1366x768 y móvil Pixel 5
 *     (393x851). Se eligieron dos resoluciones sobre el mismo motor, en vez de
 *     dos navegadores, porque (a) solo requiere descargar Chromium, lo que
 *     reduce el riesgo de que la suite no corra en una máquina nueva, y
 *     (b) el caso de uso real de la
 *     aplicación es móvil (revisar la despensa antes de ir al supermercado),
 *     hallazgo levantado en la sesión exploratoria SE-03.
 *
 *  2) SIN REINTENTOS (retries: 0). Un reintento automático enmascararía la
 *     inestabilidad, y lo que interesa medir es justamente la CONSISTENCIA
 *     de los resultados entre ejecuciones. Queremos que un fallo
 *     intermitente se vea en el reporte, no que se oculte.
 *
 *  3) EJECUCIÓN SECUENCIAL (workers: 1, fullyParallel: false). Las tres pruebas
 *     comparten la misma cuenta de usuario y el mismo inventario remoto: en
 *     paralelo se pisarían los datos entre sí y los fallos no serían atribuibles
 *     al software bajo prueba, sino al diseño de la suite.
 *
 *  4) EVIDENCIA AUTOMÁTICA. screenshot: 'on' guarda una captura de cada prueba
 *     como respaldo del resultado; el video y la traza se conservan solo ante
 *     fallo para no inflar la carpeta de resultados.
 */

require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',

  // El script de limpieza es un utilitario de mantenimiento, no una prueba de
  // regresión: se excluye de las corridas normales para que no contamine el
  // recuento de ejecuciones. Se invoca a mano cuando hace falta dejar la
  // cuenta en un estado conocido:
  //   npx playwright test tests/limpieza.spec.js --project=escritorio-1366x768
  testIgnore: '**/limpieza.spec.js',

  // Tiempo máximo por prueba: la app autentica contra un servicio externo
  // (Supabase) y luego descarga el estado del usuario, por lo que el arranque
  // es más lento que el de una página estática.
  timeout: 60_000,
  expect: { timeout: 15_000 },

  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,

  // Tres reporteros: 'list' para la consola, 'html' para la evidencia visual
  // con captura por prueba, y 'json' para extraer las métricas de ejecución
  // sin transcribirlas a mano.
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reportes/html', open: 'never' }],
    ['json', { outputFile: 'reportes/resultados.json' }],
  ],

  outputDir: 'reportes/artefactos',

  use: {
    baseURL: 'https://despensalo.cl/',
    locale: 'es-CL',
    timezoneId: 'America/Santiago',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'escritorio-1366x768',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'movil-pixel5-393x851',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
