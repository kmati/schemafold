/*
 * This module loads the seed-data for loading data into the DALs for the seedData
 */
export class SeedDataLoader {
	// seedData: An object whose property names are Entity names and
	//	the values are paths to the schema files OR the schema objects
	constructor(seedData) {
		this.seedData = [];
		for (let schemaName in seedData) {
			let schemaPath = seedData[schemaName];
			let dataObj;
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
	}
};
