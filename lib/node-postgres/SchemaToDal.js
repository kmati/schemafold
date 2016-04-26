/*
 * This module is the DAL generator for a schema
 */
function findSchemaByObject(schemas, schemaObj) {
	return schemas.find(s => s.schema[s.schemaName] === schemaObj);
}

// Returns an object whose property names are the FK column names of the table and
// whose property values are objects with 2 props:
// - isArray (boolean): true means the primary record can have many foreign key records
// - otherTable = the other tables (where otherTable.schemaName is the FK table name)
function getForeignKeysInfo(schemas, schema, schemaName) {
	let fkInfos = {};
	let schemaObject = schema[schemaName];
	for (let columnName in schemaObject) {
		if (columnName === 'id') {
			continue;
		}

		let val = schemaObject[columnName];
		let isComputed = Function === val.type;

		// Example: foo: { type: String, enum: ['', 'Y', 'N'] },
		let notNullStr = val.required ? ' NOT NULL' : '';
		let _type = val.type;
		let _enum = val.enum;
		let _index = val.index;
		let _default = val.default;
		if (_type) {
			val = _type;
		}

		if (val === Number || val === String || val === Date || val === Boolean || isComputed) {
			continue;
		} else {
			// foreign key column
			let isArray = val instanceof Array;
			if (isArray) {
				val = val[0];
			}
			let otherTable = findSchemaByObject(schemas, val);
			fkInfos[columnName] = {
				isArray: isArray,
				otherTable: otherTable
			};
		}
 	}
 	return fkInfos;
}

// Returns an object with a getter function under the 'get' property
function getComputedFieldsInfo(schemas, schema, schemaName) {
	let cfInfos = {};
	let schemaObject = schema[schemaName];
	for (let columnName in schemaObject) {
		if (columnName === 'id') {
			continue;
		}

		let val = schemaObject[columnName];
		let isComputed = Function === val.type;

		if (isComputed) {
			// computed field column
			cfInfos[columnName] = {
				get: val.get
			};
		}
 	}	
 	return cfInfos;
}

export class SchemaToDal {
	/*
	 * dropDatabase: Drops the database
	 */
	dropDatabase(dbConnectString) {
	    let code = `"use strict";
const configuration = require('./configuration.json'),
	pg = require('pg'),
	url = configuration.dbConnectString;

let sqlDbDrop = 'DROP DATABASE ' + configuration.dbName + ';';

pg.connect(configuration.dbCreateDbConnectString, function(err, client, done) {
	let query = client.query(sqlDbDrop, []);

	query.on('end', () => {
	    console.log(configuration.dbName + ' Db dropped');
        done();
        process.exit(0);
	});

	query.on('error', err => {
		console.error(err);
	    done(err);
	    process.exit(0);
	});
});`;

    	return code;
	}

