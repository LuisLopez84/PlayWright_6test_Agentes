import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('SOAP API Tests', () => {
  test('Successful SOAP request', async ({ request }) => {
    const xmlBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
        <soapenv:Header/>
        <soapenv:Body>
          <tem:Add>
            <tem:intA>5</tem:intA>
            <tem:intB>2</tem:intB>
          </tem:Add>
        </soapenv:Body>
      </soapenv:Envelope>
    `;
    
    const response = await soapRequest(request, 'http://www.dneonline.com/calculator.asmx', xmlBody, 'http://tempuri.org/Add');
    
    expect(response.status()).toBe(200);
    const responseBody = await response.text();
    expect(responseBody).toContain('<AddResult>7</AddResult>');
  });

  test('SOAP request with error', async ({ request }) => {
    const xmlBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
        <soapenv:Header/>
        <soapenv:Body>
          <tem:Add>
            <tem:intA>invalid</tem:intA>
            <tem:intB>2</tem:intB>
          </tem:Add>
        </soapenv:Body>
      </soapenv:Envelope>
    `;
    
    const response = await soapRequest(request, 'http://www.dneonline.com/calculator.asmx', xmlBody, 'http://tempuri.org/Add');
    
    expect(response.status()).toBeGreaterThanOrEqual(400);
    const responseBody = await response.text();
    expect(responseBody).toContain('<faultstring>');
  });
});