# schemafold
Generates scaffold API and persistence from a schema

The basic idea is to take a schema (that conforms to a mongoose schema) and then generate:

* The API to support GET, POST, PUT, DELETE and PATCH requests for the schema
* The persistence logic (persisting to mongodb, Postgres, etc.)

After the API and DAL have been developed you can continue with your project development. It is not the intention
of this project for the schemafold to produce the entire application-- just the starting API and DAL. After that,
you're on your own. :)


## Usage

You should build the schemafold (see below) and then invoke it as follows:

```
import path from 'path';
import { schemaBasedGenerator } from '../build/schemaBasedGenerator';

let dal = process.env.DAL || 'node-mongodb'; // you can change this to 'node-postgres'
let dbConnectString = creds.connectStrings[dal];

// set the input options for the schemaBasedGenerator
let opts = {
	versionNumber: 1,
	api: 'express', // generate the API using ExpressJS
	dal: dal,
	dbConnectString: dbConnectString, // specify the connect string to the db
	schemas: {
		Person: path.join(__dirname, 'sample-models/Person.js'),
		Address: path.join(__dirname, 'sample-models/Address.js')
	},
	outdir: path.join(__dirname, '../out')
};

// generate the API and DAL for the schemas
schemaBasedGenerator.generate(opts, err => {
	if (err) {
		console.error(err);
	} else {
		console.log('API and DAL code has been generated');
	}
});
```

for the above, let's assume that creds is:

```
let dbHostName = 'localhost';
let dbName   = 'test_db';
let password = 'my-password';

export default {
	connectStrings: {
		'node-mongodb': `mongodb://${dbHostName}:27017/${dbName}`,
		'node-postgres': `postgress://postgres:${password}@${dbHostName}:5432/${dbName}`
	}	
};
```


## Build

To build the schemafold you should execute the following in the schemafold directory:

```
npm run build
```


## bootstrap

This folder contains some procedural test stuff. Basically invoke the tester.js as follows from the bootstrap directory:

```
DAL=node-postgres node tester.js
```

or 

```
DAL=node-mongodb node tester.js
```

There is a line in test-generator.js that you can change if you don't want to use the DAL environment variable as shown above. What you should do is change the literal to the DAL you want to generate.

```
let dal = process.env.DAL || 'node-mongodb';
```

In the example above, you would change 'node-mongodb' to the DAL you want.


## Generated Output

The ```schemafold``` produces the API and DAL output files in an output directory. The structure of the output files is as follows:

```
outputDirectory/
	dal/
		{DAL modules}
	{API modules}
```

## Creating and Dropping the Databases

The schemafold will also generate the ```create-db.js``` and ```drop-db.js``` node.js scripts.

## Seed Data

You may wish to generate the seed data generator to be bulk inserted by the DAL modules that are generated for the schemas. You can do this as follows:

1. Create a module (e.g. seed-data/Person.js) as shown below:

```
const arr = [];
// TODO: Fill arr with objects that correspond to the data schema for Person
export const Person = arr;
```

2. Then invoke the schemaBasedGenerator in the same fashion as shown above. However, add in the seedData property into the opts object (see below).

```
import path from 'path';
import { schemaBasedGenerator } from '../build/schemaBasedGenerator';

let dal = process.env.DAL || 'node-mongodb'; // you can change this to 'node-postgres'
let dbConnectString = creds.connectStrings[dal];

// set the input options for the schemaBasedGenerator
let opts = {
	versionNumber: 1,
	api: 'express', // generate the API using ExpressJS
	dal: dal,
	dbConnectString: dbConnectString, // specify the connect string to the db
	schemas: {
		Person: path.join(__dirname, 'sample-models/Person.js'),
		Address: path.join(__dirname, 'sample-models/Address.js')
	},
	seedData: {
		Person: path.join(__dirname, 'seed-data/Person.js')
	},
	outdir: path.join(__dirname, '../out')
};

// generate the API and DAL for the schemas
schemaBasedGenerator.generate(opts, err => {
	if (err) {
		console.error(err);
	} else {
		console.log('API and DAL code has been generated');
	}
});
```

Once you have done this then the ```bulk-insert-{schema name}.js``` file will be generated. You can run it via ```node bulk-insert-{schema name}.js``` to populate the data storage for the schema.
