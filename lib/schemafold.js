/*
 * The command line script for schemafold
 * This will create the API and DAL modules for a given set of schema files.
 */
/*
	A sample schemafold-manifest.js looks like this:
	const creds = require('../../bootstrap-creds.js').default;
	const dal = 'node-postgres';
	const dbConnectString = creds.connectStrings[dal];

	const path = require('path');

	module.exports = {
		'api': 'express',
		'schemas': {
			'Person': path.join(__dirname, 'Person.js'),
	    	'Address': path.join(__dirname, 'Address.js')
	    },
		'versionNumber': 1,
		'dal': dal,
		'dbConnectString': dbConnectString,
		'outdir': path.join(__dirname, '../../out')
	};

	This assumes that bootstrap-creds.js looks like this:

	let dbHostName = 'localhost';
	let dbName   = 'test_db';
	let password = 'my-password';

	export default {
		connectStrings: {
			'node-mongodb': `mongodb://${dbHostName}:27017/${dbName}`,
			'node-postgres': `postgress://postgres:${password}@${dbHostName}:5432/${dbName}`
		}	
	};
 */

require('babel-register');
import fs from 'fs';
import path from 'path';
import { schemaBasedGenerator } from '../build/schemaBasedGenerator';

const schemafold = {
	usage: () => {
		console.log('Usage 1:');
		console.log(`node ${process.argv[1]} -manifest {path to schemafold-manifest.js file}`);
		console.log('\nUsage 2:');
		console.log(`node ${process.argv[1]} -v {versionNumber} -dal {node-mongodb | node-postgres} -dbconnstr {database connect string} -out {path to output directory} {schema0-name} {schema0-path} {schema1-name} {schema1-path} ...`);
		console.log('\nExample:');
		console.log('node build/schemafold.js -v 1 -dal node-postgres -dbconnstr postgress://postgres:mypass@localhost:5432/test_db -out ~/Documents/schemafold/out Person ~/Documents/schemafold/bootstrap/sample-models/Person.js Address ~/Documents/schemafold/bootstrap/sample-models/Address.js');
	},

	execute: opts => {
		schemaBasedGenerator.generate(opts, err => {
			if (err) {
				console.error(err);
			} else {
				console.log('schemafold completed');
			}
		});
	}
};

if (process.argv.length < 3) {
	schemafold.usage();
	process.exit(1);
}

let opts = {
	api: 'express',
	schemas: {}
};

let hasSchemas = false;
let manifest;
for (let c = 2; c < process.argv.length; c += 2) {
	if (process.argv[c] === '-v') {
		opts.versionNumber = parseInt(process.argv[c + 1]);
	} else if (process.argv[c] === '-dal') {
		opts.dal = process.argv[c + 1];
	} else if (process.argv[c] === '-dbconnstr') {
		opts.dbConnectString = process.argv[c + 1];
	} else if (process.argv[c] === '-out') {
		opts.outdir = process.argv[c + 1];
	} else if (process.argv[c] === '-manifest') {
		manifest = process.argv[c + 1];
	} else {
		hasSchemas = true;
		opts.schemas[process.argv[c]] = process.argv[c + 1];
	}
}

if (manifest) {
	opts = require(manifest);
	hasSchemas = opts.schemas ? true : false;
}

let missing = [];

if (!opts.versionNumber) {
	missing.push('versionNumber');
}

if (!opts.dal) {
	missing.push('dal');
}

if (!opts.dbConnectString) {
	missing.push('dbconnstr');
}

if (!opts.outdir) {
	missing.push('out (output directory)');
}

if (!hasSchemas) {
	missing.push('{schema name} {schema path}');
}

let hasError = false;
if (opts.dal && ['node-mongodb', 'node-postgres'].indexOf(opts.dal) === -1) {
	console.error('Error: Invalid dal (must be node-mongodb or node-postgres)');
	hasError = true;
}

if (missing.length > 0) {
	console.error('Missing arguments:\n\t' + missing.join('\n\t'));
	schemafold.usage();
	process.exit(1);
}

if (hasError) {
	schemafold.usage();
	process.exit(1);
}

console.log('opts = ',opts);
schemafold.execute(opts);
