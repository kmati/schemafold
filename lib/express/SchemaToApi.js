/*
 * This module is the API generator. It generates API route handlers for a schema
 */
export class SchemaToApi {
	generate(versionNumber, schemaName, schema) {
		let code = `"use strict";
// API for ${schemaName}
const dal = require('./dal/${schemaName}'),
	configuration = require('./configuration.json'),
	baseUri = '/v' + configuration.versionNumber + '/';
module.exports = function (app) {
	/* Top level API */

	app.get(baseUri + '${schemaName}/dal', (req, res, next) => {
		let dalInfo = dal.info();
		res.status(200).json(dalInfo);
	});

	// Gets all the ${schemaName} records
	app.get(baseUri + '${schemaName}', (req, res, next) => {
		dal.findAll()
			.then(arr => {
				res.status(200).json(arr);
				next();
			})
			.catch(e => {
				res.status(500).json({ error: e.toString() });
				next();
			});
	});

	// Gets 1 ${schemaName} record
	app.get(baseUri + '${schemaName}/:id', (req, res, next) => {
		dal.find({ id: Number(req.params.id) })
			.then(ret => {
				res.status(200).json(ret);
				next();
			})
			.catch(e => {
				res.status(500).json({ error: e.toString() });
				next();
			});
	});

	// Posts (i.e. creates) 1 ${schemaName} record
	app.post(baseUri + '${schemaName}', (req, res, next) => {
		dal.insert(req.body)
			.then(ret => {
				res.status(200).json(ret);
				next();
			})
			.catch(e => {
				res.status(500).json({ error: e.toString() });
				next();
			});
	});

	// Puts (i.e. edits) 1 ${schemaName} record
	app.put(baseUri + '${schemaName}/:id', (req, res, next) => {
		dal.update({ id: Number(req.params.id) }, req.body)
			.then(ret => {
				res.status(200).json(ret);
				next();
			})
			.catch(e => {
				res.status(500).json({ error: e.toString() });
				next();
			});
	});

	// Deletes all the ${schemaName} records
	app.delete(baseUri + '${schemaName}', (req, res, next) => {
		dal.removeAll()
			.then(ret => {
				res.status(200).json(null);
				next();
			})
			.catch(e => {
				res.status(500).json({ error: e.toString() });
				next();
			});
	});

	// Deletes 1 ${schemaName} record
	app.delete(baseUri + '${schemaName}/:id', (req, res, next) => {
		dal.remove({ id: Number(req.params.id) })
			.then(ret => {
				res.status(200).json(null);
				next();
			})
			.catch(e => {
				res.status(500).json({ error: e.toString() });
				next();
			});
	});
};`;
		return code;
	}
};