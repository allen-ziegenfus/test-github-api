// see http://www.levibotelho.com/development/commit-a-file-with-the-github-api

var uriTemplates = require('uri-templates');

var SINGLE_REF_TEMPLATE = uriTemplates("/repos/{owner}/{repo}/git/refs/{ref}");
var ALL_REF_TEMPLATE = uriTemplates("/repos/{owner}/{repo}/git/refs");
var ALL_BLOBS_TEMPLATE = uriTemplates("/repos/{owner}/{repo}/git/blobs");

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
    "POST": 201, // 201 = created
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

function git_api_request(config, method, endpoint, body, name, cb) {
    logger.info("Invoking " + endpoint);

    request({
        method: method,
        url: endpoint,
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
        if (cb) cb(json);
    });
}


var requestDefaults = {
    owner: "allen-ziegenfus",
    repo: "web-dev-lrdcom"
};

var getFile = function(filename) {
    try {
        return Buffer.from(fs.readFileSync(filename)).toString("base64");
    } catch (error) {
        throw new Error("Could not find file: " + filename);
    }
};


var newFiles = [{
        github_path: "6.2.x/templates/global/test.ftl",
        filename: "newblobs/test.ftl"
    },
    {
        github_path: "6.2.x/templates/global/another.ftl",
        filename: "newblobs/another.ftl"
    }
];

function getEndpoint(template, params) {
    return config.github_server + template.fill(Object.assign({}, requestDefaults, params));
}



newFiles.forEach(function(value, index) {
    //    value.github_path;
    git_api_request(config, "POST",
        getEndpoint(ALL_BLOBS_TEMPLATE, {}), {
            content: getFile(value.filename),
            encoding: "base64"
        }, "createblob" + index,
        function(create_blob_response) {
            value.sha = create_blob_response.sha;
            logger.info(JSON.stringify(newFiles, "", "\t"));
        });
});


var requests = {
    getmaster: {
        method: "GET",
        endpoint: getEndpoint(SINGLE_REF_TEMPLATE, { ref: "heads\/master" }),
        callback: function(json) {

            git_api_request(config, "POST",
                getEndpoint(ALL_REF_TEMPLATE, {}), {
                    ref: "refs/heads/gitapitest" + new Date().valueOf(),
                    sha: json.object.sha
                },
                "createNewBranch",
                function(create_branch_response) {

                    git_api_request(config, "GET",
                        json.object.url, {},
                        "getMasterCommit");
                });
        }
    }
};


/*
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

var postUrls = {
    updatehead: {
        method: "PATCH",
        endpoint: "/repos/allen-ziegenfus/web-dev-lrdcom/git/refs/heads/gitapitest4",
        body: {
            sha: "ef9e58cdca160c9c2c36d215010c5fbef2202d9c"
        }
    }
};
*/


function runRequests(config, requests) {
    for (var prop in requests) {
        logger.info("Testing " + prop);
        git_api_request(config, requests[prop].method, requests[prop].endpoint, requests[prop].body, prop, requests[prop].callback);
    }
}

runRequests(config, requests);