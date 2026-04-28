// Generated from: GenerateTest\features\Homebanking_PlazosFijos.feature
import { test } from "playwright-bdd";

test.describe('Homebanking_PlazosFijos', () => {

  test('Flujo Homebanking_PlazosFijos', async ({ Given, When, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await When('el usuario ingresa "demo" en "Usuario"', null, { page }); 
    await And('ingresa "demo123" en "Contraseña"', null, { page }); 
    await And('hace clic en "Ingresar"', null, { page }); 
    await And('hace clic en "Plazos Fijos"', null, { page }); 
    await And('selecciona "ACC002" en "#deposit-source-account"', null, { page }); 
    await And('hace clic en "Monto a invertir"', null, { page }); 
    await And('completa "Monto a invertir" con "1001"', null, { page }); 
    await And('selecciona "360" en "Plazo"', null, { page }); 
    await And('hace clic en "Crear Plazo Fijo"', null, { page }); 
    await And('hace clic en "Confirmar"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\Homebanking_PlazosFijos.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Action","textWithKeyword":"When el usuario ingresa \"demo\" en \"Usuario\"","stepMatchArguments":[{"group":{"start":19,"value":"\"demo\"","children":[{"start":20,"value":"demo","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":29,"value":"\"Usuario\"","children":[{"start":30,"value":"Usuario","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":7,"keywordType":"Action","textWithKeyword":"And ingresa \"demo123\" en \"Contraseña\"","stepMatchArguments":[{"group":{"start":8,"value":"\"demo123\"","children":[{"start":9,"value":"demo123","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":21,"value":"\"Contraseña\"","children":[{"start":22,"value":"Contraseña","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":8,"keywordType":"Action","textWithKeyword":"And hace clic en \"Ingresar\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Ingresar\"","children":[{"start":14,"value":"Ingresar","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":9,"keywordType":"Action","textWithKeyword":"And hace clic en \"Plazos Fijos\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Plazos Fijos\"","children":[{"start":14,"value":"Plazos Fijos","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"And selecciona \"ACC002\" en \"#deposit-source-account\"","stepMatchArguments":[{"group":{"start":11,"value":"\"ACC002\"","children":[{"start":12,"value":"ACC002","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":23,"value":"\"#deposit-source-account\"","children":[{"start":24,"value":"#deposit-source-account","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"And hace clic en \"Monto a invertir\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Monto a invertir\"","children":[{"start":14,"value":"Monto a invertir","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"And completa \"Monto a invertir\" con \"1001\"","stepMatchArguments":[{"group":{"start":9,"value":"\"Monto a invertir\"","children":[{"start":10,"value":"Monto a invertir","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":32,"value":"\"1001\"","children":[{"start":33,"value":"1001","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":13,"keywordType":"Action","textWithKeyword":"And selecciona \"360\" en \"Plazo\"","stepMatchArguments":[{"group":{"start":11,"value":"\"360\"","children":[{"start":12,"value":"360","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":20,"value":"\"Plazo\"","children":[{"start":21,"value":"Plazo","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":14,"keywordType":"Action","textWithKeyword":"And hace clic en \"Crear Plazo Fijo\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Crear Plazo Fijo\"","children":[{"start":14,"value":"Crear Plazo Fijo","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":17,"gherkinStepLine":15,"keywordType":"Action","textWithKeyword":"And hace clic en \"Confirmar\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Confirmar\"","children":[{"start":14,"value":"Confirmar","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":18,"gherkinStepLine":16,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end