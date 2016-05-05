'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*
 * This module loads the seed-data for loading data into the DALs for the seedData
 */

var SeedDataLoader =
// seedData: An object whose property names are Entity names and
//	the values are paths to the schema files OR the schema objects
exports.SeedDataLoader = function SeedDataLoader(seedData) {
	_classCallCheck(this, SeedDataLoader);

	this.seedData = [];
	for (var schemaName in seedData) {
		var schemaPath = seedData[schemaName];
		var dataObj = void 0;
		if (typeof schemaPath === 'string') {
			dataObj = require(schemaPath);
		} else {
			dataObj = schemaPath;
		}
		this.seedData.push({
			schemaName: schemaName,
			data: dataObj
		});
	}
};

;