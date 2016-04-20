export class GeneralApiResources {
	// Returns an array of objects which have 2 properties:
	//	- file: The path to the file to be created in the output directory
	//	- code: The source code of the file
	generate(schemas) {
		return [
			this.getIndexJS(schemas),
			this.getAppJS(schemas)
		];
	}

	getIndexJS(schemas) {
		return {
			file: 'index.js',
			code: `require('babel-register');
require('./app');`
		}
	}

	getAppJS(schemas) {
		let pieces = schemas.map(s => `require('./${s.schemaName}')(app);`).join('\n');
		let code = `"use strict";
import express from 'express';
const app = express();

${pieces}

app.listen(3000, function () {
  console.log('The app is listening on port 3000!');
});`;
		return {
			file: 'app.js',
			code: code
		};
	}
};
