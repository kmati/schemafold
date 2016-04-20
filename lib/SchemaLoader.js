/*
 * This module loads the schemas
 */
export class SchemaLoader {
	// schemas: An object whose property names are Entity names and
	//	the values are paths to the schema files OR the schema objects
	constructor(schemas) {
		this.schemas = [];
		for (let schemaName in schemas) {
			let schemaPath = schemas[schemaName];
			let schemaObj;
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
	}
};
