import { test, expect } from '@playwright/test';
import { soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<ListOfContinentsByName xmlns="http://www.oorsprong.org/websamples.countryinfo">
</ListOfContinentsByName>
</soap:Body>
</soap:Envelope>`;
const malformedXml = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><InvalidRequest/></soap:Body></soap:Envelope>`;

test.describe('Homebanking_TransferenciasTestingQA_GET_SOAP', () => {

  test('SOAP ListOfContinentsByName - Éxito', async ({ request }) => {
    const response = await soapRequest(request, 'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?op=ListOfContinentsByName', xmlBody, 'http://www.oorsprong.org/websamples.countryinfo/ListOfContinentsByName');
    expect(response.status()).toBe(200);
    const text = await response.text();
    // Risk 8: WSDL puede usar ListOfContinentsByName o ListOfContinentsByNameResponse como tag de respuesta
    expect(
      text.includes('ListOfContinentsByName'),
      'Respuesta debe contener tag ListOfContinentsByName o ListOfContinentsByNameResponse'
    ).toBe(true);
  });

  test('SOAP ListOfContinentsByName - Error técnico (endpoint no disponible)', async ({ request }) => {
    let errorDetected = false;
    try {
      const res = await soapRequest(request, 'https://error-tecnico.nonexistent.invalid/', xmlBody, 'http://www.oorsprong.org/websamples.countryinfo/ListOfContinentsByName');
      errorDetected = res.status() >= 500;
    } catch {
      errorDetected = true;
    }
    expect(errorDetected, 'Se esperaba fallo de red o error 5xx').toBe(true);
  });

  test('SOAP ListOfContinentsByName - Error de datos (body SOAP malformado)', async ({ request }) => {
    const response = await soapRequest(request, 'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?op=ListOfContinentsByName', malformedXml, 'http://www.oorsprong.org/websamples.countryinfo/ListOfContinentsByName');
    expect([400, 500]).toContain(response.status());
  });

});
