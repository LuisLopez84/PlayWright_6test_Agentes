
Feature: DemoQA_Elements_Widges4

Scenario: Flujo DemoQA_Elements_Widges4
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Widgets"
  And hace clic en "Slider"
  And completa "#slider" con "80"
  And hace clic en "#sliderValue"
  Then la operación es exitosa
