/*
 * This is the entry point for the schema-based generators.
 */
import { SchemaLoader } from './SchemaLoader';
import fs from 'fs';
import path from 'path';

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
				fs.mkdir(dir, done);
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
			schemaLoader = new SchemaLoader(opts.schemas);

		let dalDir = path.join(opts.outdir, 'dal');

		function processGeneralResources(onProcessingDone) {
			let GeneralApiResources = require(`./${opts.api}/GeneralApiResources`).GeneralApiResources;
			let generalApiResources = new GeneralApiResources();
			let resourcesArr = generalApiResources.generate(schemaLoader.schemas);
			sequence(resourcesArr, (resource, done) => {
				fs.writeFile(path.join(opts.outdir, resource.file), resource.code, done);
			}, onProcessingDone);
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

		createDirsIfNotExists([opts.outdir, dalDir], err => {
			if (err) {
				done(err);
				return;
			}

			processCreateDbScript(err => {
				// kick off the processing
				processGeneralResources(err => {
					if (err) {
						callback(err);
						return;
					}

					processIndividualSchemas(callback);
				});
			});
		});
	}
};