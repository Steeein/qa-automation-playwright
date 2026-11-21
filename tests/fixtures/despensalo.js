// @ts-check
/**
 * ============================================================================
 *  MÓDULO DE FUNCIONES REUTILIZABLES — despensalo.cl
 * ============================================================================
 *
 *  Este archivo concentra toda la interacción con la interfaz de la aplicación.
 *  Los tres specs (auto-01, auto-02 y auto-03) lo importan y NO contienen
 *  selectores propios.
 *
 *  Por qué está separado (patrón Page Object / helpers):
 *   - Reutilización: los tres specs se apoyan en estas funciones y en datos
 *     parametrizados, en lugar de repetir selectores propios.
 *   - Mantenibilidad: mantener los scripts es lo que más cuesta en una suite
 *     automatizada. Si el desarrollador cambia el identificador de un botón,
 *     se corrige en UN solo lugar y no en tres archivos.
 *   - Legibilidad: los specs quedan escritos en lenguaje de negocio
 *     (crearProducto, irAPestana) y no en lenguaje de DOM.
 *
 *  Los selectores usan los identificadores reales de la aplicación
 *  (#loginEmail, #btnAddManual, #productList, …) porque son estables y
 *  semánticos; se evitan los selectores basados en posición o en clases de
 *  estilo, que se rompen ante cualquier cambio visual.
 * ============================================================================
 */

const { expect } = require('@playwright/test');

/** Mapa de secciones de la aplicación (valor del atributo data-target). */
const SECCIONES = {
  inicio: 'homeSection',
  inventario: 'inventorySection',
  botiquin: 'medicineSection',
  compras: 'shoppingSection',
  historial: 'historySection',
  gastos: 'expenseSection',
  ajustes: 'settingsSection',
};

/**
 * Convierte un texto formateado en español de Chile en número.
 *
 * Los KPI se renderizan con Intl.NumberFormat('es-CL'), donde el **punto** es
 * separador de miles y la **coma** es separador decimal: "1.234", "$6.000",
 * "1.000.022,5", "2 pendientes".
 *
 * Importante: la aplicación admite stocks decimales (kg, litros y —según el
 * hallazgo DEF-03— también en unidades contables), de modo que el parseo debe
 * respetar la parte decimal. Una versión anterior de esta función eliminaba
 * todos los caracteres no numéricos, lo que convertía "1.000.022,5" en
 * 10000225 y rompía las comparaciones aritméticas de los KPI.
 *
 * @param {string} texto
 * @returns {number}
 */
function numeroDesde(texto) {
  const limpio = String(texto || '')
    .replace(/[^\d.,-]/g, '')  // deja solo dígitos, separadores y signo
    .replace(/\./g, '')        // quita los separadores de miles
    .replace(',', '.');        // convierte la coma decimal en punto
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : 0;
}

/**
 * Abre la aplicación e inicia sesión con la cuenta de prueba.
 * Reutilizada por los tres specs (evita repetir el flujo de login 3 veces).
 *
 * @param {import('@playwright/test').Page} page
 * @param {{email?: string, password?: string}} [credenciales]
 */
async function iniciarSesion(page, credenciales = {}) {
  const email = credenciales.email ?? process.env.DESPENSALO_EMAIL;
  const password = credenciales.password ?? process.env.DESPENSALO_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Faltan credenciales. Copia .env.example a .env y completa ' +
      'DESPENSALO_EMAIL y DESPENSALO_PASSWORD con tu cuenta de prueba.'
    );
  }

  await page.goto('/');

  // La aplicación bloquea el contenido con un modal hasta que hay sesión.
  await expect(page.locator('#authGate')).toBeVisible();

  await page.locator('#loginEmail').fill(email);

  // La contraseña NO se escribe con fill().
  //
  // Motivo: Playwright registra el valor de cada `fill` en el título del paso, y
  // ese título aparece tal cual en el reporte HTML que queda como evidencia.
  // Con `fill(password)` el reporte mostraba literalmente
  //     Fill "<contraseña>" locator('#loginPassword')
  // es decir, filtraba la contraseña de la cuenta de prueba dentro del propio
  // documento de evidencia. Detectado al revisar la captura del reporte.
  //
  // `evaluate` registra el paso como "Evaluate", sin el argumento. Se disparan
  // los eventos input y change a mano porque asignar `value` por JavaScript no
  // los emite, y el formulario los necesita para dar por válido el campo.
  await page.locator('#loginPassword').evaluate((campo, secreto) => {
    campo.value = secreto;
    campo.dispatchEvent(new Event('input',  { bubbles: true }));
    campo.dispatchEvent(new Event('change', { bubbles: true }));
  }, password);

  await page.locator('#btnLogin').click();

  // El cierre del modal es la señal inequívoca de que la sesión se estableció.
  // Se usa un tiempo holgado porque implica una llamada al servicio de
  // autenticación y la descarga posterior del estado del usuario.
  await expect(page.locator('#authGate')).toBeHidden({ timeout: 30_000 });
  await expect(page.locator('#kProducts')).toBeVisible();
}

