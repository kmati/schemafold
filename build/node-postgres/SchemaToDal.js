'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*
 * This module is the DAL generator for a schema
 */
function findSchemaByObject(schemas, schemaObj) {
	return schemas.find(function (s) {
		return s.schema[s.schemaName] === schemaObj;
	});
}

// Returns an object whose property names are the FK column names of the table and
// whose property values are objects with 2 props:
// - isArray (boolean): true means the primary record can have many foreign key records
// - otherTable = the other tables (where otherTable.schemaName is the FK table name)
function getForeignKeysInfo(schemas, schema, schemaName) {
	var fkInfos = {};
	var schemaObject = schema[schemaName];
	for (var columnName in schemaObject) {
		if (columnName === 'id') {
			continue;
		}

		var val = schemaObject[columnName];
		var isComputed = Function === val.type;

		// Example: foo: { type: String, enum: ['', 'Y', 'N'] },
		var notNullStr = val.required ? ' NOT NULL' : '';
		var _type = val.type;
		var _enum = val.enum;
		var _index = val.index;
		var _default = val.default;
		if (_type) {
			val = _type;
		}

		if (val === Number || val === String || val === Date || val === Boolean || isComputed) {
			continue;
		} else {
			// foreign key column
			var isArray = val instanceof Array;
			if (isArray) {
				val = val[0];
			}
			var otherTable = findSchemaByObject(schemas, val);
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
	var cfInfos = {};
	var schemaObject = schema[schemaName];
	for (var columnName in schemaObject) {
		if (columnName === 'id') {
			continue;
		}

		var val = schemaObject[columnName];
		var isComputed = Function === val.type;

		if (isComputed) {
			// computed field column
			cfInfos[columnName] = {
				get: val.get
			};
		}
	}
	return cfInfos;
}

var SchemaToDal = exports.SchemaToDal = function () {
	function SchemaToDal() {
		_classCallCheck(this, SchemaToDal);
	}

	_createClass(SchemaToDal, [{
		key: 'dropDatabase',

		/*
   * dropDatabase: Drops the database
   */
		value: function dropDatabase(dbConnectString) {
			var code = '"use strict";\nconst configuration = require(\'./configuration.json\'),\n\tpg = require(\'pg\'),\n\turl = configuration.dbConnectString;\n\nlet sqlDbDrop = \'DROP DATABASE \' + configuration.dbName + \';\';\n\npg.connect(configuration.dbCreateDbConnectString, function(err, client, done) {\n\tlet query = client.query(sqlDbDrop, []);\n\n\tquery.on(\'end\', () => {\n\t    console.log(configuration.dbName + \' Db dropped\');\n        done();\n        process.exit(0);\n\t});\n\n\tquery.on(\'error\', err => {\n\t\tconsole.error(err);\n\t    done(err);\n\t    process.exit(0);\n\t});\n});';

			return code;
		}

		/*
   * createTables: Creates the db tables
   */

	}, {
		key: 'createTables',
		value: function createTables(dbConnectString, schemas) {
			var dbCreateDbConnectString = void 0;
			var dbName = void 0;
			var loc = dbConnectString.lastIndexOf('/');
			if (loc > -1) {
				dbCreateDbConnectString = dbConnectString.substr(0, loc) + '/postgres';
				dbName = dbConnectString.substr(loc + 1);
			}

			var sqlCreate = [];
			var sqlFKs = [];

			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = schemas[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var schema = _step.value;

					var columns = '';
					var schemaObject = schema.schema[schema.schemaName];
					for (var columnName in schemaObject) {
						if (columnName === 'id') {
							continue;
						}

						var val = schemaObject[columnName];
						var isComputed = Function === val.type;
						if (isComputed) {
							continue;
						}

						// Example: foo: { type: String, enum: ['', 'Y', 'N'] },
						var notNullStr = val.required ? ' NOT NULL' : '';
						var _type = val.type;
						var _enum = val.enum;
						var _index = val.index;
						var _default = val.default;
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
							var isArray = val instanceof Array;
							if (isArray) {
								val = val[0];
							}
							var otherTable = findSchemaByObject(schemas, val);
							columns += ', ' + columnName + ' INTEGER' + notNullStr;

							sqlFKs.push('DO $$BEGIN ' + "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = \\'" + schema.schemaName.toLowerCase() + "_fk\\') THEN " + 'ALTER TABLE ' + schema.schemaName + ' ' + 'ADD CONSTRAINT ' + schema.schemaName.toLowerCase() + '_fk ' + 'FOREIGN KEY (' + columnName + ') REFERENCES ' + otherTable.schemaName + ' (id) ON DELETE CASCADE; ' + 'END IF; ' + 'END; $$;');
						}
					}
					sqlCreate.push('CREATE TABLE IF NOT EXISTS ' + schema.schemaName + ' (id SERIAL PRIMARY KEY ' + columns + ');');
				}
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion && _iterator.return) {
						_iterator.return();
					}
				} finally {
					if (_didIteratorError) {
						throw _iteratorError;
					}
				}
			}

			var code = '"use strict";\nconst pg = require(\'pg\'),\n\tconfiguration = require(\'./configuration.json\'),\n\turl = configuration.dbConnectString;\n\n// create tables\nlet sql = \'' + sqlCreate.join('\';\nsql += \'') + '\';\n\n// create foreign keys\nsql += \'' + sqlFKs.join('\';\nsql += \'') + ('\';\n\nfunction createTables() {\n\tpg.connect(url, function(err, client, done) {\n\t\tif (err) {\n\t\t\tif (\'database "' + dbName + '" does not exist\' === err.message) {\n\t\t\t\tcreateDb();\n\t\t\t\treturn;\n\t\t\t}\n\t\t\tconsole.error(err);\n\t\t\treturn;\n\t\t}\n\n\t    let query = client.query(sql, []);\n\n\t    query.on(\'end\', () => {\n\t        console.log(\'' + dbName + ' Db tables created\');\n\t        done();\n\t        process.exit(0);\n\t    });\n\n\t    query.on(\'error\', err => {\n\t    \tconsole.error(err);\n\t        done(err);\n\t        process.exit(0);\n\t    });\n\t});\n}\n\nfunction createDb() {\n\tlet sqlDbCreate = \'CREATE DATABASE \' + configuration.dbName + \';\';\n\tpg.connect(configuration.dbCreateDbConnectString, function(err, client, done) {\n\t    let query = client.query(sqlDbCreate, []);\n\n\t    query.on(\'end\', () => {\n\t        console.log(\'' + dbName + ' Db created\');\n\t        createTables();\n\t    });\n\n\t    query.on(\'error\', err => {\n\t    \tconsole.error(err);\n\t        done(err);\n\t        process.exit(0);\n\t    });\n\t});\t\n}\n\ncreateTables();');

			return code;
		}

		/*
   * generate: Generates the DAL methods
   */

	}, {
		key: 'generate',
		value: function generate(dbConnectString, schemaName, schema, schemas) {
			var cfsInfo = getComputedFieldsInfo(schemas, schema, schemaName);

			var sqlCFDalFinds = '';
			for (var cfColumnName in cfsInfo) {
				var cfCol = cfsInfo[cfColumnName];
				if (cfCol.get) {
					sqlCFDalFinds += '\t\tresults = results.map(r => {\n' + '\t\t\tr.get = ' + cfCol.get.toString() + ';\n' + '\t\t\tr.' + cfColumnName + ' = r.get();\n' + '\t\t\treturn r;\n' + '\t\t});\n';
				}
			}

			var fksInfo = getForeignKeysInfo(schemas, schema, schemaName);

			var sqlFKDalDeclsFK = '';
			var sqlFKDalInserts = '',
			    sqlFKDalUpdates = '';
			var sqlFKDalFinds = '';
			var hasFKs = false;

			var countFKs = 0;
			for (var fkColumnName in fksInfo) {
				countFKs++;
			}

			var sqlFKDalInsertsPromises = '\t\treturn Promise.all([';
			var sqlFKDalInsertsThen = '\n\t\t.then(retArr => {';

			var sqlFKDalUpdatesPromises = '\t\treturn Promise.all([';
			var sqlFKDalUpdatesThen = '\n\t\t.then(retArr => {';

			var sqlFKDalFindsPromises = '\t\treturn Promise.all([';
			var sqlFKDalFindsThen = '\n\t\t.then(retArr => {';

			var fkIndex = 0;
			for (var _fkColumnName in fksInfo) {
				hasFKs = true;
				var isArray = fksInfo[_fkColumnName].isArray; // true is 1 to many; false is 1 to 1
				var otherTable = fksInfo[_fkColumnName].otherTable;
				var fkTableName = otherTable.schemaName;

				sqlFKDalDeclsFK += 'const fkDAL_' + fkTableName + ' = require(\'./' + fkTableName + '\');\n';

				sqlFKDalInsertsPromises += '\n\t\t\tfkDAL_' + fkTableName + '.insert(record[\'' + _fkColumnName + '\'])';
				if (fkIndex < countFKs - 1) {
					sqlFKDalInsertsPromises += ',';
				} else {
					sqlFKDalInsertsPromises += '\n\t\t])';
				}

				sqlFKDalInsertsThen += '\n\t\t\trecord[\'' + _fkColumnName + '\'] = retArr[' + fkIndex + '].id;';

				sqlFKDalUpdatesPromises += '\n\t\t\tfkDAL_' + fkTableName + '.update(setObj[\'' + _fkColumnName + '\'])';
				if (fkIndex < countFKs - 1) {
					sqlFKDalUpdatesPromises += ',';
				} else {
					sqlFKDalUpdatesPromises += '\n\t\t])';
				}

				if (isArray) {
					// 1 to many!
					sqlFKDalUpdatesThen += '\n\t\t\tsetObj[\'' + _fkColumnName + '\'] = retArr[' + fkIndex + '].id;';
				} else {
					// 1 to 1!
					sqlFKDalUpdatesThen += '\n\t\t\tsetObj[\'' + _fkColumnName + '\'] = retArr[' + fkIndex + '][0].id;';
				}

				sqlFKDalFindsPromises += '\n\t\t\tfkDAL_' + fkTableName + '.find({ id: record[\'' + _fkColumnName + '\'] })';
				if (fkIndex < countFKs - 1) {
					sqlFKDalFindsPromises += ',';
				} else {
					sqlFKDalFindsPromises += '\n\t\t])';
				}

				if (isArray) {
					// 1 to many!
					sqlFKDalFindsThen += '\n\t\t\trecord[\'' + _fkColumnName + '\'] = retArr[' + fkIndex + '];';
				} else {
					// 1 to 1!
					sqlFKDalFindsThen += '\n\t\t\trecord[\'' + _fkColumnName + '\'] = retArr[' + fkIndex + '][0];';
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

			var sqlInsertFK = 'function insertFKs(record) {\n' + '\treturn new Promise(function(resolve, reject) {\n' + sqlFKDalInserts + '\t});\n' + '}\n';

			var sqlUpdateFK = 'function updateFKs(setObj) {\n' + '\treturn new Promise(function(resolve, reject) {\n' + sqlFKDalUpdates + '\t});\n' + '}\n';

			var sqlFindFK = 'function findFKs(record) {\n' + '\treturn new Promise(function(resolve, reject) {\n' + sqlFKDalFinds + '\t});\n' + '}\n';

			var code = '"use strict";\nconst configuration = require(\'../configuration.json\');\n' + sqlFKDalDeclsFK + '\n' + sqlInsertFK + '\n' + sqlUpdateFK + '\n' + sqlFindFK + '\n// DAL for ' + schemaName + '\nconst pg = require(\'pg\'),\n\ttableName = \'' + schemaName + '\',\n\turl = configuration.dbConnectString;\n\n\nmodule.exports = {\n    // Gets info about the DAL\n    info: function () {\n    \treturn {\n    \t\tdal: \'node-postgres\',\n    \t\ttableName: tableName\n    \t};\n    },\n\n\tnonQuery: function (sql, params) {\n    \treturn new Promise(function(resolve, reject) {\n    \t\tpg.connect(url, function(err, client, done) {\n\t\t        client.query(sql, params, (err, result) => {\n\t\t        \tif (err) {\n\t\t        \t\treject(err);\n\t\t        \t\tdone();\n\t\t        \t\treturn;\n\t\t        \t}\n\n\t\t        \tresolve(result.rows[0]);\n\t        \t\tdone();\n\t\t        });\n\t    \t});\n\t\t});\n\t},\n\n    // Resolves to an array of ' + schemaName + ' objects\n    findAll: function () {\n    \treturn this.find({});\n    },\n\n    // Resolves to an array of ' + schemaName + ' objects\n    find: function (whereObj) {\n        let where = \'\';\n        let paramNumber = 1;\n        let params = [];\n        for (let key in whereObj) {\n        \tif (where.length < 1) {\n        \t\twhere += \'WHERE \';\n        \t} else {\n        \t\twhere += \'AND \';\n        \t}\n        \twhere += key + \' = $\' + paramNumber;\n        \tparams.push(whereObj[key]);\n        \tparamNumber++;\n        }\n\n        let sql = \'SELECT * FROM \' + tableName + \' \' + where;\n        let results = [];\n\n    \treturn new Promise(function(resolve, reject) {\n    \t\tpg.connect(url, function(err, client, done) {\n\t\t        let query = client.query(sql, params);\n\n\t\t        // Stream results back one row at a time\n\t\t        query.on(\'row\', row => {\n\t\t            results.push(row);\n\t\t        });\n\n\t\t        query.on(\'end\', () => {\n\t\t            done();\n\n\t\t            let promisesArr = [];\n\t\t            results.forEach(r => promisesArr.push(findFKs(r)));\n\t\t            Promise.all(promisesArr)\n\t\t            \t.then(_results => {\n\t\t            \t\t' + sqlCFDalFinds + '\n\t\t            \t\tresolve(results);\n\t\t            \t});\n\t\t        });\n\n\t\t        query.on(\'error\', err => {\n\t\t        \treject(err);\n\t\t        });\n\t    \t});\n    \t});\n    },\n\n    insert: function (record) {\n    \treturn insertFKs(record)\n    \t\t.then(fkResults => {\n\t\t    \tlet columns = \'\';\n\t\t    \tlet values = \'\';\n\t\t        let paramNumber = 1;\n\t\t        let params = [];\n\t\t    \tfor (let columnName in record) {\n\t\t    \t\tif (columnName !== \'id\') {\n\t\t    \t\t\tif (columns.length > 0) {\n\t\t    \t\t\t\tcolumns += \', \';\n\t\t    \t\t\t\tvalues += \', \';\n\t\t    \t\t\t}\n\t\t    \t\t\tcolumns += columnName;\n\t\t    \t\t\tvalues += \'$\' + paramNumber;\n\t\t            \tparams.push(record[columnName]);\n\t\t            \tparamNumber++;\n\t\t    \t\t}\n\t\t    \t}\n\n\t\t    \tlet sql = \'INSERT INTO \' + tableName + \' (\' + columns + \') VALUES (\' + values + \') RETURNING id\';\n\t\t    \treturn this.nonQuery(sql, params);\n\t\t    })\n\t\t    .then(ret => {\n\t\t\t\trecord.id = ret.id;\n\t\t\t\treturn Promise.resolve(record);\n\t\t\t});\n    },\n\n    update: function (whereObj, setObj) {\n    \treturn updateFKs(setObj)\n    \t\t.then(fkResults => {\n\t\t    \tlet set = \'\';\n\t\t        let where = \'\';\n\t\t        let paramNumber = 1;\n\t\t        let params = [];\n\t\t        for (let key in whereObj) {\n\t\t        \tif (where.length < 1) {\n\t\t        \t\twhere += \'WHERE \';\n\t\t        \t} else {\n\t\t        \t\twhere += \'AND \';\n\t\t        \t}\n\t\t        \twhere += key + \' = $\' + paramNumber;\n\t\t        \tparams.push(whereObj[key]);\n\t\t        \tparamNumber++;\n\t\t        }\n\n\t\t        for (let key in setObj) {\n\t\t        \tif (key !== \'id\') { // prevent modification of the PK!\n\t\t\t        \tif (set.length > 0) {\n\t\t\t        \t\tset += \', \';\n\t\t\t        \t}\n\t\t\t        \tset += key + \' = $\' + paramNumber;\n\t\t\t        \tparams.push(setObj[key]);\n\t\t\t        \tparamNumber++;\n\t\t\t        }\n\t\t        }\n\n\t\t        let sql = \'UPDATE \' + tableName + \' SET \' + set + \' \' + where;\n\t\t    \treturn this.nonQuery(sql, params);\n\t\t    })\n\t\t    .then(ret => {\n\t\t\t\treturn this.find(whereObj);\n\t\t\t});\n    },\n\n    removeAll: function () {\n    \treturn this.remove({});\n    },\n\n    remove: function (whereObj) {\n        let where = \'\';\n        let paramNumber = 1;\n        let params = [];\n        for (let key in whereObj) {\n        \tif (where.length < 1) {\n        \t\twhere += \'WHERE \';\n        \t} else {\n        \t\twhere += \'AND \';\n        \t}\n        \twhere += key + \' = $\' + paramNumber;\n        \tparams.push(whereObj[key]);\n        \tparamNumber++;\n        }\n\n        let sql = \'DELETE FROM \' + tableName + \' \' + where;\n    \treturn this.nonQuery(sql, params);\n    }\n};';
			return code;
		}
	}]);

	return SchemaToDal;
}();

;