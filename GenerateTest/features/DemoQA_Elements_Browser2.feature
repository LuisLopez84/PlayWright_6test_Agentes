
Feature: DemoQA_Elements_Browser2

@UI
Scenario: Flujo DemoQA_Elements_Browser2
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Alerts, Frame & Windows"
  And hace clic en "Browser Windows"
  And hace clic en "New Window"
  And hace clic en "This is a sample page"
  Then la operación es exitosa
