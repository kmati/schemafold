export class GeneralApiResources {
	// Returns an array of objects which have 2 properties:
	//	- file: The path to the file to be created in the output directory
	//	- code: The source code of the file
	generate(port, schemas) {
		return [
			this.getIndexJS(schemas),
			this.getAppJS(port, schemas)
		];
	}

	getIndexJS(schemas) {
		return {
			file: 'index.js',
			code: `require('babel-register');
require('./app');`
		}
	}

	getAppJS(port, schemas) {
		let pieces = schemas.map(s => `require('./${s.schemaName}')(app);`).join('\n');
		let code = `"use strict";
import express from 'express';
const app = express(),
	bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

${pieces}

app.listen(${port}, function () {
  console.log('The app is listening on port ${port}');
});`;
		return {
			file: 'app.js',
			code: code
		};
	}
};
