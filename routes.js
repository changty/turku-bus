var mongoose   		= require('mongoose');
var config 			= require('./config');
var Stop 			= require('./models/stop');

mongoose.connect('mongodb://localhost/' + config.db); 

module.exports = function(router) {

	router.get('/', function(req, res) {
  		res.send("Hello world!");
	});

	router.get('/coords', function(req, res) {
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
								// console.log(stops)
								console.log("pysäkkien määrä: ", stops.length);
								res.json(stops);
							}
					});

	});

	router.get('/stop', function(req, res) {
		var stop_code = req.param('stop');
		console.log("stop:", stop_code);
		Stop.findOne({'stop_code': stop_code}, 
			function (err, stop) {
				if(err) {
					console.log("error getting stop ", err);
					res.send("error");
				}
				else {
					console.log("pysäkki:", stop);
					res.json(stop);
				}
			});
	});

};
