
Feature: herokuapp_CrearUsuario

Scenario: Flujo herokuapp_CrearUsuario
  Given el usuario está en la aplicación
  When el usuario ingresa "pruebas@prue.com.co" en "Email"
  And ingresa "1234567" en "Password"
  And hace clic en "Submit"
  And hace clic en "Add a New Contact"
  And hace clic en "* First Name:"
  And completa "* First Name:" con "Framework"
  And hace clic en "* Last Name:"
  And completa "* Last Name:" con "Playwright"
  And hace clic en "Date of Birth:"
  And completa "Date of Birth:" con "1984-04-01"
  When el usuario ingresa "playwright@gmail.com.co" en "Email:"
  And hace clic en "Phone:"
  And completa "Phone:" con "5555555555"
  And hace clic en "Street Address 1:"
  And completa "Street Address 1:" con "calle 154a 99 32"
  And hace clic en "City:"
  And completa "City:" con "Bogota"
  And hace clic en "State or Province:"
  And completa "State or Province:" con "Colombia"
  And hace clic en "Postal Code:"
  And completa "Postal Code:" con "111121"
  And hace clic en "Country:"
  And completa "Country:" con "Bogota"
  And hace clic en "Submit"
  And hace clic en "Framework Playwright"
  And hace clic en "Framework"
  Then la operación es exitosa
