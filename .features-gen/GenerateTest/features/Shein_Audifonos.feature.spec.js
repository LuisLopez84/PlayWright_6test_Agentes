// Generated from: GenerateTest\features\Shein_Audifonos.feature
import { test } from "playwright-bdd";

test.describe('Shein_Audifonos', () => {

  test('Flujo Shein_Audifonos', async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "elemento"', null, { page }); 
    await And('hace clic en "Aceptar Todo"', null, { page }); 
    await And('hace clic en "Buscar: Musera"', null, { page }); 
    await And('hace clic en "Buscar: Vestidos De Baño"', null, { page }); 
    await And('completa "Buscar:" con "audifo"', null, { page }); 
    await And('completa "Buscar: audifo" con "audifonos"', null, { page }); 
    await And('hace clic en "Buscar"', null, { page }); 
    await And('hace clic en "STATUS:"', null, { page }); 
    await Then('la página está disponible sin errores', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\Shein_Audifonos.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"And hace clic en \"elemento\"","stepMatchArguments":[{"group":{"start":13,"value":"\"elemento\"","children":[{"start":14,"value":"elemento","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Aceptar Todo\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Aceptar Todo\"","children":[{"start":14,"value":"Aceptar Todo","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Buscar: Musera\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Buscar: Musera\"","children":[{"start":14,"value":"Buscar: Musera","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Buscar: Vestidos De Baño\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Buscar: Vestidos De Baño\"","children":[{"start":14,"value":"Buscar: Vestidos De Baño","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And completa \"Buscar:\" con \"audifo\"","stepMatchArguments":[{"group":{"start":9,"value":"\"Buscar:\"","children":[{"start":10,"value":"Buscar:","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":23,"value":"\"audifo\"","children":[{"start":24,"value":"audifo","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And completa \"Buscar: audifo\" con \"audifonos\"","stepMatchArguments":[{"group":{"start":9,"value":"\"Buscar: audifo\"","children":[{"start":10,"value":"Buscar: audifo","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":30,"value":"\"audifonos\"","children":[{"start":31,"value":"audifonos","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"And hace clic en \"Buscar\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Buscar\"","children":[{"start":14,"value":"Buscar","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":13,"keywordType":"Context","textWithKeyword":"And hace clic en \"STATUS:\"","stepMatchArguments":[{"group":{"start":13,"value":"\"STATUS:\"","children":[{"start":14,"value":"STATUS:","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"Then la página está disponible sin errores","stepMatchArguments":[]}]},
]; // bdd-data-end