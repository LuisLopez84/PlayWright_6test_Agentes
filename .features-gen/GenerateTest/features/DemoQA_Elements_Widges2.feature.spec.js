// Generated from: GenerateTest\features\DemoQA_Elements_Widges2.feature
import { test } from "playwright-bdd";

test.describe('DemoQA_Elements_Widges2', () => {

  test('Flujo DemoQA_Elements_Widges2', { tag: ['@UI'] }, async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "Book Store Application"', null, { page }); 
    await And('hace clic en "Widgets"', null, { page }); 
    await And('hace clic en "Auto Complete"', null, { page }); 
    await And('hace clic en ".auto-complete__input-container"', null, { page }); 
    await And('completa "#autoCompleteMultipleInput" con "diez"', null, { page }); 
    await And('hace clic en ".auto-complete__input-container.css-19bb58m"', null, { page }); 
    await And('completa "#autoCompleteSingleInput" con "azul"', null, { page }); 
    await And('hace clic en ".col-12.mt-4.col-md-6 > div:nth-child(2)"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\DemoQA_Elements_Widges2.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":5,"tags":["@UI"],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Book Store Application\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Book Store Application\"","children":[{"start":14,"value":"Book Store Application","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Widgets\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Widgets\"","children":[{"start":14,"value":"Widgets","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Auto Complete\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Auto Complete\"","children":[{"start":14,"value":"Auto Complete","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And hace clic en \".auto-complete__input-container\"","stepMatchArguments":[{"group":{"start":13,"value":"\".auto-complete__input-container\"","children":[{"start":14,"value":".auto-complete__input-container","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And completa \"#autoCompleteMultipleInput\" con \"diez\"","stepMatchArguments":[{"group":{"start":9,"value":"\"#autoCompleteMultipleInput\"","children":[{"start":10,"value":"#autoCompleteMultipleInput","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":42,"value":"\"diez\"","children":[{"start":43,"value":"diez","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"And hace clic en \".auto-complete__input-container.css-19bb58m\"","stepMatchArguments":[{"group":{"start":13,"value":"\".auto-complete__input-container.css-19bb58m\"","children":[{"start":14,"value":".auto-complete__input-container.css-19bb58m","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":13,"keywordType":"Context","textWithKeyword":"And completa \"#autoCompleteSingleInput\" con \"azul\"","stepMatchArguments":[{"group":{"start":9,"value":"\"#autoCompleteSingleInput\"","children":[{"start":10,"value":"#autoCompleteSingleInput","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":40,"value":"\"azul\"","children":[{"start":41,"value":"azul","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":14,"keywordType":"Context","textWithKeyword":"And hace clic en \".col-12.mt-4.col-md-6 > div:nth-child(2)\"","stepMatchArguments":[{"group":{"start":13,"value":"\".col-12.mt-4.col-md-6 > div:nth-child(2)\"","children":[{"start":14,"value":".col-12.mt-4.col-md-6 > div:nth-child(2)","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end