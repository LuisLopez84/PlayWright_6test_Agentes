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

  test('Éxito - llamada normal al endpoint real', async ({ request }) => {
    const response = await soapRequest(request, soapUrl, xmlBody, soapAction);
    expect(response.status()).toBe(200);
    const responseBody = await response.text();
    expect(responseBody).toContain('<AddResult>7</AddResult>');
  });

  test('Error técnico - fallo de red', async ({ request }) => {
    try {
      await soapRequest(request, 'https://error-tecnico.nonexistent.invalid/', xmlBody, soapAction);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain('NetworkError');
    }
  });

  test('Error de datos - datos inválidos', async ({ request }) => {
    const response = await soapRequest(request, soapUrl, `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
<soapenv:Header/>
<soapenv:Body>
<tem:Add>
<tem:intA>null</tem:intA>
<tem:intB>null</tem:intB>
</tem:Add>
</soapenv:Body>
</soapenv:Envelope>`, soapAction);
    expect([400, 404, 405, 415, 422, 500]).toContain(response.status());
  });
});