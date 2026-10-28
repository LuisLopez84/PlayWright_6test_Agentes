# GENERADO AUTOMÁTICAMENTE por BoxAPIsExecute — no editar manualmente
# Endpoint : http://www.dneonline.com/calculator.asmx
# Tipo     : SOAP | Método: POST
Feature: API SOAP POST - Homebanking TransferenciasTestingQA SOAP Post

  Background:
    Given el servicio SOAP "http://www.dneonline.com/calculator.asmx" con acción "http://tempuri.org/Add" está configurado para pruebas API

  Scenario: Homebanking TransferenciasTestingQA SOAP Post - Petición exitosa
    When ejecuto la petición API configurada
    Then la respuesta debe tener un estado de éxito 2xx

  Scenario: Homebanking TransferenciasTestingQA SOAP Post - Error técnico del servidor
    When ejecuto la petición API a un endpoint con error técnico
    Then la respuesta debe indicar un fallo técnico de red o 5xx

  Scenario: Homebanking TransferenciasTestingQA SOAP Post - Error por datos inválidos
    When ejecuto la petición API con datos inválidos
    Then la respuesta debe indicar error de validación de datos 4xx
