var mongoose   		= require('mongoose');
var request	   		= require('request');
var config 			= require('./config');
var Stop 			= require('./models/stop');

mongoose.connect('mongodb://localhost/' + config.db); 

function formatAMPM(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    var strTime = hours + '%3A' + minutes + ampm;
    return strTime;
}

module.exports = function(router) {

    // A tester.
	router.get('/', function(req, res) {
  		res.send("Hello world!");
	});

    // Search for stops within the given rectangle (lat1, lon1, lat2, lon2).
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
				
						} }	}, { timetable: 0, _id: 0 } )
						.exec(
							function(err, stops) {
								if(err || !stops) {
									console.log("coord error: ", err); 
									return;
								}
								else {
									// console.log(stops)
									console.log("pysäkkien määrä: ", stops.length);
									// console.log(stops);
									res.json(stops);
								}
                            }
                        );
	});

    // Get information about a single stop.
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

    // Stops near point (lat, lon).
	router.get('/nearMe', function(req, res) {
		var lat = req.param('lat');
		var lon = req.param('lon');
		console.log("coords:", lon, lat);

		Stop.find({ location: {
						$near: {
					     $geometry: {
					        type: "Point" ,
					        coordinates: [lon , lat ]
					     },
					     $maxDistance: 2000,
					     $minDistance: 0
					  }
				}

				})
			.limit(5)
			.exec(function (err, stops) {
				if(err) {
					console.log("error getting stops near me ", err);
					res.send("error");
				}
				else {
					console.log("amount of stops near me:", stops.length);
					res.json(stops);
				}
			});
	});

    router.get('/plan', function(req, res) {
		
		/* call example:
		  
		 http://localhost:3131/api/plan?lat1=60.45180028073331&lon1=22.26104736328125&mode=CAR&lat2=60.16884161373975&lon2=24.95819091796875
		 
		 */
		
		// Go through the parameters, add is something is missing.
		
		// TODO check that the ingoing data is valid.
		var lat1 = req.param('lat1');
		var lon1 = req.param('lon1');
		
		var lat2 = req.param('lat2');
		var lon2 = req.param('lon2');
		
		var date = req.param('date');
		if (typeof(date) === 'undefined') {
			var now = new Date();
			var currentDate = now.getDate();
			var currentMonth = now.getMonth() + 1; 
			var currentYear = now.getFullYear();
			date = currentMonth + '-' + currentDate + '-' + currentYear;
		}
		
		var time = req.param('time');
		if (typeof(time) === 'undefined') time = formatAMPM(new Date());
		
		var mode = req.param('mode');
		if (typeof(mode) === 'undefined') mode = 'TRANSIT' + '%2C' + 'WALK';
		mode = mode.toUpperCase();
		
		var maxWalkDistance = req.param('maxWalkDistance');
		if (typeof(maxWalkDistance) === 'undefined') maxWalkDistance = '750';
		
		var arriveBy = req.param('arriveBy');
		if (typeof(arriveBy) === 'undefined') arriveBy = 'false';
		
		var wheelchair = req.param('wheelchair');
		if (typeof(wheelchair) === 'undefined') wheelchair = 'false';
		
		var showIntermediateStops = req.param('showIntermediateStops');
		if (typeof(showIntermediateStops) === 'undefined') showIntermediateStops = 'false';
			   
		console.log('Planning route from ' + lat1, lon1, 'to ' + lat2, lon2, '.');

		// Remote response handler.
		var __callSuccess = function (error, response, body) {
			if (!error && response.statusCode === 200) {
				console.log('Response: ', body);
				res.charset = 'utf-8';
				res.type('application/json');
				res.send(body);
			}
			else res.send('plan error');
		};
		
		// Construct the url.
		console.log(config);
		
		var callUrl = config.otp_addr +  
			'/otp/routers/default/plan?' + 
			'fromPlace=' + lat1 + '%2C' + lon1 + '&' +
			'toPlace=' + lat2 + '%2C' + lon2 + '&' +
			'time=' + time + '&' +
			'date=' + date + '&' +
			'maxWalkDistance=' + maxWalkDistance + '&' +
			'arriveBy=' + arriveBy + '&' +
			'wheelchair=' + wheelchair + '&' +
			'showIntermediateStops=' + showIntermediateStops;

		console.log('Final call: ', callUrl);
		
		// Call OTP server for route.
		request(callUrl, __callSuccess);
	});
};
