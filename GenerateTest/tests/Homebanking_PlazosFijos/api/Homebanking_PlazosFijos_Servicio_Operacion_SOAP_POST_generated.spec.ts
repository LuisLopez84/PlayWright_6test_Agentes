import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('SOAP API Tests', () => {
  const url = 'http://www.dneonline.com/calculator.asmx';
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
    const response = await soapRequest(request, url, xmlBody, soapAction);
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
    const responseBody = await response.text();
    expect(responseBody).toContain('<AddResult>7</AddResult>');
  });

  test('Error técnico (fallo de red / 5xx)', async ({ request }) => {
    let errorDetected = false;
    try {
      await soapRequest(request, 'https://error-tecnico.nonexistent.invalid/', xmlBody, soapAction);
    } catch (error) {
      errorDetected = true;
    }
    expect(errorDetected).toBe(true);
  });

  test('Error de datos (4xx)', async ({ request }) => {
    const response = await soapRequest(request, url, '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Header/><soapenv:Body><tem:Add><tem:intA></tem:intA><tem:intB></tem:intB></tem:Add></soapenv:Body></soapenv:Envelope>', soapAction);
    expect([400, 404, 405, 415, 422, 500]).toContain(response.status());
  });
});