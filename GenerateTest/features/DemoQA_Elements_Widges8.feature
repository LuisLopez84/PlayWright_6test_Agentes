
Feature: DemoQA_Elements_Widges8

@UI
Scenario: Flujo DemoQA_Elements_Widges8
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Widgets"
  And hace clic en "Menu"
  And hace clic en "Main Item 1"
  And hace clic en "Main Item 2"
  And hace clic en "Main Item 3"
  And hace clic en "Main Item 2"
  And hace clic en "SUB SUB LIST »"
  And hace clic en "Sub Sub Item 1"
  And hace clic en "Sub Sub Item 2"
  Then la operación es exitosa
