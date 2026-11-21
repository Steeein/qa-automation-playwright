# Metodología aplicada

## Diseño de casos

| Fase | Técnica | Fundamento |
|---|---|---|
| Diseño | Partición de equivalencia y análisis de valores límite | Cubre el dominio de entrada con el mínimo de casos y concentra el esfuerzo donde aparecen los defectos de validación |
| Ejecución manual | Caja negra desde la perspectiva del usuario final | Comprobar que lo obtenido coincide con lo esperado, sin acceso al código |
| Gestión de defectos | Registro estructurado, causa raíz (5 porqués), priorización severidad × prioridad | El análisis de causa raíz previene la recurrencia en lugar de tratar el síntoma |
| Exploración | Session-Based Test Management, con carta de misión y timebox | Capacidad de descubrimiento sin sobrecarga de información |
| Automatización | E2E con Playwright sobre casos repetitivos y estables | Priorizar por importancia, riesgo y valor comercial |

## Métricas de ejecución

Se definieron antes de ejecutar, para que los números no se eligieran después de conocer
el resultado.

| # | Métrica | Fórmula | Valor |
|---|---|---|---|
| M1 | Casos diseñados | — | 12 |
| M2 | Casos ejecutados | — | 12 |
| M5 | Tasa de éxito | M3 ÷ M2 | 66,7 % |
| M6 | Densidad de defectos | defectos ÷ M2 | 0,33 |
| M7 | Cobertura de módulos | probados ÷ totales | 85,7 % |
| M8 | Casos negativos y de borde | 4 ÷ 12 | 33,3 % |

Sobre M8: por debajo del 20 % la suite tiende a confirmar lo que ya se sabe que funciona;
por encima del 50 % pierde representatividad respecto del uso real.

## Casos formales y exploración son complementarios

Los 12 casos formales encontraron 4 defectos. Las 3 sesiones exploratorias encontraron 2
más que **ningún caso predefinido habría detectado** — un tercio del total. Los casos
verifican lo que ya se pensó; la exploración descubre lo que no se pensó.

La exploración aportó además dos cosas que el diseño previo no contemplaba:

- **Acotó un defecto en lugar de solo encontrarlo.** Un escenario comprobó que la función
  sospechosa sí operaba correctamente sobre su caso normal. Eso cambió el hallazgo de "la
  función está rota" a algo mucho más preciso, y la recomendación cambió en consecuencia.
- **Descartó dos sospechas.** Dos escenarios se diseñaron esperando defectos y demostraron
  lo contrario. Se registran como comportamientos correctos verificados, no se omiten: un
  resultado que refuta la hipótesis del propio tester también es evidencia.

## Dónde estaban los defectos

El 100 % de los casos positivos del camino feliz se comportó correctamente. Los fallos se
concentraron en escenarios alternativos, valores límite y condiciones de error. Lectura:
el producto estaba bien construido para el uso que se imaginó; lo que faltaba era
endurecerlo frente al uso que no se imaginó.

## Manual vs. automatizado

| Dimensión | Manual | Automatizado |
|---|---|---|
| Ejecuciones realizadas | 12 | 36 |
| Defectos detectados | 4 | 0 |
| Tiempo por ciclo | ≈ 90 min | 2,5 min |
| Juzgar mensajes contradictorios | Alta | Nula sin una aserción escrita a propósito |
| Descubrir lo no previsto | Alta | Nula |
| Consistencia entre repeticiones | Depende del ejecutor | 100 % |

La automatización detectó cero defectos nuevos, y eso no es una falla: es lo que la teoría
predice. Los scripts verifican lo que se les dijo que verificaran. Los defectos manuales
surgieron de juicios que solo una persona emite — notar que un mensaje verde contradice un
texto rojo en la misma pantalla, advertir que se deshizo algo distinto de lo pedido,
percibir que dos módulos muestran cifras incompatibles.

El valor de la automatización es otro y es igual de real: 36 ejecuciones consistentes que
confirman que el camino crítico no se ha degradado, en dos resoluciones y en una fracción
del tiempo manual. Libera al tester de lo repetitivo para que haga lo exploratorio — y en
esta campaña esa liberación se tradujo en 2 defectos adicionales.
