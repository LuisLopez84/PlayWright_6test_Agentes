
Feature: DemoQA_Elements_Forms

@UI
Scenario: Flujo DemoQA_Elements_Forms
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Elements"
  And hace clic en "Forms"
  And hace clic en "Practice Form"
  And hace clic en "First Name"
  And completa "First Name" con "Luis"
  And hace clic en "Last Name"
  And completa "Last Name" con "Lopez"
  And hace clic en "name@example.com"
  And completa "name@example.com" con "pruebas@prue.com.co"
  And hace clic en "Mobile Number"
  And completa "Mobile Number" con "3333333333"
  And hace clic en "#dateOfBirthInput"
  And selecciona "1984" en "Choose Saturday, April 11th,"
  And hace clic en "Choose Sunday, April 1st,"
  And hace clic en ".subjects-auto-complete__input-container"
  And completa "#subjectsInput" con "no se"
  And hace clic en "Choose File"
  And hace clic en "Current Address"
  And completa "Current Address" con "test 001"
  And hace clic en "#state > .css-13cymwt-control > .css-hlgwow > .css-19bb58m"
  And hace clic en "Rajasthan"
  And hace clic en ".css-1xc3v61-indicatorContainer"
  And hace clic en "Jaiselmer"
  And hace clic en "Submit"
  And hace clic en "Close"
  Then la operación es exitosa