/**
 * Cambia de pestaña dentro de la aplicación.
 * Usa ":visible" porque la app tiene dos barras de navegación (superior en
 * escritorio, inferior en móvil) y solo una está visible según la resolución:
 * esto es lo que permite que la MISMA función sirva en los dos entornos de
 * ejecución configurados.
 *
 * @param {import('@playwright/test').Page} page
 * @param {keyof typeof SECCIONES} nombreSeccion
 */
async function irAPestana(page, nombreSeccion) {
  const idSeccion = SECCIONES[nombreSeccion];
  if (!idSeccion) throw new Error(`Sección desconocida: ${nombreSeccion}`);

  await page.locator(`.nav-btn[data-target="${idSeccion}"]:visible`).first().click();
  await expect(page.locator(`#${idSeccion}`)).toHaveClass(/active-tab/);
}

/**
 * Localiza la tarjeta de un producto dentro del inventario por su nombre.
 * @param {import('@playwright/test').Page} page
 * @param {string} nombre
 */
function tarjetaDeProducto(page, nombre) {
  return page.locator('#productList article.product-card', { hasText: nombre });
}

/**
 * Registra un producto nuevo en la despensa a través del formulario de la
 * interfaz (no se manipula localStorage: se prueba el mismo camino que
 * recorre un usuario real, tal como exige el caso manual CP-05).
 *
 * @param {import('@playwright/test').Page} page
 * @param {{nombre: string, marca?: string, stock: number, minimo: number, objetivo: number, precio?: number}} datos
 */
async function crearProducto(page, datos) {
  await irAPestana(page, 'inventario');
  await page.locator('#btnAddManual').click();

  const modal = page.locator('#productModalBack');
  await expect(modal).toBeVisible();

  await page.locator('#pName').fill(datos.nombre);
  if (datos.marca) await page.locator('#pBrand').fill(datos.marca);

  // Los campos numéricos se escriben y DESPUÉS se verifican en bloque.
  //
  // Motivo (diagnosticado en la 4.ª corrida, 34/36): el formulario vuelve a
  // dibujarse mientras se rellena —recalcula la ayuda «$990 × 2 un. = $1.980»
  // cada vez que cambia un campo— y de forma intermitente ese re-dibujo
  // devuelve UN campo ya escrito a su valor por omisión (1). Ocurrió dos veces
  // en 36 ejecuciones, en campos distintos: una vez `pStock` (quedó 1 en lugar
  // de 4) y otra `pMin` (quedó 1 en lugar de 2). En ambos casos la aplicación
  // calculó bien la píldora de estado para el valor que efectivamente tenía
  // guardado, de modo que NO se trata de un defecto del producto sino de una
  // condición de carrera entre `fill()` y el re-render.
  //
  // La verificación se hace al final y no campo por campo porque el re-dibujo
  // puede alterar un campo escrito ANTES, cuando ya se pasó a los siguientes.
  const numericos = [
    ['#pStock', datos.stock],
    ['#pMin', datos.minimo],
    ['#pTarget', datos.objetivo],
  ];
  if (datos.precio !== undefined) numericos.push(['#pPrice', datos.precio]);

  for (const [selector, valor] of numericos) {
    await page.locator(selector).fill(String(valor));
  }

  // Pasada de verificación: hasta 3 intentos por campo.
  for (let intento = 1; intento <= 3; intento++) {
    const desviados = [];
    for (const [selector, valor] of numericos) {
      if ((await page.locator(selector).inputValue()) !== String(valor)) {
        desviados.push([selector, valor]);
      }
    }
    if (desviados.length === 0) break;
    if (intento === 3) {
      throw new Error(
        'El formulario revirtió estos campos tras 3 intentos: ' +
        desviados.map(([sel, val]) => `${sel} debía ser ${val}`).join(', ')
      );
    }
    for (const [selector, valor] of desviados) {
      await page.locator(selector).fill(String(valor));
    }
  }

  await page.locator('#btnSaveProduct').click();

  // El cierre del modal confirma que el guardado se completó.
  //
  // Nota: aquí NO se registra ningún manejador de diálogo. Se probó hacerlo
  // para diagnosticar el caso en que el producto ya existiera, y el resultado
  // fue peor: un `page.once` que no llega a dispararse queda pendiente y, en la
  // eliminación posterior, Playwright ejecuta ese manejador residual en lugar
  // del que acepta el borrado. La limpieza falla y el error se propaga en
  // cascada (la consistencia cayó de 91,7 % a 50 % en una corrida completa).
  // La condición de carrera se resuelve en `eliminarProducto`, con una espera
  // de asentamiento que deja terminar la sincronización con la nube.
  await expect(modal).toBeHidden();
}

