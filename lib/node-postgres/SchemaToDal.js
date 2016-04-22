/*
 * This module is the DAL generator for a schema
 */
function findSchemaByObject(schemas, schemaObj) {
	return schemas.find(s => {
		console.log('=> s.schema[s.schemaName] = ',s.schema[s.schemaName]);
		return s.schema[s.schemaName] === schemaObj;
	});
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

		// Example: foo: { type: String, enum: ['', 'Y', 'N'] },
		let notNullStr = val.required ? ' NOT NULL' : '';
		let _type = val.type;
		let _enum = val.enum;
		let _index = val.index;
		let _default = val.default;
		if (_type) {
			val = _type;
		}

		if (val === Number || val === String || val === Date || val === Boolean) {
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

export class SchemaToDal {
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

		let sqlDbCreate = 'CREATE DATABASE ' + dbName + ';';

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
	dbCreateDbConnectString = '${dbCreateDbConnectString}',
	url = '${dbConnectString}';

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
	        console.log('Db tables created');
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
	let sqlDbCreate = "` + sqlDbCreate + `";
	pg.connect(dbCreateDbConnectString, function(err, client, done) {
	    let query = client.query(sqlDbCreate, []);

	    query.on('end', () => {
	        console.log('Db created');
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
		let fksInfo = getForeignKeysInfo(schemas, schema, schemaName);

		let sqlFKDalDeclsFK = '';
		let sqlFKDalInserts = '', sqlFKDalUpdates = '';
		let sqlFKDalFinds = '';
		let hasFKs = false;
		for (let fkColumnName in fksInfo) {
			hasFKs = true;
			let isArray = fksInfo[fkColumnName].isArray; // true is 1 to many; false is 1 to 1
			let otherTable = fksInfo[fkColumnName].otherTable;
			let fkTableName = otherTable.schemaName;

			sqlFKDalDeclsFK += '\tconst fkDAL_' + fkTableName + ' = require(\'./' + fkTableName + '\');\n';

			if (sqlFKDalInserts.length > 0) {
				sqlFKDalInserts += '\t\t});\n';
			}
			sqlFKDalInserts += '\t\treturn fkDAL_' + fkTableName + '.insert(record[\'' + fkColumnName + '\'])\n' +
				'\t\t\t.then(ret => {\n' +
				'\t\t\t\tconsole.log("[After FK call | insert] ret = ",ret);\n' +
				'\t\t\t\trecord[\'' + fkColumnName + '\'] = ret.id;\n';

			if (sqlFKDalUpdates.length > 0) {
				sqlFKDalUpdates += '\t\t});\n';
			}
			sqlFKDalUpdates += '\t\tlet _fkSO = setObj[\'' + fkColumnName + '\'];\n' +
				'\t\tif (!_fkSO) {\n' +
				'\t\t\tresolve(_fkSO);\n' +
				'\t\t\treturn;\n' +
				'\t\t}' +
				'\t\treturn fkDAL_' + fkTableName + '.update({ id: setObj.id }, _fkSO)\n' +
				'\t\t\t.then(ret => {\n' +
				'\t\t\t\tconsole.log("[After FK call | update] ret = ",ret);\n';

			if (sqlFKDalFinds.length > 0) {
				sqlFKDalFinds += '\t\t});\n';
			}
			sqlFKDalFinds += '\t\treturn fkDAL_' + fkTableName + '.find({ id: record[\'' + fkColumnName + '\'] })\n' +
				'\t\t\t.then(ret => {\n' +
				'\t\t\t\tconsole.log("[After FK call | find] ret = ",ret);\n';

			if (isArray) {
				// 1 to many!
				sqlFKDalUpdates +=
					'\t\t\t\tsetObj[\'' + fkColumnName + '\'] = ret.id;\n';

				sqlFKDalFinds +=
					'\t\t\t\trecord[\'' + fkColumnName + '\'] = ret;\n';
			} else {
				// 1 to 1!
				sqlFKDalUpdates +=
					'\t\t\t\tsetObj[\'' + fkColumnName + '\'] = ret[0].id;\n';

				sqlFKDalFinds +=
					'\t\t\t\trecord[\'' + fkColumnName + '\'] = ret[0];\n';
			}
		}

		sqlFKDalInserts += '\t\t\t\tresolve(record);\n';
		if (hasFKs) {
			sqlFKDalInserts += '\t\t\t});\n';
		}

		sqlFKDalUpdates += '\t\t\t\tresolve(setObj);\n';
		if (hasFKs) {
			sqlFKDalUpdates += '\t\t\t});\n';
		}

		sqlFKDalFinds += '\t\t\t\tresolve(record);\n';
		if (hasFKs) {
			sqlFKDalFinds += '\t\t\t});\n';
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
${sqlFKDalDeclsFK}
${sqlInsertFK}
${sqlUpdateFK}
${sqlFindFK}
// DAL for ${schemaName}
const pg = require('pg'),
	tableName = '${schemaName}',
	url = '${dbConnectString}';


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
    	console.log('[${schemaName}.nonQuery] err = ',err);
    	console.log('[${schemaName}.nonQuery] result = ',result);
		        	if (err) {
		        		reject(err);
		        		done();
		        		return;
		        	}

console.log('[${schemaName}.nonQuery] Resolved with result.rows[0] = ',result.rows[0]);
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
console.log('[${schemaName}.find] whereObj = ',whereObj);
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
console.log('sql = ',sql);
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
		            Promise.all(promisesArr).then(resolve);
		        });

		        query.on('error', err => {
		        	reject(err);
		        });
	    	});
    	});
    },

    insert: function (record) {
    	console.log('[${schemaName}.insert] record = ',record);

    	return insertFKs(record)
    		.then(fkResults => {
    			console.log('[${schemaName}.insert | After insertFKs] record = ',record);
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
		    	console.log('[${schemaName}.insert] columns = ' + columns);
		    	console.log('[${schemaName}.insert] values = ' + values);
		    	console.log('[${schemaName}.insert] sql = ' + sql);
		    	return this.nonQuery(sql, params);
		    })
		    .then(ret => {
				record.id = ret.id;
		    	console.log('[${schemaName}.insert] record = ',record);
				return Promise.resolve(record);
			});
    },

    update: function (whereObj, setObj) {
    	console.log('[${schemaName}.update] whereObj = ',whereObj);
    	console.log('[${schemaName}.update] setObj = ',setObj);
    	return updateFKs(setObj)
    		.then(fkResults => {
    	console.log('[${schemaName}.update] fkResults = ',fkResults);
    	console.log('[${schemaName}.update] setObj = ',setObj);
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
    	console.log('[${schemaName}.update] sql = ',sql);
    	console.log('[${schemaName}.update] params = ',params);
		    	return this.nonQuery(sql, params);
		    })
		    .then(ret => {
		    	console.log('[${schemaName}.update] ret = ',ret);
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