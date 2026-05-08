import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('SOAP API Tests', () => {
    const url = 'http://www.dneonline.com/calculator.asmx';
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
    const soapAction = 'http://tempuri.org/Add';

    test('Éxito (2xx) - llamada normal al endpoint real', async ({ request }) => {
        const response = await soapRequest(request, url, xmlBody, soapAction);
        expect(response.status()).toBe(200);
        const responseBody = await response.text();
        expect(responseBody).toContain('<AddResult>7</AddResult>');
    });

    test('Error técnico - URL inválida', async ({ request }) => {
        try {
            await soapRequest(request, 'https://error-tecnico.nonexistent.invalid/', xmlBody, soapAction);
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    test('Error de datos (4xx) - ID inválido', async ({ request }) => {
        const response = await soapRequest(request, url + '/id-invalido-test-99999', xmlBody, soapAction);
        expect(response.status()).toBe(400);
    });
});