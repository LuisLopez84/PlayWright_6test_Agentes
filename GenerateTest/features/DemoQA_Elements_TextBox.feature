
Feature: DemoQA_Elements_TextBox

@UI
Scenario: Flujo DemoQA_Elements_TextBox
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Elements"
  And hace clic en "Text Box"
  And hace clic en "Full Name"
  And completa "Full Name" con "Luis QA"
  And hace clic en "name@example.com"
  And completa "name@example.com" con "luis@luie.com.co"
  And hace clic en "Current Address"
  And completa "Current Address" con "prueba text box"
  And hace clic en "#permanentAddress"
  And completa "#permanentAddress" con "test"
  And hace clic en "Submit"
  Then la operación es exitosa
