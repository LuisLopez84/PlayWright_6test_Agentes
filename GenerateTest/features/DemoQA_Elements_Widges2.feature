
Feature: DemoQA_Elements_Widges2

@UI
Scenario: Flujo DemoQA_Elements_Widges2
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Widgets"
  And hace clic en "Auto Complete"
  And hace clic en ".auto-complete__input-container"
  And completa "#autoCompleteMultipleInput" con "diez"
  And hace clic en ".auto-complete__input-container.css-19bb58m"
  And completa "#autoCompleteSingleInput" con "azul"
  And hace clic en ".col-12.mt-4.col-md-6 > div:nth-child(2)"
  Then la operación es exitosa
