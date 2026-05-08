
Feature: Homebanking_TransferenciasTesting

Scenario: Flujo Homebanking_TransferenciasTesting
  Given el usuario está en la aplicación
  And page_load
  And hace clic en "elemento"
  And hace clic en "Usuario"
  When el usuario ingresa "demo" en "Usuario"
  And hace clic en "Contraseña"
  And ingresa "demo123" en "Contraseña"
  And hace clic en "Ingresar"
  And hace clic en "Transferencias"
  And selecciona "ACC002" en "#source-account"
  And hace clic en "Monto"
  And completa "Monto" con "1000"
  And hace clic en "Descripción (opcional)"
  And completa "Descripción (opcional)" con "c"
  And completa "Descripción (opcional)" con "C"
  And completa "Descripción (opcional)" con "Casi final"
  And hace clic en "Transferir"
  And hace clic en "Confirmar"
  Then la página está disponible sin errores
