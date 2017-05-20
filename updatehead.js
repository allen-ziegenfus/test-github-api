// TEMPLATE URIS
// error handling

//Response Code 422 ref=refs/heads/gitapitest (invalid param?)
//Response Code 201 = created
var request = require('request');
var fs = require("fs");

var winston = require("winston");
var logger = new winston.Logger({
    level: 'debug',
    transports: [
        new(winston.transports.Console)()
    ]
});


var configDummy = {
    "github_token": "my oauth token",
    "github_user": "allen.ziegenfus@liferay.com",
    "github_server": "https://api.github.com"
}

var configFile = "./config.json";
try {
    config = JSON.parse(fs.readFileSync(configFile));
} catch (error) {
    logger.error("Please create config file " + configFile + " with the following syntax in the current directory");
    logger.error(JSON.stringify(configDummy) + "\n");
    throw new Error("Could not find config file: " + configFile);
}

function git_api_request(config, method, endpoint, body, name) {
    request({
        method: method,
        url: config.github_server + endpoint,
        body: body,
        json: true,
        headers: {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": "token " + config.github_token,
            "User-Agent": config.github_user
        },
        time: true
    }, function(err, response) {

        logger.info("Http Response: " + response.statusCode);
        if (err) {
            logger.error(err);
            throw err;
        } else if (response && response.statusCode && (response.statusCode != 201)) {
            logger.error("An error seems to have occurred. Response Code " + response.statusCode, body);
            var errorobj = {
                statusCode: response.statusCode,
                body: body
            };
            throw errorobj;
        }

        var json = response.body;
        fs.writeFile("results/" + name + ".json", JSON.stringify(json, null, "\t"));
        if (json.content && json.encoding && json.encoding == "base64") {
            var buf = Buffer.from(json.content, json.encoding);
            fs.writeFile("results/" + name, buf);
        }
        console.log('Request time for ' + name + ' in ms', response.elapsedTime);
    });
}


var postUrls = {
    updatehead: {
        method: "PATCH",
        endpoint: "/repos/allen-ziegenfus/web-dev-lrdcom/git/refs/heads/gitapitest4",
        body: {
            sha: "ef9e58cdca160c9c2c36d215010c5fbef2202d9c"
        }
    }
};

function runTests(config, testUrls) {
    for (prop in testUrls) {
        console.log("Testing " + prop);
        git_api_request(config, testUrls[prop].method, testUrls[prop].endpoint, testUrls[prop].body, prop);
    }
}


runTests(config, postUrls);