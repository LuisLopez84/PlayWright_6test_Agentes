
Feature: Homebankink_TarjetaVirtual

@UI
Scenario: Flujo Homebankink_TarjetaVirtual
  Given el usuario está en la aplicación
  When el usuario ingresa "demo" en "Usuario"
  And ingresa "demo123" en "Contraseña"
  And hace clic en "Ingresar"
  And hace clic en "Tarjeta Virtual"
  And selecciona "ACC002" en "Sincronizar con cuenta:"
  And hace clic en "+ Generar Nueva Tarjeta"
  Then la operación es exitosa
