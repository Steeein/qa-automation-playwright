// @ts-check
/**
 * ============================================================================
 *  LIMPIEZA · Teardown del entorno de pruebas
 * ============================================================================
 *
 *  No forma parte de la suite de regresión: es un utilitario de mantenimiento
 *  que deja la cuenta en un estado conocido antes o después de una campaña.
 *
 *  Por qué existe:
 *   - Gestión de la configuración: el entorno debe quedar en un estado
 *     conocido y repetible entre campañas.
 *   - Las pruebas se ejecutan sobre un entorno productivo real: la suite no
 *     debe dejar residuos en la cuenta del cliente.
 *   - Los datos de borde creados durante el testing exploratorio (un stock de
 *     999.999 unidades y otro de 2,5) contaminan el KPI "Unidades" y romperían
 *     las aserciones aritméticas de AUTO-02, produciendo fallos que no
 *     corresponden a defectos del software.
 *
 *  Ejecutar con:  npx playwright test tests/limpieza.spec.js --project=escritorio-1366x768
 */

const { test, expect } = require('@playwright/test');
const { iniciarSesion, irAPestana } = require('./fixtures/despensalo');

// Se le da margen: puede haber muchos productos que eliminar, uno por uno.
test.setTimeout(300_000);

test('LIMPIEZA · elimina del inventario y del botiquín todos los productos de prueba con sufijo QA', async ({ page }) => {
  await iniciarSesion(page);

  // Cada eliminación abre un confirm() nativo. Se acepta automáticamente:
  // esta es justamente la capacidad que hace inviable la limpieza manual.
  page.on('dialog', (dialogo) => dialogo.accept());

  for (const seccion of ['inventario', 'botiquin']) {
    await irAPestana(page, seccion);
    const contenedor = seccion === 'inventario' ? '#productList' : '#medicineList';
    const tarjetas = page.locator(`${contenedor} article.product-card`);

    // Tope de seguridad: nunca más de 60 iteraciones aunque algo fallara.
    for (let i = 0; i < 60; i++) {
      const total = await tarjetas.count();
      if (total === 0) break;

      const primera = tarjetas.first();
      const nombre = (await primera.locator('.pc-title').innerText()).trim();

      // Solo se tocan los datos de prueba: cualquier producto real del usuario
      // queda intacto.
      if (!nombre.includes('QA') && !['###', '+++'].includes(nombre)) {
        console.log(`  · Se conserva (no es dato de prueba): ${nombre}`);
        break;
      }

      await primera.locator('button[data-action="delete"]').click();
      await expect(tarjetas).toHaveCount(total - 1, { timeout: 15_000 });
      console.log(`  ✓ Eliminado: ${nombre}`);
    }
  }

  // Verificación final: el inventario y el botiquín quedan sin datos de prueba.
  await irAPestana(page, 'inicio');
  const productos = await page.locator('#kProducts').innerText();
  const unidades = await page.locator('#kUnits').innerText();
  console.log(`\nEstado final → Productos: ${productos} · Unidades: ${unidades}`);
});
