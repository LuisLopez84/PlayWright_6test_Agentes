
Feature: Homebankink_Prestamos

Scenario: Flujo Homebankink_Prestamos
  Given el usuario está en la aplicación
  When el usuario ingresa "demo" en "Usuario"
  And ingresa "demo123" en "Contraseña"
  And hace clic en "Ingresar"
  And hace clic en "Préstamos"
  And selecciona "ACC002" en "#loan-destination-account"
  And hace clic en "Monto a solicitar"
  And completa "Monto a solicitar" con "2500"
  And selecciona "24" en "Cuotas"
  And hace clic en "Solicitar Préstamo"
  And hace clic en "Confirmar"
  And hace clic en "Préstamo acreditado"
  Then la operación es exitosa