	/*
	 * createTables: Creates the db tables
	 */
	createTables(dbConnectString, schemas) {
		let dbCreateDbConnectString;
		let dbName;
		let loc = dbConnectString.lastIndexOf('/');
		if (loc > -1) {
			dbCreateDbConnectString = dbConnectString.substr(0, loc) + '/postgres';
			dbName = dbConnectString.substr(loc + 1);
		}

		let sqlCreate = [];
		let sqlFKs = [];

		for (let schema of schemas) {
	    	let columns = '';
	    	let schemaObject = schema.schema[schema.schemaName];
	    	for (let columnName in schemaObject) {
	    		if (columnName === 'id') {
	    			continue;
	    		}

	    		let val = schemaObject[columnName];
				let isComputed = Function === val.type;
	    		if (isComputed) {
	    			continue;
	    		}

	    		// Example: foo: { type: String, enum: ['', 'Y', 'N'] },
	    		let notNullStr = val.required ? ' NOT NULL' : '';
	    		let _type = val.type;
	    		let _enum = val.enum;
	    		let _index = val.index;
	    		let _default = val.default;
	    		if (_type) {
	    			val = _type;
	    		}

	    		if (val === Number) {
	    			columns += ', ' + columnName + ' INTEGER' + notNullStr;
	    		} else if (val === String) {
	    			columns += ', ' + columnName + ' TEXT' + notNullStr;
	    		} else if (val === Date) {
	    			columns += ', ' + columnName + ' TIMESTAMP' + notNullStr;
	    		} else if (val === Boolean) {
	    			columns += ', ' + columnName + ' BOOLEAN' + notNullStr;
	    		} else {
	    			// foreign key column
	    			let isArray = val instanceof Array;
	    			if (isArray) {
	    				val = val[0];
	    			}
	    			let otherTable = findSchemaByObject(schemas, val);
	    			columns += ', ' + columnName + ' INTEGER' + notNullStr;


					sqlFKs.push('DO $$BEGIN ' +
						    "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = \\'" + schema.schemaName.toLowerCase() + "_fk\\') THEN " +
						        'ALTER TABLE ' + schema.schemaName + ' ' +
						            'ADD CONSTRAINT ' + schema.schemaName.toLowerCase() + '_fk ' +
						            'FOREIGN KEY (' + columnName + ') REFERENCES ' + otherTable.schemaName + ' (id) ON DELETE CASCADE; ' +
						    'END IF; ' +
						'END; $$;');
	    		}
	     	}
	    	sqlCreate.push('CREATE TABLE IF NOT EXISTS ' + schema.schemaName + ' (id SERIAL PRIMARY KEY ' + columns + ');');
	    }

	    let code = `"use strict";
const pg = require('pg'),
	configuration = require('./configuration.json'),
	url = configuration.dbConnectString;

// create tables
let sql = '` + sqlCreate.join('\';\nsql += \'') + `';

// create foreign keys
sql += '` + sqlFKs.join('\';\nsql += \'') + `';

function createTables() {
	pg.connect(url, function(err, client, done) {
		if (err) {
			if ('database "${dbName}" does not exist' === err.message) {
				createDb();
				return;
			}
			console.error(err);
			return;
		}

	    let query = client.query(sql, []);

	    query.on('end', () => {
	        console.log('${dbName} Db tables created');
	        done();
	        process.exit(0);
	    });

	    query.on('error', err => {
	    	console.error(err);
	        done(err);
	        process.exit(0);
	    });
	});
}

function createDb() {
	let sqlDbCreate = 'CREATE DATABASE ' + configuration.dbName + ';';
	pg.connect(configuration.dbCreateDbConnectString, function(err, client, done) {
	    let query = client.query(sqlDbCreate, []);

	    query.on('end', () => {
	        console.log('${dbName} Db created');
	        createTables();
	    });

	    query.on('error', err => {
	    	console.error(err);
	        done(err);
	        process.exit(0);
	    });
	});	
}

createTables();`;

    	return code;
	}

