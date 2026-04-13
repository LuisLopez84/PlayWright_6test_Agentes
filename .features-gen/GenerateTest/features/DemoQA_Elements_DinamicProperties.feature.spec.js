// Generated from: GenerateTest\features\DemoQA_Elements_DinamicProperties.feature
import { test } from "playwright-bdd";

test.describe('DemoQA_Elements_DinamicProperties', () => {

  test('Flujo DemoQA_Elements_DinamicProperties', { tag: ['@UI'] }, async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "Book Store Application"', null, { page }); 
    await And('hace clic en "Dynamic Properties"', null, { page }); 
    await And('hace clic en "Color Change"', null, { page }); 
    await And('hace clic en "Will enable 5 seconds"', null, { page }); 
    await And('hace clic en "Visible After 5 Seconds"', null, { page }); 
    await And('hace clic en "Will enable 5 seconds"', null, { page }); 
    await And('hace clic en "Visible After 5 Seconds"', null, { page }); 
    await And('hace clic en "Color Change"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\DemoQA_Elements_DinamicProperties.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":5,"tags":["@UI"],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Book Store Application\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Book Store Application\"","children":[{"start":14,"value":"Book Store Application","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Dynamic Properties\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Dynamic Properties\"","children":[{"start":14,"value":"Dynamic Properties","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Color Change\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Color Change\"","children":[{"start":14,"value":"Color Change","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And hace clic en \"Will enable 5 seconds\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Will enable 5 seconds\"","children":[{"start":14,"value":"Will enable 5 seconds","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And hace clic en \"Visible After 5 Seconds\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Visible After 5 Seconds\"","children":[{"start":14,"value":"Visible After 5 Seconds","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"And hace clic en \"Will enable 5 seconds\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Will enable 5 seconds\"","children":[{"start":14,"value":"Will enable 5 seconds","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":13,"keywordType":"Context","textWithKeyword":"And hace clic en \"Visible After 5 Seconds\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Visible After 5 Seconds\"","children":[{"start":14,"value":"Visible After 5 Seconds","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":14,"keywordType":"Context","textWithKeyword":"And hace clic en \"Color Change\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Color Change\"","children":[{"start":14,"value":"Color Change","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end