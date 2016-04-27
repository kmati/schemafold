'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GeneralApiResources = exports.GeneralApiResources = function () {
	function GeneralApiResources() {
		_classCallCheck(this, GeneralApiResources);
	}

	_createClass(GeneralApiResources, [{
		key: 'generate',

		// Returns an array of objects which have 2 properties:
		//	- file: The path to the file to be created in the output directory
		//	- code: The source code of the file
		value: function generate(port, schemas) {
			return [this.getIndexJS(schemas), this.getAppJS(port, schemas)];
		}
	}, {
		key: 'getIndexJS',
		value: function getIndexJS(schemas) {
			return {
				file: 'index.js',
				code: 'require(\'babel-register\');\nrequire(\'./app\');'
			};
		}
	}, {
		key: 'getAppJS',
		value: function getAppJS(port, schemas) {
			var pieces = schemas.map(function (s) {
				return 'require(\'./' + s.schemaName + '\')(app);';
			}).join('\n');
			var code = '"use strict";\nimport express from \'express\';\nconst app = express(),\n\tbodyParser = require(\'body-parser\');\n\napp.use(bodyParser.json());\napp.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded\n\n' + pieces + '\n\napp.listen(' + port + ', function () {\n  console.log(\'The app is listening on port ' + port + '\');\n});';
			return {
				file: 'app.js',
				code: code
			};
		}
	}]);

	return GeneralApiResources;
}();

;