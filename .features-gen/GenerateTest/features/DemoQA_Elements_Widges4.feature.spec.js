// Generated from: GenerateTest\features\DemoQA_Elements_Widges4.feature
import { test } from "playwright-bdd";

test.describe('DemoQA_Elements_Widges4', () => {

  test('Flujo DemoQA_Elements_Widges4', { tag: ['@UI'] }, async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "Book Store Application"', null, { page }); 
    await And('hace clic en "Widgets"', null, { page }); 
    await And('hace clic en "Slider"', null, { page }); 
    await And('completa "#slider" con "80"', null, { page }); 
    await And('hace clic en "#sliderValue"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\DemoQA_Elements_Widges4.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":5,"tags":["@UI"],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Book Store Application\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Book Store Application\"","children":[{"start":14,"value":"Book Store Application","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Widgets\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Widgets\"","children":[{"start":14,"value":"Widgets","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Slider\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Slider\"","children":[{"start":14,"value":"Slider","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And completa \"#slider\" con \"80\"","stepMatchArguments":[{"group":{"start":9,"value":"\"#slider\"","children":[{"start":10,"value":"#slider","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":23,"value":"\"80\"","children":[{"start":24,"value":"80","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And hace clic en \"#sliderValue\"","stepMatchArguments":[{"group":{"start":13,"value":"\"#sliderValue\"","children":[{"start":14,"value":"#sliderValue","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end