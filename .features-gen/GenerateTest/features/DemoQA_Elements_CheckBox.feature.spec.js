// Generated from: GenerateTest\features\DemoQA_Elements_CheckBox.feature
import { test } from "playwright-bdd";

test.describe('DemoQA_Elements_CheckBox', () => {

  test('Flujo DemoQA_Elements_CheckBox', { tag: ['@UI'] }, async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "Book Store Application"', null, { page }); 
    await And('hace clic en "Elements"', null, { page }); 
    await And('hace clic en "Check Box"', null, { page }); 
    await And('hace clic en ".rc-tree-switcher"', null, { page }); 
    await And('hace clic en ".rc-tree-switcher.rc-tree-switcher_close"', null, { page }); 
    await And('hace clic en "Select Excel File.doc Excel"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\DemoQA_Elements_CheckBox.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":5,"tags":["@UI"],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Book Store Application\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Book Store Application\"","children":[{"start":14,"value":"Book Store Application","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Elements\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Elements\"","children":[{"start":14,"value":"Elements","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Check Box\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Check Box\"","children":[{"start":14,"value":"Check Box","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And hace clic en \".rc-tree-switcher\"","stepMatchArguments":[{"group":{"start":13,"value":"\".rc-tree-switcher\"","children":[{"start":14,"value":".rc-tree-switcher","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And hace clic en \".rc-tree-switcher.rc-tree-switcher_close\"","stepMatchArguments":[{"group":{"start":13,"value":"\".rc-tree-switcher.rc-tree-switcher_close\"","children":[{"start":14,"value":".rc-tree-switcher.rc-tree-switcher_close","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"And hace clic en \"Select Excel File.doc Excel\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Select Excel File.doc Excel\"","children":[{"start":14,"value":"Select Excel File.doc Excel","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end