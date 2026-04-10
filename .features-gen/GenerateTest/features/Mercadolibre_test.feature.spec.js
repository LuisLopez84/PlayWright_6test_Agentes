// Generated from: GenerateTest\features\Mercadolibre_test.feature
import { test } from "playwright-bdd";

test.describe('Mercadolibre_test', () => {

  test('Flujo Mercadolibre_test', async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "Electrónica, Audio y Video"', null, { page }); 
    await And('hace clic en "Cables de Audio y Video"', null, { page }); 
    await And('hace clic en "Más tarde"', null, { page }); 
    await And('hace clic en "Adaptador Conversor"', null, { page }); 
    await And('hace clic en "Agregar al carrito"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\Mercadolibre_test.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"And hace clic en \"Electrónica, Audio y Video\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Electrónica, Audio y Video\"","children":[{"start":14,"value":"Electrónica, Audio y Video","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Cables de Audio y Video\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Cables de Audio y Video\"","children":[{"start":14,"value":"Cables de Audio y Video","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Más tarde\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Más tarde\"","children":[{"start":14,"value":"Más tarde","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Adaptador Conversor\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Adaptador Conversor\"","children":[{"start":14,"value":"Adaptador Conversor","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And hace clic en \"Agregar al carrito\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Agregar al carrito\"","children":[{"start":14,"value":"Agregar al carrito","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end