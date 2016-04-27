'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.schemaBasedGenerator = undefined;

var _SchemaLoader = require('./SchemaLoader');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Recursively create a directory if it does not exist
// dir : The directory to create
// callback : void function (err, isCreated)
function mkdirp(dir, callback) {
	_fs2.default.exists(dir, function (exists) {
		if (exists) {
			callback(null, false);
			return;
		}

		var startsWithDoubleSlash = false,
		    startsWithSingleSlash = false;
		if (dir.length >= 2) {
			if (dir.substr(0, 2) === _path2.default.sep + _path2.default.sep) {
				startsWithDoubleSlash = true;
			}
		} else if (dir.length >= 1) {
			if (dir[0] === _path2.default.sep) {
				startsWithSingleSlash = true;
			}
		}

		var pieces = dir.split(_path2.default.sep);
		for (var p = 0; p < pieces.length; p++) {
			var thePath = pieces.slice(0, 1 + p).join(_path2.default.sep);
			if (startsWithDoubleSlash) {
				thePath = _path2.default.sep + _path2.default.sep + thePath;
			} else if (startsWithSingleSlash) {
				thePath = _path2.default.sep + thePath;
			}
			if (thePath.length > 0 && !_fs2.default.existsSync(thePath)) {
				for (var q = p; q < pieces.length; q++) {
					thePath = pieces.slice(0, 1 + q).join(_path2.default.sep);
					if (startsWithDoubleSlash) {
						thePath = _path2.default.sep + _path2.default.sep + thePath;
					} else if (startsWithSingleSlash) {
						thePath = _path2.default.sep + thePath;
					}
					try {
						_fs2.default.mkdirSync(thePath);
					} catch (e) {
						callback(e);
						return;
					}
				}
				break;
			}
		}
		callback(null, true);
	});
}

// Iterates through an array and invokes an asynchronous function on each element
// arr: The array
// fnEach: Invoked on each element of the array. Signature: void function (item, done), where done is void function (err)
// callback: Invoked at the end or if an error occurs. Signature: void function (err)
/*
 * This is the entry point for the schema-based generators.
 */
function sequence(arr, fnEach, callback) {
	var index = 0;
	function onDone() {
		var item = arr[index];
		fnEach(item, function (err) {
			if (err) {
				callback(err);
				return;
			}

			index++;
			if (index < arr.length) {
				onDone();
			} else {
				callback();
			}
		});
	}
	onDone();
}

function createDirsIfNotExists(dirPaths, callback) {
	sequence(dirPaths, function (dir, done) {
		_fs2.default.exists(dir, function (dirExists) {
			if (!dirExists) {
				mkdirp(dir, function (err, isCreated) {
					if (err) {
						done(err);
						return;
					}
					done();
				});
				return;
			}
			done();
		});
	}, callback);
}

var schemaBasedGenerator = exports.schemaBasedGenerator = {
	// opts: An object that has the following properties:
	//  - versionNumber: The version number for the API
	//	- api: 'express' or other api choice
	//	- dal: 'node-mongodb', 'node-postgres' or other dal choice
	//  - dbConnectString: The connection string for the database (mongo, postgres, etc.)
	//	- schemas: An object whose property names are Entity names and
	//		the values are paths to the schema files OR the schema objects
	// 	- outdir: The output directory's structure may vary. For example, this is what the output will look like for
	//		api = express and dal = node-mongodb or node-postgres:
	//		outdir/
	//			index.js
	//			app.js
	//			outputApis
	//			dal/
	//				outputDALs
	// callback: void function (err)
	generate: function generate(opts, callback) {
		var SchemaToApi = require('./' + opts.api + '/SchemaToApi').SchemaToApi,
		    SchemaToDal = require('./' + opts.dal + '/SchemaToDal').SchemaToDal,
		    schemaLoader = new _SchemaLoader.SchemaLoader(opts.schemas);

		var dalDir = _path2.default.join(opts.outdir, 'dal');

		function processGeneralResources(onProcessingDone) {
			var GeneralApiResources = require('./' + opts.api + '/GeneralApiResources').GeneralApiResources;
			var generalApiResources = new GeneralApiResources();
			var resourcesArr = generalApiResources.generate(schemaLoader.schemas);
			sequence(resourcesArr, function (resource, done) {
				_fs2.default.writeFile(_path2.default.join(opts.outdir, resource.file), resource.code, done);
			}, onProcessingDone);
		}

		function processConfiguration(onProcessingDone) {
			var dbCreateDbConnectString = void 0;
			var dbName = void 0;
			var loc = opts.dbConnectString.lastIndexOf('/');
			if (loc > -1) {
				dbCreateDbConnectString = opts.dbConnectString.substr(0, loc) + '/postgres';
				dbName = opts.dbConnectString.substr(loc + 1);
			}

			var config = {
				versionNumber: opts.versionNumber,
				dbConnectString: opts.dbConnectString,
				dbCreateDbConnectString: dbCreateDbConnectString,
				dbName: dbName
			};
			_fs2.default.writeFile(_path2.default.join(opts.outdir, 'configuration.json'), JSON.stringify(config, undefined, 2), onProcessingDone);
		}

		function processDropDbScript(onProcessingDone) {
			var schemaToDal = new SchemaToDal();
			if (schemaToDal.dropDatabase) {
				var code = schemaToDal.dropDatabase(opts.dbConnectString);
				_fs2.default.writeFile(_path2.default.join(opts.outdir, 'drop-db.js'), code, onProcessingDone);
			} else {
				onProcessingDone();
			}
		}

		function processCreateDbScript(onProcessingDone) {
			var schemaToDal = new SchemaToDal();
			if (schemaToDal.createTables) {
				var code = schemaToDal.createTables(opts.dbConnectString, schemaLoader.schemas);
				_fs2.default.writeFile(_path2.default.join(opts.outdir, 'create-db.js'), code, onProcessingDone);
			} else {
				onProcessingDone();
			}
		}

		function processIndividualSchemas(onProcessingDone) {
			sequence(schemaLoader.schemas, function (schema, done) {
				var schemaToApi = new SchemaToApi();
				var apiCode = schemaToApi.generate(opts.versionNumber, schema.schemaName, schema.schema);

				var schemaToDal = new SchemaToDal();
				var dalCode = schemaToDal.generate(opts.dbConnectString, schema.schemaName, schema.schema, schemaLoader.schemas);

				_fs2.default.writeFile(_path2.default.join(opts.outdir, schema.schemaName + '.js'), apiCode, function (err) {
					if (err) {
						done(err);
						return;
					}

					_fs2.default.writeFile(_path2.default.join(dalDir, schema.schemaName + '.js'), dalCode, done);
				});
			}, onProcessingDone);
		}

		var commands = [function (done) {
			return createDirsIfNotExists([opts.outdir, dalDir], done);
		}, function (done) {
			return processDropDbScript(done);
		}, function (done) {
			return processCreateDbScript(done);
		}, function (done) {
			return processGeneralResources(done);
		}, function (done) {
			return processConfiguration(done);
		}, function (done) {
			return processIndividualSchemas(done);
		}];
		sequence(commands, function (fn, done) {
			return fn(done);
		}, callback);
	}
};