'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*
 * This module loads the schemas
 */

var SchemaLoader =
// schemas: An object whose property names are Entity names and
//	the values are paths to the schema files OR the schema objects
exports.SchemaLoader = function SchemaLoader(schemas) {
	_classCallCheck(this, SchemaLoader);

	this.schemas = [];
	for (var schemaName in schemas) {
		var schemaPath = schemas[schemaName];
		var schemaObj = void 0;
		if (typeof schemaPath === 'string') {
			schemaObj = require(schemaPath);
		} else {
			schemaObj = schemaPath;
		}
		this.schemas.push({
			schemaName: schemaName,
			schema: schemaObj
		});
	}
};

;