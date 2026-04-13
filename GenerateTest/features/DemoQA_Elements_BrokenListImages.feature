
Feature: DemoQA_Elements_BrokenListImages

Scenario: Flujo DemoQA_Elements_BrokenListImages
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Elements"
  And hace clic en "Broken Links - Images"
  And hace clic en "Click Here for Valid Link"
  And hace clic en "Book Store Application"
  And hace clic en "Elements"
  And hace clic en "Broken Links - Images"
  And hace clic en "Click Here for Broken Link"
  And hace clic en "This page returned a 500"
  Then la operación es exitosa
