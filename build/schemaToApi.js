"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*
 * This module is the API generator. It generates API route handlers for a schema
 */

var schemaToApi = exports.schemaToApi = function () {
	function schemaToApi() {
		_classCallCheck(this, schemaToApi);
	}

	_createClass(schemaToApi, [{
		key: "generate",
		value: function generate(versionNumber, schemaName, schema) {
			var code = "// API for " + schemaName + "\n\t\t\tconst dal = require('./dal');\n\t\t\tmodule.exports = function (app) {\n\t\t\t\t/* Top level API */\n\n\t\t\t\t// Gets all the " + schemaName + " records\n\t\t\t\tapp.get('/" + versionNumber + "/" + schemaName + "', function (req, res, next) {\n\t\t\t\t\tdal.findAll()\n\t\t\t\t\t\t.then(arr => {\n\t\t\t\t\t\t\tres.status(200).json(arr);\n\t\t\t\t\t\t})\n\t\t\t\t\t\t.catch(e => {\n\t\t\t\t\t\t\tres.status(500).json({ error: e.toString() });\n\t\t\t\t\t\t})\n\t\t\t\t\tres.status(200).json(all);\n\t\t\t\t\tnext();\n\t\t\t\t});\n\n\t\t\t\t// Gets 1 " + schemaName + " record\n\t\t\t\tapp.get('/" + versionNumber + "/" + schemaName + "/:id', function (req, res, next) {\n\t\t\t\t\tdal.find(req.params.id)\n\t\t\t\t\t\t.then(ret => {\n\t\t\t\t\t\t\tres.status(200).json(ret);\n\t\t\t\t\t\t})\n\t\t\t\t\t\t.catch(e => {\n\t\t\t\t\t\t\tres.status(500).json({ error: e.toString() });\n\t\t\t\t\t\t})\n\t\t\t\t\tres.status(200).json(all);\n\t\t\t\t\tnext();\n\t\t\t\t});\n\n\t\t\t\t// Posts (i.e. creates) 1 " + schemaName + " record\n\t\t\t\tapp.post('/" + versionNumber + "/" + schemaName + "', function (req, res, next) {\n\t\t\t\t\tdal.insert(req.params.id, req.body)\n\t\t\t\t\t\t.then(ret => {\n\t\t\t\t\t\t\tres.status(200).json(ret);\n\t\t\t\t\t\t})\n\t\t\t\t\t\t.catch(e => {\n\t\t\t\t\t\t\tres.status(500).json({ error: e.toString() });\n\t\t\t\t\t\t})\n\t\t\t\t\tres.status(200).json(all);\n\t\t\t\t\tnext();\n\t\t\t\t});\n\n\t\t\t\t// Puts (i.e. edits) 1 " + schemaName + " record\n\t\t\t\tapp.put('/" + versionNumber + "/" + schemaName + "/:id', function (req, res, next) {\n\t\t\t\t\tdal.update(req.params.id, req.body)\n\t\t\t\t\t\t.then(ret => {\n\t\t\t\t\t\t\tres.status(200).json(ret);\n\t\t\t\t\t\t})\n\t\t\t\t\t\t.catch(e => {\n\t\t\t\t\t\t\tres.status(500).json({ error: e.toString() });\n\t\t\t\t\t\t})\n\t\t\t\t\tres.status(200).json(all);\n\t\t\t\t\tnext();\n\t\t\t\t});\n\n\t\t\t\t// Deletes all the " + schemaName + " records\n\t\t\t\tapp.delete('/" + versionNumber + "/" + schemaName + "', function (req, res, next) {\n\t\t\t\t\tdal.remove(req.params.id)\n\t\t\t\t\t\t.then(ret => {\n\t\t\t\t\t\t\tres.status(200).json(null);\n\t\t\t\t\t\t})\n\t\t\t\t\t\t.catch(e => {\n\t\t\t\t\t\t\tres.status(500).json({ error: e.toString() });\n\t\t\t\t\t\t})\n\t\t\t\t\tres.status(200).json(all);\n\t\t\t\t\tnext();\n\t\t\t\t});\n\n\t\t\t\t// Deletes 1 " + schemaName + " record\n\t\t\t\tapp.delete('/" + versionNumber + "/" + schemaName + "/:id', function (req, res, next) {\n\t\t\t\t\tdal.remove(req.params.id)\n\t\t\t\t\t\t.then(ret => {\n\t\t\t\t\t\t\tres.status(200).json(null);\n\t\t\t\t\t\t})\n\t\t\t\t\t\t.catch(e => {\n\t\t\t\t\t\t\tres.status(500).json({ error: e.toString() });\n\t\t\t\t\t\t})\n\t\t\t\t\tres.status(200).json(all);\n\t\t\t\t\tnext();\n\t\t\t\t});\n\t\t\t};";
			return code;
		}
	}]);

	return schemaToApi;
}();

;