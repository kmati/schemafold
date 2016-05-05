/*
 * This module is the seed data code generator. It generates code to bulk insert seed data for a schema
 */
export class SeedDataCodeGen {
	generate(schemaName, seedDataArr) {
		let code = `"use strict";
// Bulk insert of seed data for ${schemaName}
const dal = require('./dal/${schemaName}');

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

sequence(seedDataArr,
	(seedDataObj, done) => {
		dal.insert(seedDataObj)
			.then(ret => {
				console.log('[Bulk insert success for ${schemaName}] Inserted data for id: ' + ret.id);
				done();
			})
			.catch(done);
	}, err => {
		console.error('[Bulk insert error for ${schemaName}] id: ' + ret.id + '. The error is:', err);
	});`;
		return code;
	}
};