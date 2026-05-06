
Feature: MercadoLibre_Audifonos

Scenario: Flujo MercadoLibre_Audifonos
  Given el usuario está en la aplicación
  And page_load
  And hace clic en "elemento"
  And hace clic en "Ingresa lo que quieras"
  And completa "Ingresa lo que quieras" con "audifonos"
  And hace clic en "Buscar"
  And hace clic en "elemento"
  And hace clic en "Smartwatches y Accesorios"
  And hace clic en "Soy nuevo"
  Then la página está disponible sin errores
