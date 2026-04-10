
Feature: Homebanking_Transfer

Scenario: Flujo Homebanking_Transfer
  Given el usuario está en la aplicación
  When el usuario ingresa "demo" en "Usuario"
  And ingresa "demo123" en "Contraseña"
  And hace clic en "Ingresar"
  And hace clic en "¡Bienvenido! Inicio de sesión"
  And hace clic en "Transferencias"
  And selecciona "ACC002" en "#source-account"
  And hace clic en "Monto"
  And completa "Monto" con "1002"
  And hace clic en "Descripción (opcional)"
  And completa "Descripción (opcional)" con "Cloude 002"
  And hace clic en "Transferir"
  And hace clic en "Confirmar"
  And hace clic en "Transferencia realizada"
  And hace clic en "Salir"
  And hace clic en "Confirmar"
  Then la operación es exitosa
