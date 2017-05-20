// TEMPLATE URIS
// error handling

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

        if (json.content && json.encoding && json.encoding == "base64") {
            var buf = Buffer.from(json.content, json.encoding);
            fs.writeFile("results/" + name, buf);
        }


        console.log('Request time for ' + name + ' in ms', response.elapsedTime);
    });
}


var testUrls = {
    azuser: "/users/allen-ziegenfus",
    blob_blogsxml: "/repos/allen-ziegenfus/web-dev-lrdcom/git/blobs/e1c2d069fbe56273a1e148d5602f3ff833d5efca",
    blog_blogsftl: "/repos/allen-ziegenfus/web-dev-lrdcom/git/blobs/07ac88bcbc0fd4dac28750462c01ecf4bb5f92d4",
    webdev_template_tree: "/repos/allen-ziegenfus/web-dev-lrdcom/git/trees/361d1d7d750738c454108b3f9e463a39c956cb79",
    webdev_refs: "/repos/allen-ziegenfus/web-dev-lrdcom/git/refs",
    webdev_master: "/repos/allen-ziegenfus/web-dev-lrdcom/git/refs/heads/master",
    webdev_master_commits: "/repos/allen-ziegenfus/web-dev-lrdcom/git/commits/edefc2601d334debc6a8a0ca91c338286c5273d9",
    master_tree: "/repos/allen-ziegenfus/web-dev-lrdcom/git/trees/edefc2601d334debc6a8a0ca91c338286c5273d9"
};

function runTests(config, testUrls) {
    for (prop in testUrls) {
        console.log("Testing " + prop);
        git_api_get(config, testUrls[prop], prop);
    }
}


runTests(config, testUrls);