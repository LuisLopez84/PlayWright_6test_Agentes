
Feature: DemoQA_Elements_CheckBox

Scenario: Flujo DemoQA_Elements_CheckBox
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Elements"
  And hace clic en "Check Box"
  And hace clic en ".rc-tree-switcher"
  And hace clic en ".rc-tree-switcher.rc-tree-switcher_close"
  And hace clic en "Select Excel File.doc Excel"
  Then la operación es exitosa
