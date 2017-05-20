// see http://www.levibotelho.com/development/commit-a-file-with-the-github-api

var uriTemplates = require('uri-templates');

var dateFormat = require('dateformat');

var SINGLE_REF_TEMPLATE = uriTemplates("/repos/{owner}/{repo}/git/refs/{ref}");
var ALL_REF_TEMPLATE = uriTemplates("/repos/{owner}/{repo}/git/refs");
var ALL_BLOBS_TEMPLATE = uriTemplates("/repos/{owner}/{repo}/git/blobs");
var ALL_TREES_TEMPLATE = uriTemplates("/repos/{owner}/{repo}/git/trees");
var ALL_COMMITS_TEMPLATE = uriTemplates("/repos/{owner}/{repo}/git/commits");

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

var newTreeList = [];

var timestampString = dateFormat(new Date(), "yyyy-mm-dd") + "T" + dateFormat(new Date(), "UTC:HH:MM:ss") + "Z";
newFiles.forEach(function(value, index) {
    // 1. Create new blobs for the files we want to add
    git_api_request(config, "POST",
        getEndpoint(ALL_BLOBS_TEMPLATE, {}), {
            content: getFile(value.filename),
            encoding: "base64"
        }, "createblob" + index,
        function(create_blob_response) {

            //1a. Prepare tree list with blob hashes and paths
            newTreeList.push({
                sha: create_blob_response.sha,
                path: value.github_path,
                mode: "100644",
                type: "blob"
            });

            logger.info(JSON.stringify(newFiles, "", "\t"));
            if ((index + 1) == newFiles.length) {
                // 2. Get master reference
                git_api_request(config, "GET",
                    getEndpoint(SINGLE_REF_TEMPLATE, { ref: "heads\/master" }), {}, "getmaster",
                    function(master_ref_response) {
                        // 3. Create new branch based on master
                        git_api_request(config, "POST",
                            getEndpoint(ALL_REF_TEMPLATE, {}), {
                                ref: "refs/heads/gitapitest" + new Date().valueOf(),
                                sha: master_ref_response.object.sha
                            },
                            "createNewBranch",
                            function(create_branch_response) {
                                // 4. Get master's commit hash
                                git_api_request(config, "GET",
                                    master_ref_response.object.url, {},
                                    "getMasterCommit",
                                    function(master_commit_response) {

                                        // 5. Create new tree based on master commit tree and new files we want to add
                                        git_api_request(config, "POST", getEndpoint(ALL_TREES_TEMPLATE, {}), {
                                                "base_tree": master_commit_response.tree.sha,
                                                "tree": newTreeList
                                            },
                                            "createNewTree",
                                            function(create_tree_response) {

                                                // 6. Create commit
                                                git_api_request(config, "POST", getEndpoint(ALL_COMMITS_TEMPLATE, {}), {
                                                    "message": "my github api commit on " + timestampString,
                                                    "author": {
                                                        "name": config.github_username,
                                                        "email": config.github_user,
                                                        "date": timestampString
                                                    },
                                                    "parents": [
                                                        master_ref_response.object.sha
                                                    ],
                                                    "tree": create_tree_response.sha
                                                }, "createNewCommit", function(create_commit_response) {

                                                    // 7. Update new branch's head to new commit
                                                    git_api_request(config, "PATCH", create_branch_response.url, {
                                                            "sha": create_commit_response.sha
                                                        },
                                                        "update_head");
                                                });
                                            });
                                    }
                                );
                            }
                        );
                    }
                );

            }
        });
});