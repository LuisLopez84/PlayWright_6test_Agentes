import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

const xmlBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
<soapenv:Header/>
<soapenv:Body>
<tem:Add>
<tem:intA>5</tem:intA>
<tem:intB>2</tem:intB>
</tem:Add>
</soapenv:Body>
</soapenv:Envelope>`;

test('SOAP Add - éxito (200)', async ({ request }) => {
  // 🔥 EL ENDPOINT SE ESPECIFICA AQUÍ (cámbialo por el real)
  const endpoint = 'http://www.dneonline.com/calculator.asmx';
  const soapAction = 'http://tempuri.org/Add';

  const response = await soapRequest(request, endpoint, xmlBody, soapAction);
  expect(response.status()).toBe(200);
  const text = await response.text();
  expect(text).toContain('<AddResult>7</AddResult>');
});