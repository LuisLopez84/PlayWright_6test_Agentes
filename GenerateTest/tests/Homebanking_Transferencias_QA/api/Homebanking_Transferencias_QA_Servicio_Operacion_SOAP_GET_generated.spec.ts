import { test, expect } from '@playwright/test';
import { restRequest, soapRequest } from '../../../../ConfigurationTest/tests/utils/api-helper';

test.describe('SOAP API Tests', () => {
  test('should return list of continents by name', async ({ request }) => {
    const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <ListOfContinentsByName xmlns="http://www.oorsprong.org/websamples.countryinfo">
        </ListOfContinentsByName>
      </soap:Body>
    </soap:Envelope>`;
    
    const response = await soapRequest(request, 'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?op=ListOfContinentsByName', xmlBody, 'http://www.oorsprong.org/websamples.countryinfo/ListOfContinentsByName');
    
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(300);
    
    const responseBody = await response.text();
    expect(responseBody).toContain('<ListOfContinentsByNameResponse');
    expect(responseBody).toContain('<ListOfContinentsByNameResult');
  });

  test('should return error for invalid SOAP action', async ({ request }) => {
    const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <ListOfContinentsByName xmlns="http://www.oorsprong.org/websamples.countryinfo">
        </ListOfContinentsByName>
      </soap:Body>
    </soap:Envelope>`;
    
    const response = await soapRequest(request, 'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?op=ListOfContinentsByName', xmlBody, 'http://invalid.soap.action');
    
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(600);
    
    const responseBody = await response.text();
    expect(responseBody).toContain('<Fault');
  });
});