// @ts-check
/**
 * Configuración exclusiva para el script de mantenimiento `tests/limpieza.spec.js`.
 *
 * Por qué existe un segundo archivo de configuración:
 * la configuración principal excluye ese script con `testIgnore`, para que sus
 * ejecuciones no se sumen al recuento de las 36 corridas del indicador 6.2.
 * Pero `testIgnore` se aplica también cuando el archivo se nombra de forma
 * explícita en la línea de comandos, de modo que sin este segundo archivo la
 * limpieza sería imposible de ejecutar ("Error: No tests found").
 *
 * Se reutiliza toda la configuración base y solo se invierte el filtro.
 *
 * Uso:  npm run limpieza
 */

const base = require('./playwright.config.js');

module.exports = {
  ...base,
  testIgnore: undefined,
  testMatch: '**/limpieza.spec.js',
  // La limpieza recorre el inventario borrando de a un producto: necesita margen.
  timeout: 300_000,
  reporter: [['list']],
};
