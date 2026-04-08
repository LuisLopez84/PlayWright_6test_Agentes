
Feature: Homebanking_Pruebas001

Scenario: Flujo Homebanking_Pruebas001
  Given el usuario está en la aplicación
  When el usuario ingresa "demo" en "Usuario"
  And ingresa "demo123" en "Contraseña"
  And hace clic en "Ingresar"
  And hace clic en "¡Bienvenido! Inicio de sesión"
  Then la operación es exitosa
