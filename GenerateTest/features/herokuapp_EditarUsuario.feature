
Feature: herokuapp_EditarUsuario

Scenario: Flujo herokuapp_EditarUsuario
  Given el usuario está en la aplicación
  When el usuario ingresa "pruebas@prue.com.co" en "Email"
  And ingresa "1234567" en "Password"
  And hace clic en "Submit"
  And hace clic en "Framework Playwright"
  And hace clic en "Edit Contact"
  And hace clic en "First Name:"
  And hace clic en "Last Name:"
  And hace clic en "Date of Birth:"
  And hace clic en "Submit"
  And hace clic en "Framework001"
  Then la operación es exitosa
