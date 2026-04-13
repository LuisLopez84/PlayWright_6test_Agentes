
Feature: Homebankink_PagoServicios

@UI
Scenario: Flujo Homebankink_PagoServicios
  Given el usuario está en la aplicación
  When el usuario ingresa "demo" en "Usuario"
  And ingresa "demo123" en "Contraseña"
  And hace clic en "Ingresar"
  And hace clic en "Pago de Servicios"
  And selecciona "SRV003" en "Selecciona el Servicio"
  And hace clic en "Monto a Pagar"
  And completa "Monto a Pagar" con "2750"
  And selecciona "ACC002" en "Cuenta a Debitar"
  And hace clic en "Pagar Servicio"
  Then la operación es exitosa
