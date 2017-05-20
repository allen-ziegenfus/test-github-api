// TEMPLATE URIS
// error handling

var request = require('request');
var fs = require("fs");

var configFile = "./config.json";
try {
    config = JSON.parse(fs.readFileSync(configFile));
} catch (error) {
    logger.error("Please create config file " + configFile + " with the following syntax in the current directory");
    logger.error(JSON.stringify(configDummy) + "\n");
    throw new Error("Could not find config file: " + configFile);
}

function git_api_get(config, endpoint, name) {
    request.get({
        url: config.github_server + endpoint,
        headers: {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": "token " + config.github_token,
            "User-Agent": config.github_user
        },
        time: true
    }, function(err, response) {
        var json = JSON.parse(response.body);
        fs.writeFile("results/" + name + ".json", JSON.stringify(json, null, "\t"));
        console.log('Request time for ' + name + ' in ms', response.elapsedTime);
    });
}


var testUrls = {
    azuser: "/users/allen-ziegenfus"
};

function runTests(config, testUrls) {
    for (prop in testUrls) {
        console.log("Testing " + prop);
        git_api_get(config, testUrls[prop], prop);
    }
}


runTests(config, testUrls);