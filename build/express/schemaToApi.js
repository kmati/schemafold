"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*
 * This module is the API generator. It generates API route handlers for a schema
 */

var SchemaToApi = exports.SchemaToApi = function () {
	function SchemaToApi() {
		_classCallCheck(this, SchemaToApi);
	}

	_createClass(SchemaToApi, [{
		key: "generate",
		value: function generate(versionNumber, schemaName, schema) {
			var code = "\"use strict\";\n// API for " + schemaName + "\nconst dal = require('./dal/" + schemaName + "'),\n\tconfiguration = require('./configuration.json'),\n\tbaseUri = '/v' + configuration.versionNumber + '/';\nmodule.exports = function (app) {\n\t/* Top level API */\n\n\tapp.get(baseUri + '" + schemaName + "/dal', (req, res, next) => {\n\t\tlet dalInfo = dal.info();\n\t\tres.status(200).json(dalInfo);\n\t});\n\n\t// Gets all the " + schemaName + " records\n\tapp.get(baseUri + '" + schemaName + "', (req, res, next) => {\n\t\tdal.findAll()\n\t\t\t.then(arr => {\n\t\t\t\tres.status(200).json(arr);\n\t\t\t\tnext();\n\t\t\t})\n\t\t\t.catch(e => {\n\t\t\t\tres.status(500).json({ error: e.toString() });\n\t\t\t\tnext();\n\t\t\t});\n\t});\n\n\t// Gets 1 " + schemaName + " record\n\tapp.get(baseUri + '" + schemaName + "/:id', (req, res, next) => {\n\t\tdal.find({ id: Number(req.params.id) })\n\t\t\t.then(ret => {\n\t\t\t\tres.status(200).json(ret);\n\t\t\t\tnext();\n\t\t\t})\n\t\t\t.catch(e => {\n\t\t\t\tres.status(500).json({ error: e.toString() });\n\t\t\t\tnext();\n\t\t\t});\n\t});\n\n\t// Posts (i.e. creates) 1 " + schemaName + " record\n\tapp.post(baseUri + '" + schemaName + "', (req, res, next) => {\n\t\tdal.insert(req.body)\n\t\t\t.then(ret => {\n\t\t\t\tres.status(200).json(ret);\n\t\t\t\tnext();\n\t\t\t})\n\t\t\t.catch(e => {\n\t\t\t\tres.status(500).json({ error: e.toString() });\n\t\t\t\tnext();\n\t\t\t});\n\t});\n\n\t// Puts (i.e. edits) 1 " + schemaName + " record\n\tapp.put(baseUri + '" + schemaName + "/:id', (req, res, next) => {\n\t\tdal.update({ id: Number(req.params.id) }, req.body)\n\t\t\t.then(ret => {\n\t\t\t\tres.status(200).json(ret);\n\t\t\t\tnext();\n\t\t\t})\n\t\t\t.catch(e => {\n\t\t\t\tres.status(500).json({ error: e.toString() });\n\t\t\t\tnext();\n\t\t\t});\n\t});\n\n\t// Deletes all the " + schemaName + " records\n\tapp.delete(baseUri + '" + schemaName + "', (req, res, next) => {\n\t\tdal.removeAll()\n\t\t\t.then(ret => {\n\t\t\t\tres.status(200).json(null);\n\t\t\t\tnext();\n\t\t\t})\n\t\t\t.catch(e => {\n\t\t\t\tres.status(500).json({ error: e.toString() });\n\t\t\t\tnext();\n\t\t\t});\n\t});\n\n\t// Deletes 1 " + schemaName + " record\n\tapp.delete(baseUri + '" + schemaName + "/:id', (req, res, next) => {\n\t\tdal.remove({ id: Number(req.params.id) })\n\t\t\t.then(ret => {\n\t\t\t\tres.status(200).json(null);\n\t\t\t\tnext();\n\t\t\t})\n\t\t\t.catch(e => {\n\t\t\t\tres.status(500).json({ error: e.toString() });\n\t\t\t\tnext();\n\t\t\t});\n\t});\n};";
			return code;
		}
	}]);

	return SchemaToApi;
}();

;