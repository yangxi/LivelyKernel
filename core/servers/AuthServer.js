var async = require("async");
var util = require("util");
var repoServer = require("./ObjectRepositoryServer");

function getGroups(userDB, cb) {
    var groups = userDB.users.reduce(function(allGroups, user) {
        var groups = user.custom.groups || [];
        if (!util.isArray(groups)) groups = [groups];
        groups.forEach(function(g) { if (!allGroups[g]) allGroups[g] = []; allGroups[g].push(user.name); });
        return allGroups;
    }, {});
    cb(null, groups);
}

function getGroupsOfUser(userDB, userName, cb) {
    var user = userDB.users.detect(function(ea) { return ea.name === userName; });
    cb(!user ? new Error("User " + userName + " not found") : null, user ? user.custom.groups || [] : []);
}

function getAuthorsOfResource(path, thenDo) {
    var query = "SELECT distinct(author)\n"
              + "FROM versioned_objects\n"
              + "WHERE path = ? and version > ifnull((\n"
              + "    SELECT max(version)\n"
              + "        FROM versioned_objects\n"
              + "        WHERE path = ? AND change = 'deletion'), -1)";

    repoServer.withDBDo(function(err, db) {
        if (err) thenDo(err, []);
        else db.all(query, path, path, function(err, rows) {
            thenDo(err, (rows || []).map(function(ea) { return ea.author || ""; }))
        });
    });
}

function getResourcesOfAuthors(authors, thenDo) {
    if (!authors || !authors.length) return thenDo(null, []);
    var query = "SELECT path "
              + "FROM versioned_objects "
              + "WHERE "
              + authors.map(function(ea) { return "author = '" + ea + "'"}).join(" OR ")
              + " GROUP BY path HAVING max(version) AND change != 'deletion'";
    repoServer.withDBDo(function(err, db) {
        if (err) thenDo(err, []);
        else db.all(query, function(err, rows) {
            thenDo(err, (rows || []).map(function(ea) { return ea.path || null; }).compact());
        });
    });
}

function getCommonGroups(userDB, user1, user2, thenDo) {
    var groups1, groups2;
    async.waterfall([
        getGroupsOfUser.bind(null, userDB, user1),
        function(groups, next) { groups1 = groups; next(); },
        getGroupsOfUser.bind(null, userDB, user2),
        function(groups, next) { groups2 = groups; next(); },
        function(next) {
            next(null, groups1.intersect(groups2));
        }
    ], function(err, commonGroups) {
        if (err) console.error("getCommonGroups error: ", err);
        thenDo(null, commonGroups || []); });
}

function isResourceGroupOwnedByUser(userDB, userName, resourcePath, thenDo) {
    async.waterfall([
        getAuthorsOfResource.bind(null, resourcePath),
        function(authors, next) {
            if (authors.indexOf(userName) > -1) next(null, true);
            else {
                async.detect(authors, function(author, next) {
                    getCommonGroups(userDB, author, userName, function(err, groups) {
                        next(null, groups && groups.length);
                    })
                }, next);
            }
        }
    ], thenDo);
}

function getResourcesOfGroup(userDB, group, thenDo) {
    async.waterfall([
        getGroups.bind(null, userDB),
        function(groups, next) {
            var users = groups[group];
            next(!users ? new Error("group " + group + " does not exist") : null, users);
        },
        getResourcesOfAuthors
    ], thenDo);
}

