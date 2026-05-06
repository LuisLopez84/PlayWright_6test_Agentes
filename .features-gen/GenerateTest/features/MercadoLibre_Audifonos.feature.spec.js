// Generated from: GenerateTest\features\MercadoLibre_Audifonos.feature
import { test } from "playwright-bdd";

test.describe('MercadoLibre_Audifonos', () => {

  test('Flujo MercadoLibre_Audifonos', async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('page_load'); 
    await And('hace clic en "elemento"', null, { page }); 
    await And('hace clic en "Ingresa lo que quieras"', null, { page }); 
    await And('completa "Ingresa lo que quieras" con "audifonos"', null, { page }); 
    await And('hace clic en "Buscar"', null, { page }); 
    await And('hace clic en "elemento"', null, { page }); 
    await And('hace clic en "Smartwatches y Accesorios"', null, { page }); 
    await And('hace clic en "Soy nuevo"', null, { page }); 
    await Then('la página está disponible sin errores', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\MercadoLibre_Audifonos.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"And page_load","stepMatchArguments":[]},{"pwStepLine":9,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"elemento\"","stepMatchArguments":[{"group":{"start":13,"value":"\"elemento\"","children":[{"start":14,"value":"elemento","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Ingresa lo que quieras\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Ingresa lo que quieras\"","children":[{"start":14,"value":"Ingresa lo que quieras","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And completa \"Ingresa lo que quieras\" con \"audifonos\"","stepMatchArguments":[{"group":{"start":9,"value":"\"Ingresa lo que quieras\"","children":[{"start":10,"value":"Ingresa lo que quieras","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":38,"value":"\"audifonos\"","children":[{"start":39,"value":"audifonos","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And hace clic en \"Buscar\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Buscar\"","children":[{"start":14,"value":"Buscar","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And hace clic en \"elemento\"","stepMatchArguments":[{"group":{"start":13,"value":"\"elemento\"","children":[{"start":14,"value":"elemento","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"And hace clic en \"Smartwatches y Accesorios\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Smartwatches y Accesorios\"","children":[{"start":14,"value":"Smartwatches y Accesorios","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":13,"keywordType":"Context","textWithKeyword":"And hace clic en \"Soy nuevo\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Soy nuevo\"","children":[{"start":14,"value":"Soy nuevo","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"Then la página está disponible sin errores","stepMatchArguments":[]}]},
]; // bdd-data-end