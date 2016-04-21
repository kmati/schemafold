/*
 * This module is the DAL generator for a schema
 */
export class SchemaToDal {
	generate(dbConnectString, schemaName, schema, schemas) {
		let code = `"use strict";
// DAL for ${schemaName}
const mongodb = require('mongodb'),
	collectionName = '${schemaName}';
module.exports = {
    // Connects to the db and invokes an action
    getDb: function () {
        let MongoClient = mongodb.MongoClient;

        // Connection URL
        let url = '${dbConnectString}';

    	return new Promise(function(resolve, reject) {
	        MongoClient.connect(url, function(err, db) {
	            if (err) {
	                reject(err);
	                return;
	            }

	            resolve(db);
	        });
	    });
    },

    // Gets info about the DAL
    info: function () {
    	return {
    		dal: 'node-mongodb',
    		collectionName: collectionName
    	};
    },

    // Resolves to an array of ${schemaName} objects
    findAll: function () {
    	return this.find({});
    },

    // Resolves to an array of ${schemaName} objects
    find: function (whereObj) {
    	let self = this;
    	return new Promise(function(resolve, reject) {
	    	self.getDb()
	    		.then(db => {
		            let collection = db.collection(collectionName);
		            collection.find(whereObj).toArray(function(err, result) {
		                db.close();

		                if (err) {
		                    reject(err);
		                    return;
		                }
		                resolve(result);
		            });
	    		});
    	});
    },

    insert: function (docs) {
    	let self = this;
    	return new Promise(function(resolve, reject) {
	    	self.getDb()
	    		.then(db => {
		            let collection = db.collection(collectionName);
		            collection.insert(docs, function(err, result) {
		                db.close();

		                if (err) {
		                    reject(err);
		                    return;
		                }
		                resolve(result);
		            });
		        });
		});
    },

    update: function (whereObj, setObj) {
    	let self = this;
    	return new Promise(function(resolve, reject) {
	    	self.getDb()
	    		.then(db => {
		            let collection = db.collection(collectionName);
		            if (setObj._id) {
		                // remove the _id column from the update object being set!
		                delete setObj._id;
		            }
		            collection.update(whereObj, { $set: setObj }, function(err, result) {
		                db.close();

		                if (err) {
		                    reject(err);
		                    return;
		                }
		                resolve(result);
		            });
		        });
		});
    },

    removeAll: function () {
    	return this.remove({});
    },

    remove: function (whereObj) {
    	let self = this;
    	return new Promise(function(resolve, reject) {
	    	self.getDb()
	    		.then(db => {
		            let collection = db.collection(collectionName);
		            collection.remove(whereObj, function(err, result) {
		                db.close();

		                if (err) {
		                    reject(err);
		                    return;
		                }
		                resolve(result);
		            });
		        });
		});
    }
};`;
		return code;
	}
};