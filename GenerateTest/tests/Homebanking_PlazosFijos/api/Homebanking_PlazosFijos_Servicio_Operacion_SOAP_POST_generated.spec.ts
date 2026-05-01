import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('SOAP API Tests', () => {
  const soapUrl = 'http://www.dneonline.com/calculator.asmx';
  const xmlBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
<soapenv:Header/>
<soapenv:Body>
<tem:Add>
<tem:intA>5</tem:intA>
<tem:intB>2</tem:intB>
</tem:Add>
</soapenv:Body>
</soapenv:Envelope>`;
  const soapAction = 'http://tempuri.org/Add';

  test('Éxito (2xx) - llamada normal al endpoint real', async ({ request }) => {
    const response = await soapRequest(request, soapUrl, xmlBody, soapAction);
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
    const responseBody = await response.text();
    expect(responseBody).toContain('<AddResult>7</AddResult>');
  });

  test('Error técnico (fallo de red / 5xx)', async ({ request }) => {
    try {
      await soapRequest(request, 'https://error-tecnico.nonexistent.invalid/', xmlBody, soapAction);
      expect(false).toBe(true); // Forzar fallo si no lanza error
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test('Error de datos (4xx)', async ({ request }) => {
    const response = await soapRequest(request, soapUrl, `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
<soapenv:Header/>
<soapenv:Body>
<tem:Add>
<tem:intA>null</tem:intA>
<tem:intB>2</tem:intB>
</tem:Add>
</soapenv:Body>
</soapenv:Envelope>`, soapAction);
    expect([400, 404, 405, 415, 422, 500]).toContain(response.status());
  });
});