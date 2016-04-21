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
// whose property values are the other tables (where otherTable.schemaName is the FK table name)
function getForeignKeysInfo(schemas, schema, schemaName) {
	let fkInfos = {};
	let schemaObject = schema[schemaName];
	for (let columnName in schemaObject) {
		if (columnName === 'id') {
			continue;
		}

		let val = schemaObject[columnName];
		if (val === Number || val === String || val === Date || val === Boolean) {
			continue;
		} else {
			// foreign key column
			let otherTable = findSchemaByObject(schemas, val);
			fkInfos[columnName] = otherTable;
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
	    		if (val === Number) {
	    			columns += ', ' + columnName + ' INTEGER';
	    		} else if (val === String) {
	    			columns += ', ' + columnName + ' TEXT';
	    		} else if (val === Date) {
	    			columns += ', ' + columnName + ' TIMESTAMP';
	    		} else if (val === Boolean) {
	    			columns += ', ' + columnName + ' BOOLEAN';
	    		} else {
	    			// foreign key column
	    			let otherTable = findSchemaByObject(schemas, val);
	    			columns += ', ' + columnName + ' INTEGER';


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

		let sqlFKDalDeclsInsertFK = '';
		let sqlFKDalInserts = '';
		let hasFKs = false;
		for (let fkColumnName in fksInfo) {
			hasFKs = true;
			let otherTable = fksInfo[fkColumnName];
			let fkTableName = otherTable.schemaName;

			sqlFKDalDeclsInsertFK += '\tconst fkDAL_' + fkTableName + ' = require(\'./' + fkTableName + '\');\n';

			if (sqlFKDalInserts.length > 0) {
				sqlFKDalInserts += '\t\t});\n';
			}
			sqlFKDalInserts += '\t\treturn fkDAL_' + fkTableName + '.insert(record[\'' + fkColumnName + '\'])\n' +
				'\t\t\t.then(ret => {\n' +
				'\t\t\t\tconsole.log("[After FK call] ret = ",ret);\n' +
				'\t\t\t\trecord[\'' + fkColumnName + '\'] = ret.id;\n';
		}

		sqlFKDalInserts += '\t\t\t\tresolve(record);\n';
		if (hasFKs) {
			sqlFKDalInserts += '\t\t\t});\n';
		}

		let sqlInsertFK = 'function insertFKs(record) {\n' +
			sqlFKDalDeclsInsertFK +
			'\treturn new Promise(function(resolve, reject) {\n' +
			sqlFKDalInserts +
			'\t});\n' +
			'}\n';

		let code = `"use strict";
${sqlInsertFK}
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
		            resolve(results);
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
        	if (set.length > 0) {
        		set += ', ';
        	}
        	set += key + ' = $' + paramNumber;
        	params.push(whereObj[key]);
        	paramNumber++;
        }

        let sql = 'UPDATE ' + tableName + ' SET ' + set + ' ' + where;
    	return this.nonQuery(sql, params);
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