	/*
	 * generate: Generates the DAL methods
	 */
	generate(dbConnectString, schemaName, schema, schemas) {
		let cfsInfo = getComputedFieldsInfo(schemas, schema, schemaName);

		let sqlCFDalFinds = '';
		for (let cfColumnName in cfsInfo) {
			let cfCol = cfsInfo[cfColumnName];
			if (cfCol.get) {
				sqlCFDalFinds += '\t\tresults = results.map(r => {\n' +
					'\t\t\tr.get = ' + cfCol.get.toString() + ';\n' +
					'\t\t\tr.' + cfColumnName + ' = r.get();\n' +
					'\t\t\treturn r;\n' +
					'\t\t});\n';
			}
		}

		let fksInfo = getForeignKeysInfo(schemas, schema, schemaName);

		let sqlFKDalDeclsFK = '';
		let sqlFKDalInserts = '', sqlFKDalUpdates = '';
		let sqlFKDalFinds = '';
		let hasFKs = false;

		let countFKs = 0;
		for (let fkColumnName in fksInfo) {
			countFKs++;
		}

		let sqlFKDalInsertsPromises = '\t\treturn Promise.all([';
		let sqlFKDalInsertsThen = '\n\t\t.then(retArr => {';

		let sqlFKDalUpdatesPromises = '\t\treturn Promise.all([';
		let sqlFKDalUpdatesThen = '\n\t\t.then(retArr => {';

		let sqlFKDalFindsPromises = '\t\treturn Promise.all([';
		let sqlFKDalFindsThen = '\n\t\t.then(retArr => {';

		let fkIndex = 0;
		for (let fkColumnName in fksInfo) {
			hasFKs = true;
			let isArray = fksInfo[fkColumnName].isArray; // true is 1 to many; false is 1 to 1
			let otherTable = fksInfo[fkColumnName].otherTable;
			let fkTableName = otherTable.schemaName;

			sqlFKDalDeclsFK += 'const fkDAL_' + fkTableName + ' = require(\'./' + fkTableName + '\');\n';

			sqlFKDalInsertsPromises += '\n\t\t\tfkDAL_' + fkTableName + '.insert(record[\'' + fkColumnName + '\'])';
			if (fkIndex < countFKs - 1) {
				sqlFKDalInsertsPromises += ',';
			} else {
				sqlFKDalInsertsPromises += '\n\t\t])';
			}

			sqlFKDalInsertsThen += '\n\t\t\trecord[\'' + fkColumnName + '\'] = retArr[' + fkIndex + '].id;';


			sqlFKDalUpdatesPromises += '\n\t\t\tfkDAL_' + fkTableName + '.update(setObj[\'' + fkColumnName + '\'])';
			if (fkIndex < countFKs - 1) {
				sqlFKDalUpdatesPromises += ',';
			} else {
				sqlFKDalUpdatesPromises += '\n\t\t])';
			}

			if (isArray) {
				// 1 to many!
				sqlFKDalUpdatesThen += '\n\t\t\tsetObj[\'' + fkColumnName + '\'] = retArr[' + fkIndex + '].id;';
			} else {
				// 1 to 1!
				sqlFKDalUpdatesThen += '\n\t\t\tsetObj[\'' + fkColumnName + '\'] = retArr[' + fkIndex + '][0].id;';
			}


			sqlFKDalFindsPromises += '\n\t\t\tfkDAL_' + fkTableName + '.find({ id: record[\'' + fkColumnName + '\'] })';
			if (fkIndex < countFKs - 1) {
				sqlFKDalFindsPromises += ',';
			} else {
				sqlFKDalFindsPromises += '\n\t\t])';
			}

			if (isArray) {
				// 1 to many!
				sqlFKDalFindsThen += '\n\t\t\trecord[\'' + fkColumnName + '\'] = retArr[' + fkIndex + '];';
			} else {
				// 1 to 1!
				sqlFKDalFindsThen += '\n\t\t\trecord[\'' + fkColumnName + '\'] = retArr[' + fkIndex + '][0];';
			}

			fkIndex++;
		}

		if (hasFKs) {
			sqlFKDalInserts = sqlFKDalInsertsPromises + sqlFKDalInsertsThen + '\n\t\t\tresolve(record);\n';
			sqlFKDalInserts += '\t\t});\n';

			sqlFKDalUpdates = sqlFKDalUpdatesPromises + sqlFKDalUpdatesThen + '\n\t\t\tresolve(setObj);\n';
			sqlFKDalUpdates += '\t\t});\n';

			sqlFKDalFinds = sqlFKDalFindsPromises + sqlFKDalFindsThen + '\n\t\t\tresolve(record);\n';
			sqlFKDalFinds += '\t\t});\n';
		} else {
			sqlFKDalInserts = '\t\tresolve(record);\n';
			sqlFKDalUpdates = '\t\tresolve(setObj);\n';
			sqlFKDalFinds = '\t\tresolve(record);\n';
		}

		let sqlInsertFK = 'function insertFKs(record) {\n' +
			'\treturn new Promise(function(resolve, reject) {\n' +
			sqlFKDalInserts +
			'\t});\n' +
			'}\n';

		let sqlUpdateFK = 'function updateFKs(setObj) {\n' +
			'\treturn new Promise(function(resolve, reject) {\n' +
			sqlFKDalUpdates +
			'\t});\n' +
			'}\n';
		
		let sqlFindFK = 'function findFKs(record) {\n' +
			'\treturn new Promise(function(resolve, reject) {\n' +
			sqlFKDalFinds +
			'\t});\n' +
			'}\n';

		let code = `"use strict";
const configuration = require('../configuration.json');
${sqlFKDalDeclsFK}
${sqlInsertFK}
${sqlUpdateFK}
${sqlFindFK}
// DAL for ${schemaName}
const pg = require('pg'),
	tableName = '${schemaName}',
	url = configuration.dbConnectString;


module.exports = {
    // Gets info about the DAL
    info: function () {
    	return {
    		dal: 'node-postgres',
    		tableName: tableName
    	};
    },

	nonQuery: function (sql, params) {
    	return new Promise(function(resolve, reject) {
    		pg.connect(url, function(err, client, done) {
		        client.query(sql, params, (err, result) => {
		        	if (err) {
		        		reject(err);
		        		done();
		        		return;
		        	}

		        	resolve(result.rows[0]);
	        		done();
		        });
	    	});
		});
	},

    // Resolves to an array of ${schemaName} objects
    findAll: function () {
    	return this.find({});
    },

    // Resolves to an array of ${schemaName} objects
    find: function (whereObj) {
        let where = '';
        let paramNumber = 1;
        let params = [];
        for (let key in whereObj) {
        	if (where.length < 1) {
        		where += 'WHERE ';
        	} else {
        		where += 'AND ';
        	}
        	where += key + ' = $' + paramNumber;
        	params.push(whereObj[key]);
        	paramNumber++;
        }

        let sql = 'SELECT * FROM ' + tableName + ' ' + where;
        let results = [];

    	return new Promise(function(resolve, reject) {
    		pg.connect(url, function(err, client, done) {
		        let query = client.query(sql, params);

		        // Stream results back one row at a time
		        query.on('row', row => {
		            results.push(row);
		        });

		        query.on('end', () => {
		            done();

		            let promisesArr = [];
		            results.forEach(r => promisesArr.push(findFKs(r)));
		            Promise.all(promisesArr)
		            	.then(_results => {
		            		${sqlCFDalFinds}
		            		resolve(results);
		            	});
		        });

		        query.on('error', err => {
		        	reject(err);
		        });
	    	});
    	});
    },

    insert: function (record) {
    	return insertFKs(record)
    		.then(fkResults => {
		    	let columns = '';
		    	let values = '';
		        let paramNumber = 1;
		        let params = [];
		    	for (let columnName in record) {
		    		if (columnName !== 'id') {
		    			if (columns.length > 0) {
		    				columns += ', ';
		    				values += ', ';
		    			}
		    			columns += columnName;
		    			values += '$' + paramNumber;
		            	params.push(record[columnName]);
		            	paramNumber++;
		    		}
		    	}

		    	let sql = 'INSERT INTO ' + tableName + ' (' + columns + ') VALUES (' + values + ') RETURNING id';
		    	return this.nonQuery(sql, params);
		    })
		    .then(ret => {
				record.id = ret.id;
				return Promise.resolve(record);
			});
    },

    update: function (whereObj, setObj) {
    	return updateFKs(setObj)
    		.then(fkResults => {
		    	let set = '';
		        let where = '';
		        let paramNumber = 1;
		        let params = [];
		        for (let key in whereObj) {
		        	if (where.length < 1) {
		        		where += 'WHERE ';
		        	} else {
		        		where += 'AND ';
		        	}
		        	where += key + ' = $' + paramNumber;
		        	params.push(whereObj[key]);
		        	paramNumber++;
		        }

		        for (let key in setObj) {
		        	if (key !== 'id') { // prevent modification of the PK!
			        	if (set.length > 0) {
			        		set += ', ';
			        	}
			        	set += key + ' = $' + paramNumber;
			        	params.push(setObj[key]);
			        	paramNumber++;
			        }
		        }

		        let sql = 'UPDATE ' + tableName + ' SET ' + set + ' ' + where;
		    	return this.nonQuery(sql, params);
		    })
		    .then(ret => {
				return this.find(whereObj);
			});
    },

    removeAll: function () {
    	return this.remove({});
    },

    remove: function (whereObj) {
        let where = '';
        let paramNumber = 1;
        let params = [];
        for (let key in whereObj) {
        	if (where.length < 1) {
        		where += 'WHERE ';
        	} else {
        		where += 'AND ';
        	}
        	where += key + ' = $' + paramNumber;
        	params.push(whereObj[key]);
        	paramNumber++;
        }

        let sql = 'DELETE FROM ' + tableName + ' ' + where;
    	return this.nonQuery(sql, params);
    }
};`;
		return code;
	}
};