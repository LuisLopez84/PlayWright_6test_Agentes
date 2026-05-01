# GENERADO AUTOMÁTICAMENTE por BoxAPIsExecute — no editar manualmente
# Endpoint : http://www.dneonline.com/calculator.asmx
# Tipo     : SOAP | Método: POST
Feature: API SOAP POST - Homebanking PlazosFijos Servicio Operacion SOAP POST

  Background:
    Given el servicio SOAP "http://www.dneonline.com/calculator.asmx" con acción "http://tempuri.org/Add" está configurado para pruebas API

  Scenario: Homebanking PlazosFijos Servicio Operacion SOAP POST - Petición exitosa
    When ejecuto la petición API configurada
    Then la respuesta debe tener un estado de éxito 2xx

  Scenario: Homebanking PlazosFijos Servicio Operacion SOAP POST - Error técnico del servidor
    When ejecuto la petición API a un endpoint con error técnico
    Then la respuesta debe indicar un fallo técnico de red o 5xx

  Scenario: Homebanking PlazosFijos Servicio Operacion SOAP POST - Error por datos inválidos
    When ejecuto la petición API con datos inválidos
    Then la respuesta debe indicar error de validación de datos 4xx
