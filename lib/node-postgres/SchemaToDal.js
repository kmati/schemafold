/*
 * This module is the DAL generator for a schema
 */
export class SchemaToDal {
	createTables(dbConnectString, schemas) {
		let dbCreateDbConnectString;
		let dbName;
		let loc = dbConnectString.lastIndexOf('/');
		if (loc > -1) {
			dbCreateDbConnectString = dbConnectString.substr(0, loc) + '/postgres';
			dbName = dbConnectString.substr(loc + 1);
		}

		function findSchemaByObject(schemaObj) {
			return schemas.find(s => {
				console.log('=> s.schema[s.schemaName] = ',s.schema[s.schemaName]);
				return s.schema[s.schemaName] === schemaObj;
			});
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
	    			let otherTable = findSchemaByObject(val);
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

	generate(dbConnectString, schemaName, schema, schemas) {
		let code = `"use strict";
// DAL for ${schemaName}
const pg = require('pg'),
	tableName = '${schemaName}',
	url = '${dbConnectString}';

module.exports = {
	nonQuery: function (sql, params) {
    	return new Promise(function(resolve, reject) {
    		pg.connect(url, function(err, client, done) {
		        let query = client.query(sql, params);

		        query.on('end', () => {
		            done();
		            resolve();
		        });

		        query.on('error', err => {
		        	reject(err);
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
		            resolve(results);
		        });

		        query.on('error', err => {
		        	reject(err);
		        });
	    	});
    	});
    },

    insert: function (record) {
    	let columns = '';
        let paramNumber = 1;
        let params = [];
    	for (let columnName in record) {
    		if (columnName === 'id') {
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

    	let sql = 'INSERT INTO ' + tableName + ' (' + columns + ') VALUES (' + values + ')';
    	return this.nonQuery(sql, params);
    },

    update: function (whereObj, setObj) {
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