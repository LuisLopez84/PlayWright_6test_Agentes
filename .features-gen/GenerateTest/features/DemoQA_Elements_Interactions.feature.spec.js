// Generated from: GenerateTest\features\DemoQA_Elements_Interactions.feature
import { test } from "playwright-bdd";

test.describe('DemoQA_Elements_Interactions', () => {

  test('Flujo DemoQA_Elements_Interactions', { tag: ['@UI'] }, async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "Book Store Application"', null, { page }); 
    await And('hace clic en "Interactions"', null, { page }); 
    await And('hace clic en "Sortable"', null, { page }); 
    await And('hace clic en "List\').getByText(\'One"', null, { page }); 
    await And('hace clic en "List\').getByText(\'Two"', null, { page }); 
    await And('hace clic en "Grid"', null, { page }); 
    await And('hace clic en "Grid\').getByText(\'Five"', null, { page }); 
    await And('hace clic en "Grid\').getByText(\'Three"', null, { page }); 
    await And('hace clic en "Grid\').getByText(\'One"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\DemoQA_Elements_Interactions.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":5,"tags":["@UI"],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Book Store Application\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Book Store Application\"","children":[{"start":14,"value":"Book Store Application","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Interactions\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Interactions\"","children":[{"start":14,"value":"Interactions","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Sortable\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Sortable\"","children":[{"start":14,"value":"Sortable","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And hace clic en \"List').getByText('One\"","stepMatchArguments":[{"group":{"start":13,"value":"\"List').getByText('One\"","children":[{"start":14,"value":"List').getByText('One","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And hace clic en \"List').getByText('Two\"","stepMatchArguments":[{"group":{"start":13,"value":"\"List').getByText('Two\"","children":[{"start":14,"value":"List').getByText('Two","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"And hace clic en \"Grid\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Grid\"","children":[{"start":14,"value":"Grid","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":13,"keywordType":"Context","textWithKeyword":"And hace clic en \"Grid').getByText('Five\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Grid').getByText('Five\"","children":[{"start":14,"value":"Grid').getByText('Five","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":14,"keywordType":"Context","textWithKeyword":"And hace clic en \"Grid').getByText('Three\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Grid').getByText('Three\"","children":[{"start":14,"value":"Grid').getByText('Three","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":15,"keywordType":"Context","textWithKeyword":"And hace clic en \"Grid').getByText('One\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Grid').getByText('One\"","children":[{"start":14,"value":"Grid').getByText('One","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":17,"gherkinStepLine":16,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end