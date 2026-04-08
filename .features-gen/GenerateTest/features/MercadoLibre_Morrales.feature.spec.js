// Generated from: GenerateTest\features\MercadoLibre_Morrales.feature
import { test } from "playwright-bdd";

test.describe('MercadoLibre_Morrales', () => {

  test('Flujo MercadoLibre_Morrales', async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "Ingresa lo que quieras"', null, { page }); 
    await And('completa "Ingresa lo que quieras" con "M"', null, { page }); 
    await And('completa "Ingresa lo que quieras" con "Morrales"', null, { page }); 
    await And('hace clic en "Continuar"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\MercadoLibre_Morrales.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"And hace clic en \"Ingresa lo que quieras\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Ingresa lo que quieras\"","children":[{"start":14,"value":"Ingresa lo que quieras","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And completa \"Ingresa lo que quieras\" con \"M\"","stepMatchArguments":[{"group":{"start":9,"value":"\"Ingresa lo que quieras\"","children":[{"start":10,"value":"Ingresa lo que quieras","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":38,"value":"\"M\"","children":[{"start":39,"value":"M","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And completa \"Ingresa lo que quieras\" con \"Morrales\"","stepMatchArguments":[{"group":{"start":9,"value":"\"Ingresa lo que quieras\"","children":[{"start":10,"value":"Ingresa lo que quieras","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":38,"value":"\"Morrales\"","children":[{"start":39,"value":"Morrales","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Continuar\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Continuar\"","children":[{"start":14,"value":"Continuar","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":10,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end