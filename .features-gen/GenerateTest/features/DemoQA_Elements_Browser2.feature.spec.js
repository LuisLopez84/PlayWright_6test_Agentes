// Generated from: GenerateTest\features\DemoQA_Elements_Browser2.feature
import { test } from "playwright-bdd";

test.describe('DemoQA_Elements_Browser2', () => {

  test('Flujo DemoQA_Elements_Browser2', { tag: ['@UI'] }, async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "Book Store Application"', null, { page }); 
    await And('hace clic en "Alerts, Frame & Windows"', null, { page }); 
    await And('hace clic en "Browser Windows"', null, { page }); 
    await And('hace clic en "New Window"', null, { page }); 
    await And('hace clic en "This is a sample page"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\DemoQA_Elements_Browser2.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":5,"tags":["@UI"],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Book Store Application\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Book Store Application\"","children":[{"start":14,"value":"Book Store Application","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Alerts, Frame & Windows\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Alerts, Frame & Windows\"","children":[{"start":14,"value":"Alerts, Frame & Windows","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Browser Windows\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Browser Windows\"","children":[{"start":14,"value":"Browser Windows","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And hace clic en \"New Window\"","stepMatchArguments":[{"group":{"start":13,"value":"\"New Window\"","children":[{"start":14,"value":"New Window","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And hace clic en \"This is a sample page\"","stepMatchArguments":[{"group":{"start":13,"value":"\"This is a sample page\"","children":[{"start":14,"value":"This is a sample page","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end