// Generated from: GenerateTest\features\DemoQA_Elements_Widges7.feature
import { test } from "playwright-bdd";

test.describe('DemoQA_Elements_Widges7', () => {

  test('Flujo DemoQA_Elements_Widges7', { tag: ['@UI'] }, async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "Book Store Application"', null, { page }); 
    await And('hace clic en "Widgets"', null, { page }); 
    await And('hace clic en "Tool Tips"', null, { page }); 
    await And('hace clic en "Hover me to see"', null, { page }); 
    await And('completa "Hover me to see" con "tool"', null, { page }); 
    await And('hace clic en "Hover me to see"', null, { page }); 
    await And('hace clic en "Contrary to popular belief,"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\DemoQA_Elements_Widges7.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":5,"tags":["@UI"],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Book Store Application\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Book Store Application\"","children":[{"start":14,"value":"Book Store Application","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Widgets\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Widgets\"","children":[{"start":14,"value":"Widgets","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Tool Tips\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Tool Tips\"","children":[{"start":14,"value":"Tool Tips","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And hace clic en \"Hover me to see\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Hover me to see\"","children":[{"start":14,"value":"Hover me to see","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And completa \"Hover me to see\" con \"tool\"","stepMatchArguments":[{"group":{"start":9,"value":"\"Hover me to see\"","children":[{"start":10,"value":"Hover me to see","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":31,"value":"\"tool\"","children":[{"start":32,"value":"tool","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"And hace clic en \"Hover me to see\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Hover me to see\"","children":[{"start":14,"value":"Hover me to see","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":13,"keywordType":"Context","textWithKeyword":"And hace clic en \"Contrary to popular belief,\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Contrary to popular belief,\"","children":[{"start":14,"value":"Contrary to popular belief,","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end