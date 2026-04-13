
Feature: DemoQA_Elements_Buttons

@UI
Scenario: Flujo DemoQA_Elements_Buttons
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Elements"
  And hace clic en "Buttons"
  And hace clic en "Click Me"
  Then la operación es exitosa
