// @ts-check
/**
 * ============================================================================
 *  AUTO-01 · Autenticación
 *  Trazabilidad con las pruebas manuales:
 *      AUTO-01.1  ↔  CP-02 (ingreso con credenciales válidas)
 *      AUTO-01.2  ↔  CP-03 (contraseña menor a 8 caracteres — caso negativo)
 *      AUTO-01.3  ↔  CP-01 (el contenido no es accesible sin sesión)
 * ============================================================================
 *
 *  ¿Por qué este caso se eligió para automatizar?
 *  Se priorizó por importancia, riesgo y valor de negocio. El ingreso cumple
 *  los tres criterios:
 *   - Es la precondición de TODOS los demás flujos: si se rompe, el 100 % de la
 *     aplicación queda inaccesible (riesgo máximo).
 *   - Es perfectamente repetible y determinista, es decir, técnicamente apto
 *     para automatización.
 *   - Se ejecuta en cada regresión, así que el ahorro acumulado es alto.
 */

const { test, expect } = require('@playwright/test');
const { iniciarSesion, irAPestana } = require('./fixtures/despensalo');
const datos = require('./data/productos.json');

test.describe('AUTO-01 · Autenticación de usuario', () => {

  test('AUTO-01.1 ↔ CP-02 · el ingreso con credenciales válidas da acceso a la aplicación', async ({ page }, testInfo) => {
    // ---- Acción: se reutiliza la función compartida del módulo de fixtures ----
    await iniciarSesion(page);

    // ---- Aserción 1: el modal de bloqueo desapareció ----
    await expect(page.locator('#authGate')).toBeHidden();

    // ---- Aserción 2: el contenido de la aplicación es visible y navegable ----
    await expect(page.locator('#kProducts')).toBeVisible();
    await irAPestana(page, 'inventario');
    await expect(page.locator('#inventorySection')).toHaveClass(/active-tab/);

    // ---- Aserción 3: la sesión quedó reflejada en el panel de cuenta ----
    // Verificación funcional real: el rótulo debe dejar de decir "Sin sesión"
    // y mostrar el correo autenticado.
    await irAPestana(page, 'ajustes');
    const cuenta = page.locator('#accountEmail');
    await expect(cuenta).toBeVisible();
    await expect(cuenta).not.toHaveText('Sin sesión');
    // Comparación insensible a mayúsculas: el servicio de autenticación puede
    // normalizar el correo a minúsculas al crear la cuenta.
    await expect(cuenta).toHaveText(
      new RegExp(`^${String(process.env.DESPENSALO_EMAIL).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    );

    // ---- Evidencia adjunta al reporte HTML ----
    await testInfo.attach('AUTO-01-1_sesion-iniciada', {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });
  });

  test('AUTO-01.2 ↔ CP-03 · el ingreso se rechaza si la contraseña tiene menos de 8 caracteres', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('#authGate')).toBeVisible();

    // Dato parametrizado tomado del archivo JSON, no escrito en el código.
    await page.locator('#loginEmail').fill(String(process.env.DESPENSALO_EMAIL));
    await page.locator('#loginPassword').fill(datos.credencialesInvalidas.passwordCorta);
    await page.locator('#btnLogin').click();

    // ---- Aserción 1: el navegador bloqueó el envío por la restricción minlength ----
    const campoValido = await page.locator('#loginPassword').evaluate(
      (input) => /** @type {HTMLInputElement} */ (input).checkValidity()
    );
    expect(campoValido, 'el campo de contraseña debe quedar en estado inválido').toBe(false);

    // ---- Aserción 2: no se otorgó acceso, el modal sigue en pantalla ----
    await expect(page.locator('#authGate')).toBeVisible();

    await testInfo.attach('AUTO-01-2_password-corta-rechazada', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  });

  test('AUTO-01.3 ↔ CP-01 · sin sesión, el contenido de la aplicación no está disponible', async ({ page }, testInfo) => {
    await page.goto('/');

    // ---- Aserción 1: el modal de ingreso está presente ----
    await expect(page.locator('#authGate')).toBeVisible();

    // ---- Aserción 2: la aplicación está realmente oculta, no solo tapada ----
    // Se comprueba sobre las barras de navegación, que la hoja de estilos oculta
    // mientras el <body> tiene la clase auth-locked.
    await expect(page.locator('.bottom-nav')).toBeHidden();
    await expect(page.locator('.top-nav')).toBeHidden();

    await testInfo.attach('AUTO-01-3_gate-sin-sesion', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  });

});
