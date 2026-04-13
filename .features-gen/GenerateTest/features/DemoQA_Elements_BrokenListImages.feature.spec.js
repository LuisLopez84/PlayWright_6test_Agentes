// Generated from: GenerateTest\features\DemoQA_Elements_BrokenListImages.feature
import { test } from "playwright-bdd";

test.describe('DemoQA_Elements_BrokenListImages', () => {

  test('Flujo DemoQA_Elements_BrokenListImages', { tag: ['@UI'] }, async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "Book Store Application"', null, { page }); 
    await And('hace clic en "Elements"', null, { page }); 
    await And('hace clic en "Broken Links - Images"', null, { page }); 
    await And('hace clic en "Click Here for Valid Link"', null, { page }); 
    await And('hace clic en "Book Store Application"', null, { page }); 
    await And('hace clic en "Elements"', null, { page }); 
    await And('hace clic en "Broken Links - Images"', null, { page }); 
    await And('hace clic en "Click Here for Broken Link"', null, { page }); 
    await And('hace clic en "This page returned a 500"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\DemoQA_Elements_BrokenListImages.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":5,"tags":["@UI"],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Book Store Application\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Book Store Application\"","children":[{"start":14,"value":"Book Store Application","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Elements\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Elements\"","children":[{"start":14,"value":"Elements","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Broken Links - Images\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Broken Links - Images\"","children":[{"start":14,"value":"Broken Links - Images","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And hace clic en \"Click Here for Valid Link\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Click Here for Valid Link\"","children":[{"start":14,"value":"Click Here for Valid Link","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And hace clic en \"Book Store Application\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Book Store Application\"","children":[{"start":14,"value":"Book Store Application","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"And hace clic en \"Elements\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Elements\"","children":[{"start":14,"value":"Elements","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":13,"keywordType":"Context","textWithKeyword":"And hace clic en \"Broken Links - Images\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Broken Links - Images\"","children":[{"start":14,"value":"Broken Links - Images","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":14,"keywordType":"Context","textWithKeyword":"And hace clic en \"Click Here for Broken Link\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Click Here for Broken Link\"","children":[{"start":14,"value":"Click Here for Broken Link","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":15,"keywordType":"Context","textWithKeyword":"And hace clic en \"This page returned a 500\"","stepMatchArguments":[{"group":{"start":13,"value":"\"This page returned a 500\"","children":[{"start":14,"value":"This page returned a 500","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":17,"gherkinStepLine":16,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end