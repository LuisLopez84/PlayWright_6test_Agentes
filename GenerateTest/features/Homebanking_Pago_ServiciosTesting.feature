
Feature: Homebanking_Pago_ServiciosTesting

Scenario: Flujo Homebanking_Pago_ServiciosTesting
  Given el usuario está en la aplicación
  And hace clic en "elemento"
  And hace clic en "Usuario"
  When el usuario ingresa "demo" en "Usuario"
  And hace clic en "Contraseña"
  And ingresa "demo123" en "Contraseña"
  And hace clic en "Ingresar"
  And hace clic en "Pago de Servicios"
  And selecciona "SRV004" en "Selecciona el Servicio"
  And hace clic en "Monto a Pagar"
  And completa "Monto a Pagar" con "2500"
  And selecciona "ACC003" en "Cuenta a Debitar"
  And hace clic en "Pagar Servicio"
  Then la página está disponible sin errores
