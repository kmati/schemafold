"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*
 * This module is the DAL generator for a schema
 */

var SchemaToDal = exports.SchemaToDal = function () {
	function SchemaToDal() {
		_classCallCheck(this, SchemaToDal);
	}

	_createClass(SchemaToDal, [{
		key: "generate",
		value: function generate(dbConnectString, schemaName, schema, schemas) {
			var code = "\"use strict\";\n// DAL for " + schemaName + "\nconst mongodb = require('mongodb'),\n\tcollectionName = '" + schemaName + "';\nmodule.exports = {\n    // Connects to the db and invokes an action\n    getDb: function () {\n        let MongoClient = mongodb.MongoClient;\n\n        // Connection URL\n        let url = '" + dbConnectString + "';\n\n    \treturn new Promise(function(resolve, reject) {\n\t        MongoClient.connect(url, function(err, db) {\n\t            if (err) {\n\t                reject(err);\n\t                return;\n\t            }\n\n\t            resolve(db);\n\t        });\n\t    });\n    },\n\n    // Gets info about the DAL\n    info: function () {\n    \treturn {\n    \t\tdal: 'node-mongodb',\n    \t\tcollectionName: collectionName\n    \t};\n    },\n\n    // Resolves to an array of " + schemaName + " objects\n    findAll: function () {\n    \treturn this.find({});\n    },\n\n    // Resolves to an array of " + schemaName + " objects\n    find: function (whereObj) {\n    \tlet self = this;\n    \treturn new Promise(function(resolve, reject) {\n\t    \tself.getDb()\n\t    \t\t.then(db => {\n\t\t            let collection = db.collection(collectionName);\n\t\t            collection.find(whereObj).toArray(function(err, result) {\n\t\t                db.close();\n\n\t\t                if (err) {\n\t\t                    reject(err);\n\t\t                    return;\n\t\t                }\n\t\t                resolve(result);\n\t\t            });\n\t    \t\t});\n    \t});\n    },\n\n    insert: function (docs) {\n    \tlet self = this;\n    \treturn new Promise(function(resolve, reject) {\n\t    \tself.getDb()\n\t    \t\t.then(db => {\n\t\t            let collection = db.collection(collectionName);\n\t\t            collection.insert(docs, function(err, result) {\n\t\t                db.close();\n\n\t\t                if (err) {\n\t\t                    reject(err);\n\t\t                    return;\n\t\t                }\n\t\t                resolve(result);\n\t\t            });\n\t\t        });\n\t\t});\n    },\n\n    update: function (whereObj, setObj) {\n    \tlet self = this;\n    \treturn new Promise(function(resolve, reject) {\n\t    \tself.getDb()\n\t    \t\t.then(db => {\n\t\t            let collection = db.collection(collectionName);\n\t\t            if (setObj._id) {\n\t\t                // remove the _id column from the update object being set!\n\t\t                delete setObj._id;\n\t\t            }\n\t\t            collection.update(whereObj, { $set: setObj }, function(err, result) {\n\t\t                db.close();\n\n\t\t                if (err) {\n\t\t                    reject(err);\n\t\t                    return;\n\t\t                }\n\t\t                resolve(result);\n\t\t            });\n\t\t        });\n\t\t});\n    },\n\n    removeAll: function () {\n    \treturn this.remove({});\n    },\n\n    remove: function (whereObj) {\n    \tlet self = this;\n    \treturn new Promise(function(resolve, reject) {\n\t    \tself.getDb()\n\t    \t\t.then(db => {\n\t\t            let collection = db.collection(collectionName);\n\t\t            collection.remove(whereObj, function(err, result) {\n\t\t                db.close();\n\n\t\t                if (err) {\n\t\t                    reject(err);\n\t\t                    return;\n\t\t                }\n\t\t                resolve(result);\n\t\t            });\n\t\t        });\n\t\t});\n    }\n};";
			return code;
		}
	}]);

	return SchemaToDal;
}();

;