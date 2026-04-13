
Feature: DemoQA_Elements_DownloadUpload

Scenario: Flujo DemoQA_Elements_DownloadUpload
  Given el usuario está en la aplicación
  And hace clic en "Book Store Application"
  And hace clic en "Elements"
  And hace clic en "Upload and Download"
  And hace clic en "Choose File"
  Then la operación es exitosa
