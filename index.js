var request = require('request');
var fs = require("fs");

function runTest(url, name) {
    request.get({
        url: url,
        time: true
    }, function(err, response) {
        var json = JSON.parse(response.body);
        fs.writeFile("results/" + name + ".json", JSON.stringify(json, null, "\t"));
        console.log('Request time for ' + name + ' in ms', response.elapsedTime);
    });
}

var config = {
    server: "https://api.punkapi.com/v2"
};


var testUrls = {
    random: "/beers/random"
};

function runTests(config, testUrls) {
    for (prop in testUrls) {
        console.log("Testing " + prop);
        runTest(config.server + testUrls[prop], prop);
    }
}


runTests(config, testUrls);