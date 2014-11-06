var mongoose   		= require('mongoose');
var config 			= require('./config');
var Stop 			= require('./models/stop');

mongoose.connect('mongodb://localhost/' + config.db); 

module.exports = function(app) {

	app.get('/', function(req, res) {
  		res.send("Hello world!");
	});

	app.get('/coords', function(req, res) {
		var lon1 = req.param('lon1'); 
		var lat1 = req.param('lat1');

		var lon2 = req.param('lon2');
		var lat2 = req.param('lat2');
		console.log(lon1, lat1, lon2, lat2);

		Stop.find({ location: 
						{ $geoWithin: 
							{ $box: 
								[ 
								  [parseFloat(lon1), parseFloat(lat1) ],
								  [parseFloat(lon2), parseFloat(lat2) ]
								]
				
						} }	}, 

						function(err, stops) {
							if(err || !stops) {
								console.log("coord error: ", err); 
								return;
							}
							else {
								console.log(stops)
								console.log(stops.length);
								res.json(stops);
							}
					});

	});

};