module.exports = function(route, app) {

    app.get(route + "user-db", function(req, res) {
        var userDB = lively.server.lifeStar.authHandler.userDB;
        userDB.exportSettings(function(err, settings) {
            if (err) res.status(500).json({error: String(err)})
            else res.json(settings);
        });
    });

    app.post(route + "user-db/access-rules", function(req, res) {
        var userDB = lively.server.lifeStar.authHandler.userDB;
        var rules = req.body;
        userDB.setAccessRules(rules, function(err) {
            if (err) res.status(400).json({error: String(err)})
            else res.json({message: "access rules saved"})
        })
    });

    app.post(route + "user-db/user", function(req, res) {
        var userDB = lively.server.lifeStar.authHandler.userDB;
        var user = req.body;
        userDB.addUser(user, function(err) {
            if (err) res.status(400).json({error: String(err)})
            else res.json({message: "user saved"})
        });
    });

    app.post(route + "user-db/user-delete", function(req, res) {
        var userDB = lively.server.lifeStar.authHandler.userDB;
        var userName = req.body.name;
        userDB.removeUserNamed(userName, function(err) {
            if (err) res.status(400).json({error: String(err)})
            else res.json({message: "user removed"})
        });
    });

    app.get(route + "user-db/user-resources/:userName", function(req, res) {
        var userName = req.param("userName");
        var userDB = lively.server.lifeStar.authHandler.userDB;
        getResourcesOfAuthors([userName], function(err, resourcePaths) {
            if (err) res.status(400).json({error: String(err)})
            else res.json({resources: resourcePaths})
        });
    });

    app.get(route + "user-db/groups/:user", function(req, res) {
        var userName = req.param("user") || req.livelySession.username;
        var userDB = lively.server.lifeStar.authHandler.userDB;
        getGroupsOfUser(userDB, userName, function(err, groups) {
            if (err) res.status(400).json({error: String(err)})
            else res.json({groups: groups})
        });
    });

    app.get(route + "user-db/group-resources/:groupName", function(req, res) {
        var groupName = req.param("groupName");
        var userDB = lively.server.lifeStar.authHandler.userDB;
        getResourcesOfGroup(userDB, groupName, function(err, resourcePaths) {
            if (err) res.status(400).json({error: String(err)})
            else res.json({resources: resourcePaths})
        });
    });
    
    app.get(route + "user-db/group-members/:groupName", function(req, res) {
        var groupName = req.param("groupName");
        var userDB = lively.server.lifeStar.authHandler.userDB;
        getGroups(userDB, function(err, groups) {
            if (err) res.status(400).json({error: String(err)})
            else res.json({users: groups[groupName] || []});
        });
    });

    app.post(route + "user-db/hash", function(req, res) {
        var string = req.body.string;
        var bcrypt = require("life_star/node_modules/life_star-auth/node_modules/bcrypt")
        var salt = bcrypt.genSaltSync(10);
        var hash = bcrypt.hashSync(string, salt);
        res.json({hash: hash});
    });

    app.get(route, function(req, res) {
        res.end(req.url + "\n" + req.query + "\n" + req.originalUrl);
        // res.end("AuthServer is running!");
    });
}

module.exports.getGroups = getGroups;
module.exports.getGroupsOfUser = getGroupsOfUser;
module.exports.getAuthorsOfResource = getAuthorsOfResource;
module.exports.getCommonGroups = getCommonGroups;
module.exports.isResourceGroupOwnedByUser = isResourceGroupOwnedByUser;
module.exports.getResourcesOfAuthors = getResourcesOfAuthors;

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-


/*
var livelyAuthServer = require(process.env.WORKSPACE_LK + "/core/servers/AuthServer");
livelyAuthServer.isResourceGroupOwnedByUser(userDB, user.name, req.url, function(err, answer) {
    if (!err && answer) callback(null, "allow");
    else callback(err, "deny")
})
*/

/*
auth = require("./AuthServer")
userDB = lively.server.lifeStar.authHandler.userDB

auth.getGroups(userDB, function(err, rows) { console.dir(err || rows); })

auth.getAuthorsOfResource("welcome.html", function(err, rows) { console.dir(rows[0]); })
auth.getAuthorsOfResource("blank.html", function(err, rows) { console.dir(rows[0]); })
auth.getAuthorsOfResource("admin/user-settings.html", function(err, rows) { console.dir(rows[0]); })
auth.getResourcesOfAuthors(["robertkrahn", "test-user"], function(err, rows) { console.dir(rows); })

auth.getGroupsOfUser(userDB, "robertkrahn", function(err, groups) { console.log(groups); });
auth.getCommonGroups(userDB, "robertkrahn", "mroeder", function(err, answer) { console.log(err || answer); });
auth.getCommonGroups(userDB, "robertkrahn", "test-user", function(err, answer) { console.log(err || answer); });
auth.getCommonGroups(userDB, "robertkrahn", "ugaaga", function(err, answer) { console.log(err || answer); });
auth.isResourceGroupOwnedByUser(userDB, "robertkrahn", "admin/user-settings.html", function(err, answer) { console.log(err || answer); });
auth.isResourceGroupOwnedByUser(userDB, "robertkrahn", "blank.html", function(err, answer) { console.log(err || answer); });

*/
