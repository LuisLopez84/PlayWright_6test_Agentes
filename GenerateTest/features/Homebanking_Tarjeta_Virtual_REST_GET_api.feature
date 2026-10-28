# GENERADO AUTOMÁTICAMENTE por BoxAPIsExecute — no editar manualmente
# Endpoint : https://homebanking-demo.onrender.com/tarjetas/
# Tipo     : REST | Método: GET
Feature: API REST GET - Homebanking Tarjeta Virtual REST GET

  Background:
    Given el servicio REST "GET" "https://homebanking-demo.onrender.com/tarjetas/" está configurado para pruebas API

  Scenario: Homebanking Tarjeta Virtual REST GET - Petición exitosa
    When ejecuto la petición API configurada
    Then la respuesta debe tener un estado de éxito 2xx

  Scenario: Homebanking Tarjeta Virtual REST GET - Error técnico del servidor
    When ejecuto la petición API a un endpoint con error técnico
    Then la respuesta debe indicar un fallo técnico de red o 5xx

  Scenario: Homebanking Tarjeta Virtual REST GET - Error por datos inválidos
    When ejecuto la petición API con datos inválidos
    Then la respuesta debe indicar error de validación de datos 4xx
