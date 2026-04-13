
Feature: DemoQA_Elements_Widges9

@UI
Scenario: Flujo DemoQA_Elements_Widges9
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Widgets"
  And hace clic en "Select Menu"
  And hace clic en ".css-8mmkcg"
  And hace clic en "Group 1, option 2"
  And hace clic en ".css-1xc3v61-indicatorContainer > .css-8mmkcg"
  And hace clic en "Mr."
  And selecciona "4" en "#oldSelectMenu"
  And hace clic en "div:nth-child(8) > .col-md-6 > .css-b62m3t-container > .css-13cymwt-control > .css-1wy0on6 > .css-1xc3v61-indicatorContainer > .css-8mmkcg"
  And hace clic en "#react-select-4-option-2"
  And hace clic en "#react-select-4-option-1"
  And hace clic en "div:nth-child(8)"
  And selecciona "saab" en "#cars"
  Then la operación es exitosa
