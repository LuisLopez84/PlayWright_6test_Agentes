
Feature: Homebanking_Tarjeta_Virtual

Scenario: Flujo Homebanking_Tarjeta_Virtual
  Given el usuario está en la aplicación
  And hace clic en "elemento"
  And hace clic en "Usuario"
  When el usuario ingresa "demo" en "Usuario"
  And hace clic en "Contraseña"
  And ingresa "demo123" en "Contraseña"
  And hace clic en "Ingresar"
  And hace clic en "Tarjeta Virtual"
  And selecciona "ACC002" en "Sincronizar con cuenta:"
  And hace clic en "+ Generar Nueva Tarjeta"
  Then la página está disponible sin errores
