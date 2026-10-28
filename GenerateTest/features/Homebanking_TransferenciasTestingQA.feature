
@UI
Feature: Homebanking_TransferenciasTestingQA

Scenario: Flujo Homebanking_TransferenciasTestingQA
  Given el usuario está en la aplicación
  And hace clic en "Usuario"
  When el usuario ingresa "demo" en "Usuario"
  And ingresa "demo123" en "Contraseña"
  And hace clic en "Ingresar"
  And hace clic en "Transferencias"
  And selecciona "ACC002" en "#source-account"
  And hace clic en "Transferir"
  And completa "Monto" con "1555"
  And hace clic en "Descripción (opcional)"
  And completa "Descripción (opcional)" con "P"
  And completa "Descripción (opcional)" con "Prueba "
  And completa "Descripción (opcional)" con "Prueba C"
  And completa "Descripción (opcional)" con "Prueba Cobertura "
  And completa "Descripción (opcional)" con "Prueba Cobertura IA"
  And hace clic en "Transferir"
  And hace clic en "Confirmar"
  And hace clic en "Salir"
  And hace clic en "Confirmar"
  Then la página está disponible sin errores
