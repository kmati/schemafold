// Tests the generator
import path from 'path';
import { schemaBasedGenerator } from '../build/schemaBasedGenerator';

/*
bootstrap-creds.js may look like this:

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
import creds from '../bootstrap-creds.js';

const tester = {
	execute: () => {
		let dal = process.env.DAL || 'node-mongodb';
		let dbConnectString = creds.connectStrings[dal];

		let opts = {
			versionNumber: 1,
			api: 'express',
			dal: dal,
			dbConnectString: dbConnectString,
			schemas: {
				Person: path.join(__dirname, 'sample-models/Person.js'),
				Address: path.join(__dirname, 'sample-models/Address.js')
			},
			outdir: path.join(__dirname, '../out')
		};

		schemaBasedGenerator.generate(opts, err => {
			if (err) {
				console.error(err);
			} else {
				console.log('Done testing the generator');
			}
		});
	}
};
tester.execute();
export { tester };
