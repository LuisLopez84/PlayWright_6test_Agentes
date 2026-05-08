
Feature: Homebanking_PrestamosTesting

Scenario: Flujo Homebanking_PrestamosTesting
  Given el usuario está en la aplicación
  And hace clic en "elemento"
  And hace clic en "Usuario"
  When el usuario ingresa "demo" en "Usuario"
  And hace clic en "Contraseña"
  And ingresa "demo123" en "Contraseña"
  And hace clic en "Ingresar"
  And hace clic en "Préstamos"
  And selecciona "ACC002" en "#loan-destination-account"
  And hace clic en "Monto a solicitar"
  And completa "Monto a solicitar" con "2000"
  And selecciona "24" en "Cuotas"
  And hace clic en "Solicitar Préstamo"
  And hace clic en "Confirmar"
  And hace clic en "Préstamo acreditado"
  Then la página está disponible sin errores
