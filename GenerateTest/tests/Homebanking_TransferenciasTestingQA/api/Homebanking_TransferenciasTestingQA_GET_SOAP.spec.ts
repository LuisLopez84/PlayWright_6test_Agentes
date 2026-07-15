import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('SOAP API Tests', () => {
    const url = 'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?op=ListOfContinentsByName';
    const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
            <ListOfContinentsByName xmlns="http://www.oorsprong.org/websamples.countryinfo">
            </ListOfContinentsByName>
        </soap:Body>
    </soap:Envelope>`;
    const soapAction = 'http://www.oorsprong.org/websamples.countryinfo/ListOfContinentsByName';

    test('Éxito (2xx) - llamada normal al endpoint real', async ({ request }) => {
        const response = await soapRequest(request, url, xmlBody, soapAction);
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('text/xml');
    });

    test('Error técnico - URL no válida', async ({ request }) => {
        try {
            await soapRequest(request, 'https://error-tecnico.nonexistent.invalid/', xmlBody, soapAction);
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    test('Error de datos (4xx) - ID inválido', async ({ request }) => {
        const response = await soapRequest(request, url + '/id-invalido-test-99999', xmlBody, soapAction);
        expect(response.status()).toBe(400);
        const responseBody = await response.text();
        expect(responseBody).toContain('error'); // Ajustar según el mensaje de error esperado
    });
});