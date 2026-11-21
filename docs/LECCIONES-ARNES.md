# Lo que enseñó el arnés de pruebas

Se necesitaron **cinco corridas completas** de 36 ejecuciones para obtener un resultado
estable. Las cuatro primeras reportaron fallos que **no correspondían a defectos de la
aplicación**, sino a errores de la propia suite.

| Corrida | Consistencia | Causa del fallo | ¿Defecto del producto? |
|---|---|---|---|
| 1.ª | 91,7 % (33/36) | El analizador de números de la suite eliminaba el separador decimal, convirtiendo `1.000.022,5` en `10000225` y rompiendo las comparaciones aritméticas | No |
| 2.ª | 50,0 % (18/36) | Un manejador `page.once` que no llegaba a dispararse quedaba pendiente y cancelaba la eliminación posterior, propagando el error en cascada | No |
| 3.ª | 97,2 % (35/36) | Condición de carrera con la escritura diferida a la nube (650 ms de retardo) | No |
| 4.ª | 94,4 % (34/36) | Reversión intermitente de un campo numérico del formulario durante el rellenado | No |
| 5.ª | **100 % (36/36)** | — | — |

Ninguno de los cinco fallos acumulados correspondió a un defecto del software bajo prueba.
Los seis defectos reportados salieron íntegramente de la ejecución manual y exploratoria.

## Cómo se distingue un falso positivo de un defecto real

El diagnóstico de la 4.ª corrida es el más instructivo. Los dos fallos eran **simétricos**:
una prueba esperaba "Disponible" y obtuvo "Stock bajo"; la otra esperaba "Stock bajo" y
obtuvo "Disponible".

Esa simetría descartaba de entrada un error de la regla de negocio — *una regla mal
programada se equivoca siempre en el mismo sentido*.

Las capturas de fallo confirmaron la causa: en ambos casos un solo campo numérico había
vuelto a su valor por omisión, y la etiqueta que mostró la aplicación era **correcta para
el valor que efectivamente tenía guardado**. El cálculo funcionaba; lo que falló fue la
escritura del formulario por parte del script. El modal se redibuja mientras se rellena, y
de forma intermitente ese redibujado revertía un campo escrito antes.

La corrección fue añadir una pasada de verificación que comprueba con `inputValue()` cada
campo antes de guardar y lo reescribe si se desvió.

Conviene registrar el matiz con honestidad: se clasifica como defecto del arnés porque un
`fill()` programático escribe más rápido de lo que la interfaz alcanza a redibujar. No se
descarta que un usuario que teclee muy rápido encuentre el mismo comportamiento. Queda
anotado como línea de trabajo futura en lugar de archivado.

## Un quinto defecto que ninguna prueba detectó

Al revisar la captura del reporte HTML **antes de archivarla**, se descubrió que Playwright
registra el valor de cada `fill` en el título del paso. El reporte mostraba literalmente la
contraseña de la cuenta de prueba dentro del propio documento de evidencia — en
contradicción directa con los resguardos declarados para la campaña.

Se corrigió el arnés para que el campo de contraseña se rellene sin registrar su valor, y
se regeneró el reporte.

Merece constar por dos razones:

1. **No lo encontró ninguna prueba.** Lo encontró revisar la evidencia con criterio de QA
   antes de firmarla, que es precisamente el tipo de juicio que una suite automatizada no
   emite.
2. **La fuga estaba en el instrumento de medición, no en el producto.** La aplicación
   enmascaraba el campo correctamente.

## Lecciones

**Una suite automatizada es también software y necesita su propia verificación** antes de
que sus resultados sirvan como evidencia. El analizador de números se validó con nueve
casos de prueba propios antes de darlo por bueno.

**`retries: 0` fue la decisión correcta.** Un reintento automático habría convertido estos
fallos en pruebas "inestables" que pasan al segundo intento, y ninguno se habría
diagnosticado ni corregido.

**Todo fallo se investiga antes de clasificarlo.** Declarar defecto del producto cualquiera
de estos cinco fallos habría producido reportes falsos — que es la forma más rápida de que
un equipo de desarrollo deje de confiar en el trabajo de QA.

**En esta campaña, depurar el arnés consumió más esfuerzo que ejecutar las pruebas.** Es el
riesgo que la literatura señala entre las desventajas de la automatización, y conviene
presupuestarlo en lugar de descubrirlo.
