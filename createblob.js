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

function git_api_post(config, endpoint, body, name) {
    request.post({
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

        if (err) {
            logger.error(err);
            throw err;
        } else if (response && response.statusCode && (response.statusCode != 201)) {
            logger.error("An error seems to have occurred. Response Code " + response.statusCode, response.body);
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



var newblob_testftl;
var newblobfile = "newblobs/test.ftl";
try {
    newblob_testftl = Buffer.from(fs.readFileSync(newblobfile)).toString("base64");
} catch (error) {
    throw new Error("Could not find config file: " + newblobfile);
}


var postUrls = {
    createblob: {
        endpoint: "/repos/allen-ziegenfus/web-dev-lrdcom/git/blobs",
        body: {
            content: newblob_testftl,
            encoding: "base64"
        }
    },
    createTreeWithPath: {
        endpoint: "/repos/allen-ziegenfus/web-dev-lrdcom/git/trees",
        body: {
            "base_tree": "6ccf9fbb14b7027cdf8f3831b6ce82ca1ad2022e",
            "tree": [{
                "path": "6.2.x/templates/global/test.ftl",
                "mode": "100644",
                "type": "blob",
                "sha": "c5757efbdf872ecc868bf57c6d0dcdb749210c9f"
            }]
        }
    },
    /*
    createTree: {
        endpoint: "/repos/allen-ziegenfus/web-dev-lrdcom/git/trees",
        body: {
            "base_tree": "361d1d7d750738c454108b3f9e463a39c956cb79",
            "tree": [{
                "path": "test.ftl",
                "mode": "100644",
                "type": "blob",
                "sha": "c5757efbdf872ecc868bf57c6d0dcdb749210c9f"
            }]
        }
    }*/
};

var postUrls = {
    createCommit: {
        endpoint: "/repos/allen-ziegenfus/web-dev-lrdcom/git/commits",
        body: {
            "message": "my first commit",
            "author": {
                "name": "Allen Ziegenfus",
                "email": "allen.ziegenfus@liferay.com",
                "date": "2017-05-20T16:13:30+12:00"
            },
            "parents": [
                "edefc2601d334debc6a8a0ca91c338286c5273d9"
            ],
            "tree": "56d90e40887c78c2d57716c7f30c0752ee851109"
        }
    }
};

function runTests(config, testUrls) {
    for (prop in testUrls) {
        console.log("Testing " + prop);
        git_api_post(config, testUrls[prop].endpoint, testUrls[prop].body, prop);
    }
}


runTests(config, postUrls);