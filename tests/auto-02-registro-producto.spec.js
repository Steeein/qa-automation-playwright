// @ts-check
/**
 * ============================================================================
 *  AUTO-02 · Registro de producto en la despensa
 *  Trazabilidad:  AUTO-02  ↔  CP-05
 * ============================================================================
 *
 *  ¿Por qué este caso se eligió para automatizar?
 *   - Es la operación NÚCLEO del producto: todos los demás módulos (indicadores,
 *     lista de compras, gastos, botiquín) consumen los datos que este flujo crea.
 *   - Es un caso REPETITIVO: se ejecuta con distintos datos una y otra vez, que
 *     es exactamente el escenario donde la automatización rinde según el
 *     Apunte 3 ("ejecutar pruebas repetitivas de manera rápida y precisa").
 *   - Es ESTABLE: no depende de hardware (a diferencia de la cámara o el OCR de
 *     boletas, deliberadamente excluidos del alcance de automatización).
 *
 *  Parametrización (indicador 6.1): el conjunto de productos se lee desde
 *  tests/data/productos.json. Para ampliar la cobertura basta agregar una fila
 *  al JSON: no se toca este archivo.
 */

const { test, expect } = require('@playwright/test');
const {
  iniciarSesion,
  irAPestana,
  crearProducto,
  eliminarProducto,
  tarjetaDeProducto,
  leerKpi,
} = require('./fixtures/despensalo');
const datos = require('./data/productos.json');

test.describe('AUTO-02 · Alta de productos en el inventario', () => {

  // Se ejecuta una vez por cada producto del archivo de datos.
  for (const producto of datos.registro) {

    test(`AUTO-02 ↔ CP-05 · registrar "${producto.nombre}" (${producto.id}) actualiza inventario e indicadores`, async ({ page }, testInfo) => {

      // ---------- Preparación ----------
      await iniciarSesion(page);

      // Limpieza previa: garantiza que la prueba parta siempre del mismo estado,
      // condición indispensable para que 3 ejecuciones consecutivas den el mismo
      // resultado (indicador 6.2).
      await eliminarProducto(page, producto.nombre);

      const productosAntes = await leerKpi(page, 'kProducts');
      const unidadesAntes = await leerKpi(page, 'kUnits');
      const valorAntes = await leerKpi(page, 'kValue');

      // ---------- Acción ----------
      await crearProducto(page, producto);

      // ---------- Aserción 1: el producto existe en el inventario ----------
      await irAPestana(page, 'inventario');
      const tarjeta = tarjetaDeProducto(page, producto.nombre);
      await expect(tarjeta).toHaveCount(1);
      await expect(tarjeta).toContainText(producto.marca);

      // ---------- Aserción 2: el estado calculado es el esperado ----------
      // Regla de negocio: stock (4) > mínimo (2) ⇒ "Disponible".
      await expect(tarjeta.locator('.pc-pills')).toContainText(producto.estadoEsperado);

      // ---------- Aserción 3: los indicadores reflejan el alta ----------
      expect(await leerKpi(page, 'kProducts'), 'el contador de productos debe subir en 1')
        .toBe(productosAntes + 1);
      expect(await leerKpi(page, 'kUnits'), 'las unidades deben subir en el stock ingresado')
        .toBe(unidadesAntes + producto.stock);
      expect(await leerKpi(page, 'kValue'), 'el valor de la despensa debe subir en precio × stock')
        .toBe(valorAntes + producto.valorEsperado);

      // ---------- Evidencia ----------
      await testInfo.attach(`AUTO-02_${producto.id}_producto-registrado`, {
        body: await page.screenshot(),
        contentType: 'image/png',
      });

      // ---------- Limpieza posterior ----------
      // Se prueba sobre un entorno productivo real: la suite no debe dejar
      // residuos en la cuenta del usuario.
      await eliminarProducto(page, producto.nombre);
      expect(await leerKpi(page, 'kProducts'), 'el inventario debe volver a su estado inicial')
        .toBe(productosAntes);
    });
  }

});
