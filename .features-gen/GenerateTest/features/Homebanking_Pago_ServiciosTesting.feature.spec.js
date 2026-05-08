// Generated from: GenerateTest\features\Homebanking_Pago_ServiciosTesting.feature
import { test } from "playwright-bdd";

test.describe('Homebanking_Pago_ServiciosTesting', () => {

  test('Flujo Homebanking_Pago_ServiciosTesting', async ({ Given, When, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "elemento"', null, { page }); 
    await And('hace clic en "Usuario"', null, { page }); 
    await When('el usuario ingresa "demo" en "Usuario"', null, { page }); 
    await And('hace clic en "Contraseña"', null, { page }); 
    await And('ingresa "demo123" en "Contraseña"', null, { page }); 
    await And('hace clic en "Ingresar"', null, { page }); 
    await And('hace clic en "Pago de Servicios"', null, { page }); 
    await And('selecciona "SRV004" en "Selecciona el Servicio"', null, { page }); 
    await And('hace clic en "Monto a Pagar"', null, { page }); 
    await And('completa "Monto a Pagar" con "2500"', null, { page }); 
    await And('selecciona "ACC003" en "Cuenta a Debitar"', null, { page }); 
    await And('hace clic en "Pagar Servicio"', null, { page }); 
    await Then('la página está disponible sin errores', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks }) => $runScenarioHooks('before', {  }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\Homebanking_Pago_ServiciosTesting.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"And hace clic en \"elemento\"","stepMatchArguments":[{"group":{"start":13,"value":"\"elemento\"","children":[{"start":14,"value":"elemento","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Usuario\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Usuario\"","children":[{"start":14,"value":"Usuario","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":8,"keywordType":"Action","textWithKeyword":"When el usuario ingresa \"demo\" en \"Usuario\"","stepMatchArguments":[{"group":{"start":19,"value":"\"demo\"","children":[{"start":20,"value":"demo","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":29,"value":"\"Usuario\"","children":[{"start":30,"value":"Usuario","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":9,"keywordType":"Action","textWithKeyword":"And hace clic en \"Contraseña\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Contraseña\"","children":[{"start":14,"value":"Contraseña","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"And ingresa \"demo123\" en \"Contraseña\"","stepMatchArguments":[{"group":{"start":8,"value":"\"demo123\"","children":[{"start":9,"value":"demo123","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":21,"value":"\"Contraseña\"","children":[{"start":22,"value":"Contraseña","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"And hace clic en \"Ingresar\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Ingresar\"","children":[{"start":14,"value":"Ingresar","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"And hace clic en \"Pago de Servicios\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Pago de Servicios\"","children":[{"start":14,"value":"Pago de Servicios","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":13,"keywordType":"Action","textWithKeyword":"And selecciona \"SRV004\" en \"Selecciona el Servicio\"","stepMatchArguments":[{"group":{"start":11,"value":"\"SRV004\"","children":[{"start":12,"value":"SRV004","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":23,"value":"\"Selecciona el Servicio\"","children":[{"start":24,"value":"Selecciona el Servicio","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":14,"keywordType":"Action","textWithKeyword":"And hace clic en \"Monto a Pagar\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Monto a Pagar\"","children":[{"start":14,"value":"Monto a Pagar","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":17,"gherkinStepLine":15,"keywordType":"Action","textWithKeyword":"And completa \"Monto a Pagar\" con \"2500\"","stepMatchArguments":[{"group":{"start":9,"value":"\"Monto a Pagar\"","children":[{"start":10,"value":"Monto a Pagar","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":29,"value":"\"2500\"","children":[{"start":30,"value":"2500","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":18,"gherkinStepLine":16,"keywordType":"Action","textWithKeyword":"And selecciona \"ACC003\" en \"Cuenta a Debitar\"","stepMatchArguments":[{"group":{"start":11,"value":"\"ACC003\"","children":[{"start":12,"value":"ACC003","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":23,"value":"\"Cuenta a Debitar\"","children":[{"start":24,"value":"Cuenta a Debitar","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":19,"gherkinStepLine":17,"keywordType":"Action","textWithKeyword":"And hace clic en \"Pagar Servicio\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Pagar Servicio\"","children":[{"start":14,"value":"Pagar Servicio","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":20,"gherkinStepLine":18,"keywordType":"Outcome","textWithKeyword":"Then la página está disponible sin errores","stepMatchArguments":[]}]},
]; // bdd-data-end