// Generated from: GenerateTest\features\DemoQA_Elements_Alerts.feature
import { test } from "playwright-bdd";

test.describe('DemoQA_Elements_Alerts', () => {

  test('Flujo DemoQA_Elements_Alerts', { tag: ['@UI'] }, async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "Book Store Application"', null, { page }); 
    await And('hace clic en "Alerts, Frame & Windows"', null, { page }); 
    await And('hace clic en "Alerts"', null, { page }); 
    await And('hace clic en "#alertButton"', null, { page }); 
    await And('hace clic en "#timerAlertButton"', null, { page }); 
    await And('hace clic en "#confirmButton"', null, { page }); 
    await And('hace clic en "#promtButton"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\DemoQA_Elements_Alerts.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":5,"tags":["@UI"],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Book Store Application\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Book Store Application\"","children":[{"start":14,"value":"Book Store Application","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Alerts, Frame & Windows\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Alerts, Frame & Windows\"","children":[{"start":14,"value":"Alerts, Frame & Windows","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Alerts\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Alerts\"","children":[{"start":14,"value":"Alerts","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And hace clic en \"#alertButton\"","stepMatchArguments":[{"group":{"start":13,"value":"\"#alertButton\"","children":[{"start":14,"value":"#alertButton","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And hace clic en \"#timerAlertButton\"","stepMatchArguments":[{"group":{"start":13,"value":"\"#timerAlertButton\"","children":[{"start":14,"value":"#timerAlertButton","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"And hace clic en \"#confirmButton\"","stepMatchArguments":[{"group":{"start":13,"value":"\"#confirmButton\"","children":[{"start":14,"value":"#confirmButton","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":13,"keywordType":"Context","textWithKeyword":"And hace clic en \"#promtButton\"","stepMatchArguments":[{"group":{"start":13,"value":"\"#promtButton\"","children":[{"start":14,"value":"#promtButton","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end