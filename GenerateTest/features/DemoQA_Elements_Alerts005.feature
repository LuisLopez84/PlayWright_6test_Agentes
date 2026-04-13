
Feature: DemoQA_Elements_Alerts005

Scenario: Flujo DemoQA_Elements_Alerts005
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "div:nth-child(3) > .group-header > .header-wrapper > .header-right"
  And hace clic en "Alerts"
  And hace clic en "#alertButton"
  And hace clic en "#timerAlertButton"
  And hace clic en "#confirmButton"
  And hace clic en "#promtButton"
  Then la operación es exitosa
