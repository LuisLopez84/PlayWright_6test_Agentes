// Generated from: GenerateTest\features\Homebanking_Tarjeta_Virtual_POST_REST_api.feature
import { test } from "playwright-bdd";

test.describe('API REST POST - Homebanking Tarjeta Virtual POST REST', () => {

  test.beforeEach('Background', async ({ Given }, testInfo) => { if (testInfo.error) return;
    await Given('el servicio REST "POST" "https://homebanking-demo.onrender.com/pagos/servicios" está configurado para pruebas API'); 
  });
  
  test('Homebanking Tarjeta Virtual POST REST - Petición exitosa', async ({ When, Then, request }) => { 
    await When('ejecuto la petición API configurada', null, { request }); 
    await Then('la respuesta debe tener un estado de éxito 2xx'); 
  });

  test('Homebanking Tarjeta Virtual POST REST - Error técnico del servidor', async ({ When, Then, request }) => { 
    await When('ejecuto la petición API a un endpoint con error técnico', null, { request }); 
    await Then('la respuesta debe indicar un fallo técnico de red o 5xx'); 
  });

  test('Homebanking Tarjeta Virtual POST REST - Error por datos inválidos', async ({ When, Then, request }) => { 
    await When('ejecuto la petición API con datos inválidos', null, { request }); 
    await Then('la respuesta debe indicar error de validación de datos 4xx'); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks }) => $runScenarioHooks('before', {  }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\Homebanking_Tarjeta_Virtual_POST_REST_api.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":9,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given el servicio REST \"POST\" \"https://homebanking-demo.onrender.com/pagos/servicios\" está configurado para pruebas API","isBg":true,"stepMatchArguments":[{"group":{"start":17,"value":"\"POST\"","children":[{"start":18,"value":"POST","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":24,"value":"\"https://homebanking-demo.onrender.com/pagos/servicios\"","children":[{"start":25,"value":"https://homebanking-demo.onrender.com/pagos/servicios","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"When ejecuto la petición API configurada","stepMatchArguments":[]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Then la respuesta debe tener un estado de éxito 2xx","stepMatchArguments":[]}]},
  {"pwTestLine":15,"pickleLine":13,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given el servicio REST \"POST\" \"https://homebanking-demo.onrender.com/pagos/servicios\" está configurado para pruebas API","isBg":true,"stepMatchArguments":[{"group":{"start":17,"value":"\"POST\"","children":[{"start":18,"value":"POST","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":24,"value":"\"https://homebanking-demo.onrender.com/pagos/servicios\"","children":[{"start":25,"value":"https://homebanking-demo.onrender.com/pagos/servicios","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":14,"keywordType":"Action","textWithKeyword":"When ejecuto la petición API a un endpoint con error técnico","stepMatchArguments":[]},{"pwStepLine":17,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"Then la respuesta debe indicar un fallo técnico de red o 5xx","stepMatchArguments":[]}]},
  {"pwTestLine":20,"pickleLine":17,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given el servicio REST \"POST\" \"https://homebanking-demo.onrender.com/pagos/servicios\" está configurado para pruebas API","isBg":true,"stepMatchArguments":[{"group":{"start":17,"value":"\"POST\"","children":[{"start":18,"value":"POST","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":24,"value":"\"https://homebanking-demo.onrender.com/pagos/servicios\"","children":[{"start":25,"value":"https://homebanking-demo.onrender.com/pagos/servicios","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":21,"gherkinStepLine":18,"keywordType":"Action","textWithKeyword":"When ejecuto la petición API con datos inválidos","stepMatchArguments":[]},{"pwStepLine":22,"gherkinStepLine":19,"keywordType":"Outcome","textWithKeyword":"Then la respuesta debe indicar error de validación de datos 4xx","stepMatchArguments":[]}]},
]; // bdd-data-end