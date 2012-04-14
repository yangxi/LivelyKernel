/*global alertOK, require, TestSuite, unescape, $, JSON*/

// some helpers
function exit() {
    window.open('', '_self', '');
    window.close();
}

function prepareConfig() {
    // For closing the browser
    Config.askBeforeQuit = false;
    // for network tests
    Config.serverInvokedTest = true;
}
function alertForever(msg) {
    alert(msg, 99999);
}

function getURLParam(name) {
    var queryRegex = new RegExp(name + '=([^\\&]+)'),
        match = document.URL.split('?').last().match(queryRegex);
    return match && unescape(match[1]);
}


// some preparation
var testRunId = getURLParam("testRunId");

if (!testRunId) {
    var msg = 'no id for test run, cannot execute tests';
    alertForever(msg);
    throw msg;
}


// result processing
function postResult(message) {
    alertOK("Result: \n" + message);
    $.post('/test-result/' + testRunId, {testRunId: testRunId, testResults: message});
}


// running the actual tests
var testList = [
    // core
    "lively.tests.TestFrameworkTests",
    "lively.tests.BaseTests",
    "lively.tests.HelperTests",
    "lively.tests.ObjectTests",
    "lively.tests.ModuleSystemTests",
    "lively.tests.ClassTests",
    "lively.tests.TraitTests",
    "lively.tests.TracingTests",
    "lively.tests.NetworkTests",
    "lively.lang.tests.ExtensionTests",

    // AST / OMeta
    "ometa.tests.OmetaTests",
    "lively.ast.tests.AstTests",

    // persistence
    "lively.persistence.tests.PersistenceTests",

    // morphic
    "lively.morphic.tests.Morphic",
    "lively.morphic.tests.Morphic2",
    "lively.morphic.tests.ShapeTests",
    "lively.morphic.tests.TabTests",
    "lively.morphic.tests.DataGridTests",
    "lively.morphic.tests.Connectors",
    "lively.morphic.tests.CoreToolsTests",
    'lively.morphic.tests.EventTests',
    "lively.morphic.tests.PathTests",

    //bindings
    "lively.bindings.tests.GeometryBindingTests",
    "lively.bindings.tests.BindingTests",

    // cop
    "cop.tests.LayerTests"
];

// filter is something like "lively.morphic.*|.*Origin.*|test03"
var filter = getURLParam('testFilter'), suiteFilter;
if (filter) {
    var parts = filter.split('|'),
        modulePart = parts[0],
        moduleFilterRegexp = new RegExp(modulePart, "i");
    testList = testList.select(function(name) {
        return moduleFilterRegexp.test(name) });
    suiteFilter = parts.slice(1).join('|'); // last 2
}

prepareConfig();

require(['lively.TestFramework'].concat(testList)).toRun(function() {
    var suite = TestSuite.forAllAvailableTests(suiteFilter);
    suite.runFinished = function() {
        var result = suite.result.asJSONString();
        postResult(result);
        if (!getURLParam('stayOpen')) { exit.delay(0.5); }
    };
    suite.runAll();
});
