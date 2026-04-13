// Generated from: GenerateTest\features\DemoQA_Elements_Widges9.feature
import { test } from "playwright-bdd";

test.describe('DemoQA_Elements_Widges9', () => {

  test('Flujo DemoQA_Elements_Widges9', { tag: ['@UI'] }, async ({ Given, Then, And, page }) => { 
    await Given('el usuario está en la aplicación', null, { page }); 
    await And('hace clic en "Book Store Application"', null, { page }); 
    await And('hace clic en "Widgets"', null, { page }); 
    await And('hace clic en "Select Menu"', null, { page }); 
    await And('hace clic en ".css-8mmkcg"', null, { page }); 
    await And('hace clic en "Group 1, option 2"', null, { page }); 
    await And('hace clic en ".css-1xc3v61-indicatorContainer > .css-8mmkcg"', null, { page }); 
    await And('hace clic en "Mr."', null, { page }); 
    await And('selecciona "4" en "#oldSelectMenu"', null, { page }); 
    await And('hace clic en "div:nth-child(8) > .col-md-6 > .css-b62m3t-container > .css-13cymwt-control > .css-1wy0on6 > .css-1xc3v61-indicatorContainer > .css-8mmkcg"', null, { page }); 
    await And('hace clic en "#react-select-4-option-2"', null, { page }); 
    await And('hace clic en "#react-select-4-option-1"', null, { page }); 
    await And('hace clic en "div:nth-child(8)"', null, { page }); 
    await And('selecciona "saab" en "#cars"', null, { page }); 
    await Then('la operación es exitosa', null, { page }); 
  });

});

// == technical section ==

test.beforeEach('BeforeEach Hooks', ({ $runScenarioHooks, page }) => $runScenarioHooks('before', { page }));

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('GenerateTest\\features\\DemoQA_Elements_Widges9.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":5,"tags":["@UI"],"steps":[{"pwStepLine":7,"gherkinStepLine":6,"keywordType":"Context","textWithKeyword":"Given el usuario está en la aplicación","stepMatchArguments":[]},{"pwStepLine":8,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"And hace clic en \"Book Store Application\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Book Store Application\"","children":[{"start":14,"value":"Book Store Application","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":9,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"And hace clic en \"Widgets\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Widgets\"","children":[{"start":14,"value":"Widgets","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":10,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"And hace clic en \"Select Menu\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Select Menu\"","children":[{"start":14,"value":"Select Menu","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":10,"keywordType":"Context","textWithKeyword":"And hace clic en \".css-8mmkcg\"","stepMatchArguments":[{"group":{"start":13,"value":"\".css-8mmkcg\"","children":[{"start":14,"value":".css-8mmkcg","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":11,"keywordType":"Context","textWithKeyword":"And hace clic en \"Group 1, option 2\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Group 1, option 2\"","children":[{"start":14,"value":"Group 1, option 2","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"And hace clic en \".css-1xc3v61-indicatorContainer > .css-8mmkcg\"","stepMatchArguments":[{"group":{"start":13,"value":"\".css-1xc3v61-indicatorContainer > .css-8mmkcg\"","children":[{"start":14,"value":".css-1xc3v61-indicatorContainer > .css-8mmkcg","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":13,"keywordType":"Context","textWithKeyword":"And hace clic en \"Mr.\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Mr.\"","children":[{"start":14,"value":"Mr.","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":14,"keywordType":"Context","textWithKeyword":"And selecciona \"4\" en \"#oldSelectMenu\"","stepMatchArguments":[{"group":{"start":11,"value":"\"4\"","children":[{"start":12,"value":"4","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":18,"value":"\"#oldSelectMenu\"","children":[{"start":19,"value":"#oldSelectMenu","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":15,"keywordType":"Context","textWithKeyword":"And hace clic en \"div:nth-child(8) > .col-md-6 > .css-b62m3t-container > .css-13cymwt-control > .css-1wy0on6 > .css-1xc3v61-indicatorContainer > .css-8mmkcg\"","stepMatchArguments":[{"group":{"start":13,"value":"\"div:nth-child(8) > .col-md-6 > .css-b62m3t-container > .css-13cymwt-control > .css-1wy0on6 > .css-1xc3v61-indicatorContainer > .css-8mmkcg\"","children":[{"start":14,"value":"div:nth-child(8) > .col-md-6 > .css-b62m3t-container > .css-13cymwt-control > .css-1wy0on6 > .css-1xc3v61-indicatorContainer > .css-8mmkcg","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":17,"gherkinStepLine":16,"keywordType":"Context","textWithKeyword":"And hace clic en \"#react-select-4-option-2\"","stepMatchArguments":[{"group":{"start":13,"value":"\"#react-select-4-option-2\"","children":[{"start":14,"value":"#react-select-4-option-2","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":18,"gherkinStepLine":17,"keywordType":"Context","textWithKeyword":"And hace clic en \"#react-select-4-option-1\"","stepMatchArguments":[{"group":{"start":13,"value":"\"#react-select-4-option-1\"","children":[{"start":14,"value":"#react-select-4-option-1","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":19,"gherkinStepLine":18,"keywordType":"Context","textWithKeyword":"And hace clic en \"div:nth-child(8)\"","stepMatchArguments":[{"group":{"start":13,"value":"\"div:nth-child(8)\"","children":[{"start":14,"value":"div:nth-child(8)","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":20,"gherkinStepLine":19,"keywordType":"Context","textWithKeyword":"And selecciona \"saab\" en \"#cars\"","stepMatchArguments":[{"group":{"start":11,"value":"\"saab\"","children":[{"start":12,"value":"saab","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":21,"value":"\"#cars\"","children":[{"start":22,"value":"#cars","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":21,"gherkinStepLine":20,"keywordType":"Outcome","textWithKeyword":"Then la operación es exitosa","stepMatchArguments":[]}]},
]; // bdd-data-end