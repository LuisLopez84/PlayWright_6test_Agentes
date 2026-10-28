import { test, expect } from '@playwright/test';
import { soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

const xmlBody = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
<soapenv:Header/>
<soapenv:Body>
<tem:Add>
<tem:intA>5</tem:intA>
<tem:intB>2</tem:intB>
</tem:Add>
</soapenv:Body>
</soapenv:Envelope>

Content-Type: text/xml;charset=UTF-8
SOAPAction: "http://tempuri.org/Add"`;
const malformedXml = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><InvalidRequest/></soap:Body></soap:Envelope>`;

test.describe('Homebanking_TransferenciasTestingQA_SOAP_Post', () => {

  test('SOAP Add - Éxito', async ({ request }) => {
    const response = await soapRequest(request, 'http://www.dneonline.com/calculator.asmx', xmlBody, 'http://tempuri.org/Add');
    expect(response.status()).toBe(200);
    const text = await response.text();
    // Risk 8: WSDL puede usar Add o AddResponse como tag de respuesta
    expect(
      text.includes('Add'),
      'Respuesta debe contener tag Add o AddResponse'
    ).toBe(true);
  });

  test('SOAP Add - Error técnico (endpoint no disponible)', async ({ request }) => {
    let errorDetected = false;
    try {
      const res = await soapRequest(request, 'https://error-tecnico.nonexistent.invalid/', xmlBody, 'http://tempuri.org/Add');
      errorDetected = res.status() >= 500;
    } catch {
      errorDetected = true;
    }
    expect(errorDetected, 'Se esperaba fallo de red o error 5xx').toBe(true);
  });

  test('SOAP Add - Error de datos (body SOAP malformado)', async ({ request }) => {
    const response = await soapRequest(request, 'http://www.dneonline.com/calculator.asmx', malformedXml, 'http://tempuri.org/Add');
    expect([400, 500]).toContain(response.status());
  });

});
