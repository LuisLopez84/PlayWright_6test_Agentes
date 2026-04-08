import { test, expect } from '@playwright/test';
import { smartGoto } from '@utils/navigation-helper';

test('homepage visual test', async ({ page }) => {

  await smartGoto(page, 'GLOBAL');
  await expect(page).toHaveScreenshot('homepage.png', {
    fullPage: true,
    animations: 'disabled'
  });

});




















/*
Documentación:
Qué es Visual Testing
El Visual Testing detecta cambios visuales en la interfaz que los tests funcionales normales no detectan.
Ejemplo:
Botón se movió de lugar
Texto cambió de tamaño
Color incorrecto
Imagen desapareció
Layout roto

Un test funcional podría pasar, pero la UI podría verse mal.
El test detecta exactamente eso.


Este test hace tres cosas princiales:
1. Abrir la aplicación await page.goto('/');
2. Tomar screenshot:
await expect(page).toHaveScreenshot('homepage.png', {
  fullPage: true,
  animations: 'disabled'
});
3. Ejecucón: Qué pasa cuando ejecutas el test otra vez
Playwright:

a. toma un nuevo screenshot
b. lo compara con el baseline
c. calcula diferencias pixel por pixel
Si detecta diferencia:

TEST FALLA


Cuando hay diferencias crea 3 imágenes:

expected.png
actual.png
diff.png

Ejemplo:

expected.png  ← baseline
actual.png    ← nuevo screenshot
diff.png      ← diferencias resaltadas

Esto es extremadamente útil para detectar:

regresiones visuales


Qué hace fullPage: true
fullPage: true

Esto significa:

capturar toda la página
no solo el viewport

Sin esto solo captura lo visible.

Ejemplo:

Viewport = 1080px
Página = 3500px

Con fullPage captura los 3500px.



Qué hace fullPage: true
fullPage: true

Esto significa:

capturar toda la página
no solo el viewport

Sin esto solo captura lo visible.

Ejemplo:

Viewport = 1080px
Página = 3500px

Con fullPage captura los 3500px.



Qué hace animations: 'disabled'
animations: 'disabled'

Esto desactiva:

CSS animations
transitions
loading effects

Porque si no, el screenshot podría capturar:

un frame distinto cada vez
Y el test fallaría falsamente.

Qué detecta exactamente este test?
Detecta cambios como:
Layout roto
Antes:
Login button
Después:
Login button
          (movido)
Cambios de color
Antes:
botón azul
Después:

botón rojo
Cambios en fuentes

Antes:
font-size: 16px
Después:
font-size: 20px
Elementos desaparecidos

Antes:
logo
Después:
(no existe)

*/