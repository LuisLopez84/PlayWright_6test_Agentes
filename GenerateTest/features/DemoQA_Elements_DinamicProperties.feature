
Feature: DemoQA_Elements_DinamicProperties

Scenario: Flujo DemoQA_Elements_DinamicProperties
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Dynamic Properties"
  And hace clic en "Color Change"
  And hace clic en "Will enable 5 seconds"
  And hace clic en "Visible After 5 Seconds"
  And hace clic en "Will enable 5 seconds"
  And hace clic en "Visible After 5 Seconds"
  And hace clic en "Color Change"
  Then la operación es exitosa
