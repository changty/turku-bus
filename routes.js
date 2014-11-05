var mongoose   		= require('mongoose');
var config 			= require('./config');


mongoose.connect('mongodb://localhost/' + config.db); 

module.exports = function(app) {

	app.get('/', function(req, res) {
  		res.send("Hello world!");
	});



};
