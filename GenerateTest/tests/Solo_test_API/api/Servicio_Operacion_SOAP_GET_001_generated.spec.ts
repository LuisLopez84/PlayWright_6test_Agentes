import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('SOAP API Tests', () => {
  const soapUrl = 'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?op=ListOfContinentsByName';
  const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<ListOfContinentsByName xmlns="http://www.oorsprong.org/websamples.countryinfo">
</ListOfContinentsByName>
</soap:Body>
</soap:Envelope>`;
  const soapAction = 'http://www.oorsprong.org/websamples.countryinfo/ListOfContinentsByName';

  test('Éxito - llamada normal al endpoint real', async ({ request }) => {
    const response = await soapRequest(request, soapUrl, xmlBody, soapAction);
    expect(response.status()).toBe(200);
    const responseBody = await response.text();
    expect(responseBody).toContain('<ListOfContinentsByNameResponse');
  });

  test('Error técnico - fallo de red', async ({ request }) => {
    try {
      await soapRequest(request, 'https://error-tecnico.nonexistent.invalid/', xmlBody, soapAction);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain('NetworkError');
    }
  });

  test('Error de datos - URL inválida', async ({ request }) => {
    const response = await soapRequest(request, soapUrl + '/id-invalido-test-99999', xmlBody, soapAction);
    expect([400, 404, 405, 415, 422, 500]).toContain(response.status());
  });
});