/**
 * Elimina del inventario todos los productos cuyo nombre coincida.
 * Se usa como limpieza previa y posterior: garantiza que cada ejecución parta
 * del mismo estado y que la suite sea REPETIBLE, condición para que 3
 * ejecuciones consecutivas den el mismo resultado.
 *
 * La eliminación dispara un confirm() nativo, por eso se registra un manejador
 * de diálogo justo antes de cada clic.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} nombre
 */
async function eliminarProducto(page, nombre) {
  await irAPestana(page, 'inventario');
  await page.locator('#inventorySearch').fill(nombre);

  const tarjetas = tarjetaDeProducto(page, nombre);

  // Tope de seguridad: evita un bucle infinito si algo impidiera borrar.
  for (let intento = 0; intento < 5; intento++) {
    const pendientes = await tarjetas.count();
    if (pendientes === 0) break;

    page.once('dialog', (dialogo) => dialogo.accept()); // confirm() de eliminación
    await tarjetas.first().locator('button[data-action="delete"]').click();
    await expect(tarjetas).toHaveCount(pendientes - 1, { timeout: 10_000 });
  }

  await page.locator('#inventorySearch').fill('');
  await expect(tarjetaDeProducto(page, nombre)).toHaveCount(0);

  // Espera de asentamiento antes de devolver el control.
  //
  // La aplicación guarda en localStorage de inmediato pero envía el estado a la
  // nube con un retardo de 650 ms (debounce). Sin esta pausa, la prueba
  // siguiente puede iniciar sesión y descargar un estado obsoleto en el que el
  // producto todavía existe; al intentar crearlo de nuevo salta el diálogo de
  // duplicado, Playwright lo descarta por omisión y el modal queda abierto.
  // Diagnosticado a partir de 3 fallos intermitentes en una corrida de 36.
  await page.waitForTimeout(1200);
}

/**
 * Lee un indicador (KPI) de la pantalla Inicio y lo devuelve como número.
 * @param {import('@playwright/test').Page} page
 * @param {'kProducts'|'kUnits'|'kLow'|'kOut'|'kSoon'|'kExpired'|'kValue'} idKpi
 */
async function leerKpi(page, idKpi) {
  await irAPestana(page, 'inicio');
  const texto = await page.locator(`#${idKpi}`).innerText();
  return numeroDesde(texto);
}

module.exports = {
  SECCIONES,
  numeroDesde,
  iniciarSesion,
  irAPestana,
  tarjetaDeProducto,
  crearProducto,
  eliminarProducto,
  leerKpi,
};
