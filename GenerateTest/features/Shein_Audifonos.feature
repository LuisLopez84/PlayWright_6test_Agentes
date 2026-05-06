
Feature: Shein_Audifonos

Scenario: Flujo Shein_Audifonos
  Given el usuario está en la aplicación
  And hace clic en "elemento"
  And hace clic en "Aceptar Todo"
  And hace clic en "Buscar: Musera"
  And hace clic en "Buscar: Vestidos De Baño"
  And completa "Buscar:" con "audifo"
  And completa "Buscar: audifo" con "audifonos"
  And hace clic en "Buscar"
  And hace clic en "STATUS:"
  Then la página está disponible sin errores
