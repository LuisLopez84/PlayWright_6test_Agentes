
Feature: Mercadolibre_test

Scenario: Flujo Mercadolibre_test
  Given el usuario está en la aplicación
  And hace clic en "Electrónica, Audio y Video"
  And hace clic en "Cables de Audio y Video"
  And hace clic en "Más tarde"
  And hace clic en "Adaptador Conversor"
  And hace clic en "Agregar al carrito"
  Then la operación es exitosa
