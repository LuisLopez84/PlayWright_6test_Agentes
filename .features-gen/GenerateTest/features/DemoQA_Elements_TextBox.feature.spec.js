// Generated from: GenerateTest\features\DemoQA_Elements_TextBox.feature
import { test } from "playwright-bdd";

test.describe('DemoQA_Elements_TextBox', () => {

  test('Flujo DemoQA_Elements_TextBox', { tag: ['@UI'] }, async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "Book Store Application"', null, { page }); 
    await And('hace clic en "Elements"', null, { page }); 
    await And('hace clic en "Text Box"', null, { page }); 
    await And('hace clic en "Full Name"', null, { page }); 
    await And('completa "Full Name" con "Luis QA"', null, { page }); 
    await And('hace clic en "name@example.com"', null, { page }); 
    await And('completa "name@example.com" con "luis@luie.com.co"', null, { page }); 
    await And('hace clic en "Current Address"', null, { page }); 
    await And('completa "Current Address" con "prueba text box"', null, { page }); 
    await And('hace clic en "#permanentAddress"', null, { page }); 
    await And('completa "#permanentAddress" con "test"', null, { page }); 
    await And('hace clic en "Submit"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\DemoQA_Elements_TextBox.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":5,"tags":["@UI"],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Book Store Application\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Book Store Application\"","children":[{"start":14,"value":"Book Store Application","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Elements\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Elements\"","children":[{"start":14,"value":"Elements","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Text Box\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Text Box\"","children":[{"start":14,"value":"Text Box","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And hace clic en \"Full Name\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Full Name\"","children":[{"start":14,"value":"Full Name","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And completa \"Full Name\" con \"Luis QA\"","stepMatchArguments":[{"group":{"start":9,"value":"\"Full Name\"","children":[{"start":10,"value":"Full Name","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":25,"value":"\"Luis QA\"","children":[{"start":26,"value":"Luis QA","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"And hace clic en \"name@example.com\"","stepMatchArguments":[{"group":{"start":13,"value":"\"name@example.com\"","children":[{"start":14,"value":"name@example.com","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":13,"keywordType":"Context","textWithKeyword":"And completa \"name@example.com\" con \"luis@luie.com.co\"","stepMatchArguments":[{"group":{"start":9,"value":"\"name@example.com\"","children":[{"start":10,"value":"name@example.com","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":32,"value":"\"luis@luie.com.co\"","children":[{"start":33,"value":"luis@luie.com.co","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":14,"keywordType":"Context","textWithKeyword":"And hace clic en \"Current Address\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Current Address\"","children":[{"start":14,"value":"Current Address","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":15,"keywordType":"Context","textWithKeyword":"And completa \"Current Address\" con \"prueba text box\"","stepMatchArguments":[{"group":{"start":9,"value":"\"Current Address\"","children":[{"start":10,"value":"Current Address","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":31,"value":"\"prueba text box\"","children":[{"start":32,"value":"prueba text box","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":17,"gherkinStepLine":16,"keywordType":"Context","textWithKeyword":"And hace clic en \"#permanentAddress\"","stepMatchArguments":[{"group":{"start":13,"value":"\"#permanentAddress\"","children":[{"start":14,"value":"#permanentAddress","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":18,"gherkinStepLine":17,"keywordType":"Context","textWithKeyword":"And completa \"#permanentAddress\" con \"test\"","stepMatchArguments":[{"group":{"start":9,"value":"\"#permanentAddress\"","children":[{"start":10,"value":"#permanentAddress","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":33,"value":"\"test\"","children":[{"start":34,"value":"test","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":19,"gherkinStepLine":18,"keywordType":"Context","textWithKeyword":"And hace clic en \"Submit\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Submit\"","children":[{"start":14,"value":"Submit","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":20,"gherkinStepLine":19,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end