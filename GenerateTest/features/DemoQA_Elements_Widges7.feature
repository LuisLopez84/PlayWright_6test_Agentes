
Feature: DemoQA_Elements_Widges7

@UI
Scenario: Flujo DemoQA_Elements_Widges7
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Widgets"
  And hace clic en "Tool Tips"
  And hace clic en "Hover me to see"
  And completa "Hover me to see" con "tool"
  And hace clic en "Hover me to see"
  And hace clic en "Contrary to popular belief,"
  Then la operación es exitosa
