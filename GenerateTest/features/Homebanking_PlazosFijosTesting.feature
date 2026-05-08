
Feature: Homebanking_PlazosFijosTesting

Scenario: Flujo Homebanking_PlazosFijosTesting
  Given el usuario está en la aplicación
  And hace clic en "elemento"
  And hace clic en "Usuario"
  When el usuario ingresa "demo" en "Usuario"
  And hace clic en "Contraseña"
  And ingresa "demo123" en "Contraseña"
  And hace clic en "Ingresar"
  And hace clic en "Plazos Fijos"
  And selecciona "ACC002" en "#deposit-source-account"
  And hace clic en "Monto a invertir"
  And completa "Monto a invertir" con "1100"
  And selecciona "360" en "Plazo"
  And hace clic en "Crear Plazo Fijo"
  And hace clic en "Confirmar"
  Then la página está disponible sin errores
