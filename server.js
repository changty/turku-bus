var express    		= require('express'); 		

var app        		= express(); 				
var bodyParser 		= require('body-parser');
var http 			= require('http').Server(app);
var port 			= process.env.PORT || 3131; 

// var Calendar    	= require('./models/calendar');
var mongoose   		= require('mongoose');
// mongoose.connect('mongodb://localhost/xmas-calendar'); 

// parse POST-messages with this
app.use(bodyParser());

app.use(function(req, res, next) {
	// do logging
	res.setHeader('Access-Control-Allow-Origin', '*');
	console.log('Something is happening.');
	next(); // make sure we go to the next routes and don't stop here
});

//server static files from public -folder
app.use(express.static(__dirname + '/public'));

// All routes
require('./routes.js')(app); // load our routes and pass in our app and fully configured passport


// START THE SERVER
// =============================================================================
http.listen(port, function() {
	console.log('Magic happens on port ' + port);	
});
