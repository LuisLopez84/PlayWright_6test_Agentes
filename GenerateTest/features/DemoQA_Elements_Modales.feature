
Feature: DemoQA_Elements_Modales

Scenario: Flujo DemoQA_Elements_Modales
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Alerts, Frame & Windows"
  And hace clic en "Modal Dialogs"
  And hace clic en "Small modal"
  And hace clic en "Close"
  And hace clic en "Large modal"
  And hace clic en "Close"
  Then la operación es exitosa
