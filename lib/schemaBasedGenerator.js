/*
 * This is the entry point for the schema-based generators.
 */
import { SchemaLoader } from './SchemaLoader';
import { SeedDataLoader } from './SeedDataLoader';
import fs from 'fs';
import path from 'path';

// Recursively create a directory if it does not exist
// dir : The directory to create
// callback : void function (err, isCreated)
function mkdirp(dir, callback) {
    fs.exists(dir, exists => {
        if (exists) {
            callback(null, false);
            return;
        }
        
        let startsWithDoubleSlash = false,
            startsWithSingleSlash = false;
        if (dir.length >= 2) {
            if (dir.substr(0, 2) === path.sep + path.sep) {
                startsWithDoubleSlash = true;
            }
        } else if (dir.length >= 1) {
            if (dir[0] === path.sep) {
                startsWithSingleSlash = true;
            }
        }
        
        let pieces = dir.split(path.sep);
        for (let p = 0; p < pieces.length; p++) {
            let thePath = pieces.slice(0, 1 + p).join(path.sep);
            if (startsWithDoubleSlash) {
                thePath = path.sep + path.sep + thePath;
            } else if (startsWithSingleSlash) {
                thePath = path.sep + thePath;
            }
            if (thePath.length > 0 && !fs.existsSync(thePath)) {
                for (let q = p; q < pieces.length; q++) {
                    thePath = pieces.slice(0, 1 + q).join(path.sep);
                    if (startsWithDoubleSlash) {
                        thePath = path.sep + path.sep + thePath;
                    } else if (startsWithSingleSlash) {
                        thePath = path.sep + thePath;
                    }
                    try {
                        fs.mkdirSync(thePath);
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
function sequence(arr, fnEach, callback) {
	let index = 0;
	function onDone() {
		let item = arr[index];
		fnEach(item, err => {
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
	sequence(dirPaths, (dir, done) => {
		fs.exists(dir, dirExists => {
			if (!dirExists) {
				mkdirp(dir, (err, isCreated) => {
					if (err) {
						done(err);
						return;
					}
					done();
				})
				return;
			}
			done();
		});
	}, callback);
}

export const schemaBasedGenerator = {
	// opts: An object that has the following properties:
	//  - versionNumber: The version number for the API
	//	- api: 'express' or other api choice
	//	- dal: 'node-mongodb', 'node-postgres' or other dal choice
	//  - dbConnectString: The connection string for the database (mongo, postgres, etc.)
	//	- schemas: An object whose property names are Entity names and
	//		the values are paths to the schema files OR the schema objects
	// 	- seedData: An object whose property names are Entity names and
	//		the values are paths to the seed-data files OR the seed-data arrays
	// 	- outdir: The output directory's structure may vary. For example, this is what the output will look like for
	//		api = express and dal = node-mongodb or node-postgres:
	//		outdir/
	//			index.js
	//			app.js
	//			outputApis
	//			dal/
	//				outputDALs
	// callback: void function (err)
	generate: function (opts, callback) {
		let SchemaToApi = require(`./${opts.api}/SchemaToApi`).SchemaToApi,
			SchemaToDal = require(`./${opts.dal}/SchemaToDal`).SchemaToDal,
			SeedDataCodeGen = require('./SeedDataCodeGen').SeedDataCodeGen,
			schemaLoader = new SchemaLoader(opts.schemas),
			seedDataLoader = new SeedDataLoader(opts.seedData);

		let dalDir = path.join(opts.outdir, 'dal');

		function processGeneralResources(onProcessingDone) {
			let GeneralApiResources = require(`./${opts.api}/GeneralApiResources`).GeneralApiResources;
			let generalApiResources = new GeneralApiResources();
			let resourcesArr = generalApiResources.generate(`Number(${opts.port})`, schemaLoader.schemas);
			sequence(resourcesArr, (resource, done) => {
				fs.writeFile(path.join(opts.outdir, resource.file), resource.code, done);
			}, onProcessingDone);
		}

		function processConfiguration(onProcessingDone) {
			let dbCreateDbConnectString;
			let dbName;
			let loc = opts.dbConnectString.lastIndexOf('/');
			if (loc > -1) {
				dbCreateDbConnectString = opts.dbConnectString.substr(0, loc) + '/postgres';
				dbName = opts.dbConnectString.substr(loc + 1);
			}

			let config = {
				versionNumber: opts.versionNumber,
				dbConnectString: opts.dbConnectString,
				dbCreateDbConnectString: dbCreateDbConnectString,
				dbName: dbName
			};
			fs.writeFile(path.join(opts.outdir, 'configuration.json'), JSON.stringify(config, undefined, 2), onProcessingDone);
		}

		function processDropDbScript(onProcessingDone) {
			let schemaToDal = new SchemaToDal();
			if (schemaToDal.dropDatabase) {
				let code = schemaToDal.dropDatabase(opts.dbConnectString);
				fs.writeFile(path.join(opts.outdir, 'drop-db.js'), code, onProcessingDone);
			} else {
				onProcessingDone();
			}
		}

		function processCreateDbScript(onProcessingDone) {
			let schemaToDal = new SchemaToDal();
			if (schemaToDal.createTables) {
				let code = schemaToDal.createTables(opts.dbConnectString, schemaLoader.schemas);
				fs.writeFile(path.join(opts.outdir, 'create-db.js'), code, onProcessingDone);
			} else {
				onProcessingDone();
			}
		}

		function processIndividualSchemas(onProcessingDone) {
			sequence(schemaLoader.schemas, (schema, done) => {
				let schemaToApi = new SchemaToApi();
				let apiCode = schemaToApi.generate(opts.versionNumber, schema.schemaName, schema.schema);

				let schemaToDal = new SchemaToDal();
				let dalCode = schemaToDal.generate(opts.dbConnectString, schema.schemaName, schema.schema, schemaLoader.schemas);

				fs.writeFile(path.join(opts.outdir, schema.schemaName + '.js'), apiCode, err => {
					if (err) {
						done(err);
						return;
					}

					fs.writeFile(path.join(dalDir, schema.schemaName + '.js'), dalCode, done);
				});
			}, onProcessingDone);
		}

		function processSeedDataDbScripts(onProcessingDone) {
			if (seedDataLoader.seedData.length < 1) {
				onProcessingDone();
				return;
			}

			sequence(seedDataLoader.seedData, (seedDataSet, done) => {
				let seedDataCodeGen = new SeedDataCodeGen();
				let biCode = seedDataCodeGen.generate(seedDataSet.schemaName, seedDataSet.data);

				fs.writeFile(path.join(opts.outdir, `bulk-insert-${seedDataSet.schemaName}.js`), biCode, done);
			}, onProcessingDone);
		}

		let commands = [
			done => createDirsIfNotExists([opts.outdir, dalDir], done),
			done => processDropDbScript(done),
			done => processCreateDbScript(done),
			done => processGeneralResources(done),
			done => processConfiguration(done),
			done => processIndividualSchemas(done),
			done => processSeedDataDbScripts(done)
		];
		sequence(commands, (fn, done) => fn(done), callback);
	}
};
