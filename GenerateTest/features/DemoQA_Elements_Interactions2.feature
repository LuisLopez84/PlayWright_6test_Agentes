
Feature: DemoQA_Elements_Interactions2

@UI
Scenario: Flujo DemoQA_Elements_Interactions2
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Interactions"
  And hace clic en "Selectable"
  And hace clic en "Resizable"
  And hace clic en "Resizable box, starting at"
  And hace clic en "#resizable"
  Then la operación es exitosa
