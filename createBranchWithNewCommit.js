var uriTemplates = require('uri-templates');

var REF_TEMPLATE = uriTemplates("/repos/{owner}/{repo}/git/refs/heads/{ref}");

// error handling

//Response Code 422 ref=refs/heads/gitapitest (invalid param?)

var request = require('request');
var fs = require("fs");

var winston = require("winston");
var logger = new winston.Logger({
    level: 'debug',
    transports: [
        new(winston.transports.Console)()
    ]
});


var EXPECTED_RETURN_CODES = {
    "GET": 200,
    "PUT": 201, // 201 = created
    "PATCH": 200
};

var configDummy = {
    "github_token": "my oauth token",
    "github_user": "allen.ziegenfus@liferay.com",
    "github_server": "https://api.github.com"
}

var configFile = "./config.json";
var config;
try {
    config = JSON.parse(fs.readFileSync(configFile));
} catch (error) {
    logger.error("Please create config file " + configFile + " with the following syntax in the current directory");
    logger.error(JSON.stringify(configDummy) + "\n");
    throw new Error("Could not find config file: " + configFile);
}

function git_api_request(config, method, endpoint, body, name) {
    logger.info("Invoking " + config.github_server + endpoint);

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

        if (response && response.statusCode) {
            logger.info("Http Response: " + response.statusCode);
        }
        if (err) {
            logger.error(err);
            throw err;
        } else if (response && response.statusCode && (response.statusCode != EXPECTED_RETURN_CODES[method])) {
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
        logger.info('Request time for ' + name + ' in ms', response.elapsedTime);
    });
}

var requests = {
    getmaster: {
        method: "GET",
        endpoint: REF_TEMPLATE.fill({
            owner: "allen-ziegenfus",
            repo: "web-dev-lrdcom",
            ref: "master"
                /* ref: "gitapitest" + new Date().valueOf()*/
        }),
    }
};

function runRequests(config, requests) {
    for (var prop in requests) {
        logger.info("Testing " + prop);
        git_api_request(config, requests[prop].method, requests[prop].endpoint, requests[prop].body, prop);
    }
}

runRequests(config, requests);