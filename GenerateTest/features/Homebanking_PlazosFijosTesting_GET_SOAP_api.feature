# GENERADO AUTOMÁTICAMENTE por BoxAPIsExecute — no editar manualmente
# Endpoint : http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?op=ListOfContinentsByName
# Tipo     : SOAP | Método: GET
Feature: API SOAP GET - Homebanking PlazosFijosTesting GET SOAP

  Background:
    Given el servicio SOAP "http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?op=ListOfContinentsByName" con acción "http://www.oorsprong.org/websamples.countryinfo/ListOfContinentsByName" está configurado para pruebas API

  Scenario: Homebanking PlazosFijosTesting GET SOAP - Petición exitosa
    When ejecuto la petición API configurada
    Then la respuesta debe tener un estado de éxito 2xx

  Scenario: Homebanking PlazosFijosTesting GET SOAP - Error técnico del servidor
    When ejecuto la petición API a un endpoint con error técnico
    Then la respuesta debe indicar un fallo técnico de red o 5xx

  Scenario: Homebanking PlazosFijosTesting GET SOAP - Error por datos inválidos
    When ejecuto la petición API con datos inválidos
    Then la respuesta debe indicar error de validación de datos 4xx
