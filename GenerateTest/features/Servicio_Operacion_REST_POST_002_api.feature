# GENERADO AUTOMÁTICAMENTE por BoxAPIsExecute — no editar manualmente
# Endpoint : https://homebanking-demo.onrender.com/pagos/servicios
# Tipo     : REST | Método: POST
Feature: API REST POST - Servicio Operacion REST POST 002

  Background:
    Given el servicio REST "POST" "https://homebanking-demo.onrender.com/pagos/servicios" está configurado para pruebas API

  Scenario: Servicio Operacion REST POST 002 - Petición exitosa
    When ejecuto la petición API configurada
    Then la respuesta debe tener un estado de éxito 2xx

  Scenario: Servicio Operacion REST POST 002 - Error técnico del servidor
    When ejecuto la petición API a un endpoint con error técnico
    Then la respuesta debe indicar un fallo técnico de red o 5xx

  Scenario: Servicio Operacion REST POST 002 - Error por datos inválidos
    When ejecuto la petición API con datos inválidos
    Then la respuesta debe indicar error de validación de datos 4xx
