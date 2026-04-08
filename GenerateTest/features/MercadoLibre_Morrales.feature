
Feature: MercadoLibre_Morrales

Scenario: Flujo MercadoLibre_Morrales
  Given el usuario está en la aplicación
  And hace clic en "Ingresa lo que quieras"
  And completa "Ingresa lo que quieras" con "M"
  And completa "Ingresa lo que quieras" con "Morrales"
  And hace clic en "Continuar"
  Then la operación es exitosa
