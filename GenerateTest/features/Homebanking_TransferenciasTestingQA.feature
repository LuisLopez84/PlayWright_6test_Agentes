
Feature: Homebanking_TransferenciasTestingQA

Scenario: Flujo Homebanking_TransferenciasTestingQA
  Given el usuario está en la aplicación
  And page_load
  And hace clic en "elemento"
  And hace clic en "Usuario"
  When el usuario ingresa "demo" en "Usuario"
  And ingresa "demo123" en "Contraseña"
  And hace clic en "Ingresar"
  And hace clic en "Transferencias"
  And selecciona "ACC002" en "#source-account"
  And hace clic en "Monto"
  And completa "Monto" con "10000"
  And hace clic en "Descripción (opcional)"
  And completa "Descripción (opcional)" con "T"
  And completa "Descripción (opcional)" con "Tranferencia prueba 15 2026"
  And hace clic en "Transferir"
  And hace clic en "Confirmar"
  Then la página está disponible sin errores
