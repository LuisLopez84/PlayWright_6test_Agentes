// Generated from: GenerateTest\features\DemoQA_Elements_Widges3.feature
import { test } from "playwright-bdd";

test.describe('DemoQA_Elements_Widges3', () => {

  test('Flujo DemoQA_Elements_Widges3', { tag: ['@UI'] }, async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "Book Store Application"', null, { page }); 
    await And('hace clic en "Widgets"', null, { page }); 
    await And('hace clic en "Date Picker"', null, { page }); 
    await And('hace clic en "#datePickerMonthYearInput"', null, { page }); 
    await And('selecciona "1950" en "Choose Saturday, April 11th,"', null, { page }); 
    await And('selecciona "0" en "elemento"', null, { page }); 
    await And('hace clic en "Choose Tuesday, January 31st,"', null, { page }); 
    await And('hace clic en "#dateAndTimePickerInput"', null, { page }); 
    await And('hace clic en "Next Month"', null, { page }); 
    await And('hace clic en "17:45"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\DemoQA_Elements_Widges3.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":5,"tags":["@UI"],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Book Store Application\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Book Store Application\"","children":[{"start":14,"value":"Book Store Application","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Widgets\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Widgets\"","children":[{"start":14,"value":"Widgets","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Date Picker\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Date Picker\"","children":[{"start":14,"value":"Date Picker","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And hace clic en \"#datePickerMonthYearInput\"","stepMatchArguments":[{"group":{"start":13,"value":"\"#datePickerMonthYearInput\"","children":[{"start":14,"value":"#datePickerMonthYearInput","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And selecciona \"1950\" en \"Choose Saturday, April 11th,\"","stepMatchArguments":[{"group":{"start":11,"value":"\"1950\"","children":[{"start":12,"value":"1950","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":21,"value":"\"Choose Saturday, April 11th,\"","children":[{"start":22,"value":"Choose Saturday, April 11th,","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"And selecciona \"0\" en \"elemento\"","stepMatchArguments":[{"group":{"start":11,"value":"\"0\"","children":[{"start":12,"value":"0","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":18,"value":"\"elemento\"","children":[{"start":19,"value":"elemento","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":13,"keywordType":"Context","textWithKeyword":"And hace clic en \"Choose Tuesday, January 31st,\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Choose Tuesday, January 31st,\"","children":[{"start":14,"value":"Choose Tuesday, January 31st,","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":14,"keywordType":"Context","textWithKeyword":"And hace clic en \"#dateAndTimePickerInput\"","stepMatchArguments":[{"group":{"start":13,"value":"\"#dateAndTimePickerInput\"","children":[{"start":14,"value":"#dateAndTimePickerInput","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":15,"keywordType":"Context","textWithKeyword":"And hace clic en \"Next Month\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Next Month\"","children":[{"start":14,"value":"Next Month","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":17,"gherkinStepLine":16,"keywordType":"Context","textWithKeyword":"And hace clic en \"17:45\"","stepMatchArguments":[{"group":{"start":13,"value":"\"17:45\"","children":[{"start":14,"value":"17:45","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":18,"gherkinStepLine":17,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end