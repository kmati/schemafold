"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*
 * This module is the seed data code generator. It generates code to bulk insert seed data for a schema
 */

var SeedDataCodeGen = exports.SeedDataCodeGen = function () {
	function SeedDataCodeGen() {
		_classCallCheck(this, SeedDataCodeGen);
	}

	_createClass(SeedDataCodeGen, [{
		key: "generate",
		value: function generate(schemaName, seedDataArr) {
			var code = "\"use strict\";\n// Bulk insert of seed data for " + schemaName + "\nconst dal = require('./dal/" + schemaName + "');\n\n// Iterates through an array and invokes an asynchronous function on each element\n// arr: The array\n// fnEach: Invoked on each element of the array. Signature: void function (item, done), where done is void function (err)\n// callback: Invoked at the end or if an error occurs. Signature: void function (err)\nfunction sequence(arr, fnEach, callback) {\n\tlet index = 0;\n\tfunction onDone() {\n\t\tlet item = arr[index];\n\t\tfnEach(item, err => {\n\t\t\tif (err) {\n\t\t\t\tcallback(err);\n\t\t\t\treturn;\n\t\t\t}\n\n\t\t\tindex++;\n\t\t\tif (index < arr.length) {\n\t\t\t\tonDone();\n\t\t\t} else {\n\t\t\t\tcallback();\n\t\t\t}\n\t\t});\n\t}\n\tonDone();\n}\n\nsequence(seedDataArr,\n\t(seedDataObj, done) => {\n\t\tdal.insert(seedDataObj)\n\t\t\t.then(ret => {\n\t\t\t\tconsole.log('[Bulk insert success for " + schemaName + "] Inserted data for id: ' + ret.id);\n\t\t\t\tdone();\n\t\t\t})\n\t\t\t.catch(done);\n\t}, err => {\n\t\tconsole.error('[Bulk insert error for " + schemaName + "] id: ' + ret.id + '. The error is:', err);\n\t});";
			return code;
		}
	}]);

	return SeedDataCodeGen;
}();

;