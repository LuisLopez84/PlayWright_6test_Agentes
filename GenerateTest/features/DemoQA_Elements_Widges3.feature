
Feature: DemoQA_Elements_Widges3

@UI
Scenario: Flujo DemoQA_Elements_Widges3
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Widgets"
  And hace clic en "Date Picker"
  And hace clic en "#datePickerMonthYearInput"
  And selecciona "1950" en "Choose Saturday, April 11th,"
  And selecciona "0" en "elemento"
  And hace clic en "Choose Tuesday, January 31st,"
  And hace clic en "#dateAndTimePickerInput"
  And hace clic en "Next Month"
  And hace clic en "17:45"
  Then la operación es exitosa
