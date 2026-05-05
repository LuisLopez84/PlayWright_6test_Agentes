// Generated from: GenerateTest\features\Homebanking_Transferencias_QA.feature
import { test } from "playwright-bdd";

test.describe('Homebanking_Transferencias_QA', () => {

  test('Flujo Homebanking_Transferencias_QA', async ({ Given, When, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "elemento"', null, { page }); 
    await And('hace clic en "Usuario"', null, { page }); 
    await When('el usuario ingresa "demo" en "Usuario"', null, { page }); 
    await And('hace clic en "Contraseña"', null, { page }); 
    await And('ingresa "demo123" en "Contraseña"', null, { page }); 
    await And('hace clic en "Ingresar"', null, { page }); 
    await And('page_load', null, { page }); 
    await And('hace clic en "Transferencias"', null, { page }); 
    await And('selecciona "ACC002" en "#source-account"', null, { page }); 
    await And('hace clic en "Monto"', null, { page }); 
    await And('completa "Monto" con "1250"', null, { page }); 
    await And('hace clic en "Descripción (opcional)"', null, { page }); 
    await And('completa "Descripción (opcional)" con "post refinamiento 001"', null, { page }); 
    await And('hace clic en "Transferir"', null, { page }); 
    await And('hace clic en "Confirmar"', null, { page }); 
    await And('verify', null, { page }); 
    await Then('la página está disponible sin errores', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks }) => $runScenarioHooks('before', {  }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\Homebanking_Transferencias_QA.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":3,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"And hace clic en \"elemento\"","stepMatchArguments":[{"group":{"start":13,"value":"\"elemento\"","children":[{"start":14,"value":"elemento","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"And hace clic en \"Usuario\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Usuario\"","children":[{"start":14,"value":"Usuario","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":7,"keywordType":"Action","textWithKeyword":"When el usuario ingresa \"demo\" en \"Usuario\"","stepMatchArguments":[{"group":{"start":19,"value":"\"demo\"","children":[{"start":20,"value":"demo","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":29,"value":"\"Usuario\"","children":[{"start":30,"value":"Usuario","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":8,"keywordType":"Action","textWithKeyword":"And hace clic en \"Contraseña\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Contraseña\"","children":[{"start":14,"value":"Contraseña","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":9,"keywordType":"Action","textWithKeyword":"And ingresa \"demo123\" en \"Contraseña\"","stepMatchArguments":[{"group":{"start":8,"value":"\"demo123\"","children":[{"start":9,"value":"demo123","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":21,"value":"\"Contraseña\"","children":[{"start":22,"value":"Contraseña","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"And hace clic en \"Ingresar\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Ingresar\"","children":[{"start":14,"value":"Ingresar","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"And page_load","stepMatchArguments":[]},{"pwStepLine":15,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"And hace clic en \"Transferencias\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Transferencias\"","children":[{"start":14,"value":"Transferencias","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":13,"keywordType":"Action","textWithKeyword":"And selecciona \"ACC002\" en \"#source-account\"","stepMatchArguments":[{"group":{"start":11,"value":"\"ACC002\"","children":[{"start":12,"value":"ACC002","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":23,"value":"\"#source-account\"","children":[{"start":24,"value":"#source-account","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":17,"gherkinStepLine":14,"keywordType":"Action","textWithKeyword":"And hace clic en \"Monto\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Monto\"","children":[{"start":14,"value":"Monto","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":18,"gherkinStepLine":15,"keywordType":"Action","textWithKeyword":"And completa \"Monto\" con \"1250\"","stepMatchArguments":[{"group":{"start":9,"value":"\"Monto\"","children":[{"start":10,"value":"Monto","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":21,"value":"\"1250\"","children":[{"start":22,"value":"1250","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":19,"gherkinStepLine":16,"keywordType":"Action","textWithKeyword":"And hace clic en \"Descripción (opcional)\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Descripción (opcional)\"","children":[{"start":14,"value":"Descripción (opcional)","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":20,"gherkinStepLine":17,"keywordType":"Action","textWithKeyword":"And completa \"Descripción (opcional)\" con \"post refinamiento 001\"","stepMatchArguments":[{"group":{"start":9,"value":"\"Descripción (opcional)\"","children":[{"start":10,"value":"Descripción (opcional)","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":38,"value":"\"post refinamiento 001\"","children":[{"start":39,"value":"post refinamiento 001","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":21,"gherkinStepLine":18,"keywordType":"Action","textWithKeyword":"And hace clic en \"Transferir\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Transferir\"","children":[{"start":14,"value":"Transferir","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":22,"gherkinStepLine":19,"keywordType":"Action","textWithKeyword":"And hace clic en \"Confirmar\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Confirmar\"","children":[{"start":14,"value":"Confirmar","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":23,"gherkinStepLine":20,"keywordType":"Action","textWithKeyword":"And verify","stepMatchArguments":[]},{"pwStepLine":24,"gherkinStepLine":21,"keywordType":"Outcome","textWithKeyword":"Then la página está disponible sin errores","stepMatchArguments":[]}]},
]; // bdd-data-end