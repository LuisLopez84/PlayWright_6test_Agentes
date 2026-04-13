// Generated from: GenerateTest\features\DemoQA_Elements_Widges8.feature
import { test } from "playwright-bdd";

test.describe('DemoQA_Elements_Widges8', () => {

  test('Flujo DemoQA_Elements_Widges8', { tag: ['@UI'] }, async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "Book Store Application"', null, { page }); 
    await And('hace clic en "Widgets"', null, { page }); 
    await And('hace clic en "Menu"', null, { page }); 
    await And('hace clic en "Main Item 1"', null, { page }); 
    await And('hace clic en "Main Item 2"', null, { page }); 
    await And('hace clic en "Main Item 3"', null, { page }); 
    await And('hace clic en "Main Item 2"', null, { page }); 
    await And('hace clic en "SUB SUB LIST »"', null, { page }); 
    await And('hace clic en "Sub Sub Item 1"', null, { page }); 
    await And('hace clic en "Sub Sub Item 2"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\DemoQA_Elements_Widges8.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":5,"tags":["@UI"],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Book Store Application\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Book Store Application\"","children":[{"start":14,"value":"Book Store Application","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Widgets\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Widgets\"","children":[{"start":14,"value":"Widgets","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Menu\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Menu\"","children":[{"start":14,"value":"Menu","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And hace clic en \"Main Item 1\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Main Item 1\"","children":[{"start":14,"value":"Main Item 1","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And hace clic en \"Main Item 2\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Main Item 2\"","children":[{"start":14,"value":"Main Item 2","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"And hace clic en \"Main Item 3\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Main Item 3\"","children":[{"start":14,"value":"Main Item 3","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":13,"keywordType":"Context","textWithKeyword":"And hace clic en \"Main Item 2\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Main Item 2\"","children":[{"start":14,"value":"Main Item 2","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":14,"keywordType":"Context","textWithKeyword":"And hace clic en \"SUB SUB LIST »\"","stepMatchArguments":[{"group":{"start":13,"value":"\"SUB SUB LIST »\"","children":[{"start":14,"value":"SUB SUB LIST »","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":15,"keywordType":"Context","textWithKeyword":"And hace clic en \"Sub Sub Item 1\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Sub Sub Item 1\"","children":[{"start":14,"value":"Sub Sub Item 1","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":17,"gherkinStepLine":16,"keywordType":"Context","textWithKeyword":"And hace clic en \"Sub Sub Item 2\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Sub Sub Item 2\"","children":[{"start":14,"value":"Sub Sub Item 2","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":18,"gherkinStepLine":17,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end