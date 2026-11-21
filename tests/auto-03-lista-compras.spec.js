// @ts-check
/**
 * ============================================================================
 *  AUTO-03 · Generación automática de la lista del supermercado
 *  Trazabilidad:  AUTO-03  ↔  CP-08
 * ============================================================================
 *
 *  ¿Por qué este caso se eligió para automatizar?
 *   - Es la ÚNICA regla de negocio derivada que tiene la aplicación:
 *         si  stock ≤ stock mínimo  ⇒  el producto entra a la lista
 *         cantidad a comprar = stock objetivo − stock actual
 *     Una regla calculada es justamente el tipo de comportamiento donde una
 *     aserción automática vale más que una revisión visual: verifica el número,
 *     no la apariencia.
 *   - Atraviesa DOS módulos (Inventario → Compras), por lo que actúa como
 *     prueba de integración funcional y detectaría regresiones cruzadas.
 *   - Es determinista y repetible.
 *
 *  Reutilización: este spec no define ni un solo selector
 *  propio; se apoya íntegramente en las funciones del módulo de fixtures y en
 *  los datos parametrizados del archivo JSON.
 */

const { test, expect } = require('@playwright/test');
const {
  iniciarSesion,
  irAPestana,
  crearProducto,
  eliminarProducto,
  tarjetaDeProducto,
  numeroDesde,
} = require('./fixtures/despensalo');
const datos = require('./data/productos.json');

const producto = datos.reposicion;

test.describe('AUTO-03 · Lista del supermercado generada por stock mínimo', () => {

  test(`AUTO-03 ↔ CP-08 · un producto en stock mínimo entra a la lista con la cantidad correcta`, async ({ page }, testInfo) => {

    // ---------- Preparación ----------
    await iniciarSesion(page);
    await eliminarProducto(page, producto.nombre);

    await irAPestana(page, 'compras');
    const pendientesAntes = numeroDesde(await page.locator('#shoppingCount').innerText());

    // ---------- Acción ----------
    // stock (2) = mínimo (2)  ⇒  debe dispararse la reposición automática.
    await crearProducto(page, producto);

    // ---------- Aserción 1: el inventario marca el producto como "Stock bajo" ----------
    await irAPestana(page, 'inventario');
    await expect(tarjetaDeProducto(page, producto.nombre).locator('.pc-pills'))
      .toContainText(producto.estadoEsperado);

    // ---------- Aserción 2: el producto aparece en la lista del supermercado ----------
    await irAPestana(page, 'compras');
    const lista = page.locator('#shoppingList');
    await expect(lista).toContainText(producto.nombre);

    // ---------- Aserción 3: la cantidad sugerida es objetivo − stock ----------
    // Esta es la aserción de valor: comprueba el CÁLCULO, no solo la presencia.
    const linea = lista.locator('.shop-item', { hasText: producto.nombre }).first();
    await expect(linea.locator('.shop-meta')).toContainText(
      new RegExp(`comprar\\s*${producto.cantidadAComprarEsperada}\\b`, 'i')
    );

    // ---------- Aserción 4: el contador de pendientes aumentó en 1 ----------
    const pendientesDespues = numeroDesde(await page.locator('#shoppingCount').innerText());
    expect(pendientesDespues, 'el contador de pendientes debe subir en 1')
      .toBe(pendientesAntes + 1);

    // ---------- Evidencia ----------
    await testInfo.attach('AUTO-03_lista-compras-generada', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });

    // ---------- Limpieza posterior ----------
    await eliminarProducto(page, producto.nombre);
    await irAPestana(page, 'compras');
    await expect(lista).not.toContainText(producto.nombre);
  });

});
