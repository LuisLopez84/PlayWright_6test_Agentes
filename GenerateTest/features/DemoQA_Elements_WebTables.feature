
Feature: DemoQA_Elements_WebTables

Scenario: Flujo DemoQA_Elements_WebTables
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Elements"
  And hace clic en "Web Tables"
  And hace clic en "#edit-record-1 > svg"
  And hace clic en "First Name"
  And hace clic en "Last Name"
  And hace clic en "Submit"
  And hace clic en "Add"
  And hace clic en "First Name"
  And completa "First Name" con "LUISQA"
  And hace clic en "Last Name"
  And completa "Last Name" con "LOPEZQA"
  And hace clic en "name@example.com"
  And completa "name@example.com" con "LUIS@GMAIL.COM"
  And hace clic en "Age"
  And completa "Age" con "42"
  And hace clic en "Salary"
  And completa "Salary" con "1000000000"
  And hace clic en "Department"
  And completa "Department" con "Bogota"
  And hace clic en "Submit"
  And hace clic en "LUISQA"
  Then la operación es exitosa
