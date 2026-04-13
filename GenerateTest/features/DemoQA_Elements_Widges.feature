
Feature: DemoQA_Elements_Widges

@UI
Scenario: Flujo DemoQA_Elements_Widges
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Widgets"
  And hace clic en "Accordian"
  And hace clic en "Where does it come from?"
  And hace clic en "Why do we use it?"
  Then la operación es exitosa
