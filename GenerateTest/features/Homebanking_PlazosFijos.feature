
Feature: Homebanking_PlazosFijos

Scenario: Flujo Homebanking_PlazosFijos
  Given el usuario está en la aplicación
  When el usuario ingresa "demo" en "Usuario"
  And ingresa "demo123" en "Contraseña"
  And hace clic en "Ingresar"
  And hace clic en "Plazos Fijos"
  And selecciona "ACC002" en "#deposit-source-account"
  And hace clic en "Monto a invertir"
  And completa "Monto a invertir" con "1001"
  And selecciona "360" en "Plazo"
  And hace clic en "Crear Plazo Fijo"
  And hace clic en "Confirmar"
  Then la operación es exitosa
