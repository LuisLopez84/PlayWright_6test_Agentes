
Feature: DemoQA_Elements_Interactions

Scenario: Flujo DemoQA_Elements_Interactions
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Interactions"
  And hace clic en "Sortable"
  And hace clic en "List').getByText('One"
  And hace clic en "List').getByText('Two"
  And hace clic en "Grid"
  And hace clic en "Grid').getByText('Five"
  And hace clic en "Grid').getByText('Three"
  And hace clic en "Grid').getByText('One"
  Then la operación es exitosa
