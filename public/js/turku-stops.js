Stops = function(place, config, translation) {
	var self = this;
	// initialize map
	this.map = L.map( place, {zoomControl: false} ).setView([51.505, -0.09], 13);
	this.firstLocation = true;
	this.cachedStops = [];

	// remember which stop was last viewed 
	this.selectedStop = null; 

	this.stopsLayer = null;

	// add attr OpenStreetMap tile layer
	L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
	    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
	    maxZoom: 19
	}).addTo(this.map);

	this.lastPosition = new L.LatLng(60.451667, 22.266944);

	this.user = L.userMarker(this.lastPosition).addTo(this.map);
	// this.userCircle = L.circle(this.lastPosition, 50).addTo(this.map);
	this.accuracy = -1;

	this.map.setView(new L.LatLng(60.451667, 22.266944),16);
	this.map.locate({setView: false, maxZoom: 19, watch: true});
	
	this.map.on('locationfound', this.onLocationFound.bind(this));
	this.map.on('locationerror', this.onLocationError.bind(this));
	this.map.on('click', this.onMapClick.bind(this));
	this.map.on('moveend', this.onMoveEnd.bind(this));

	// get stops for new view
	this.onMoveEnd();

	// events
	
	$('.myLoc').click(function(e) {
		console.log("loc!");
		e.preventDefault();
		e.stopPropagation();
		self.goToMyLocation();
	});

	$('.expand').click(function() {
		self.toggleDrawer();
	});

	$('#drawer').click(function() {
		if(!self.isDrawerOpen()) {
			self.toggleDrawer();
		}
	});

}

// Load new stops
Stops.prototype.onMoveEnd = function(e) {
	var self = this;

	var markers = [];

	if(self.stopsLayer) {
/*
		if(cachedMarkers.length > 2000) {
			stopLayer.clearLayers();
			cachedMarkers = [];
		}
*/
	}
	else {
		//if disableClusteringAtZoom is 16, mobile browser chrasesh on iphone
		self.stopsLayer = new L.MarkerClusterGroup({disableClusteringAtZoom: 17}); 
		self.map.addLayer(self.stopsLayer);
	}

	var bounds = self.map.getBounds();
    $.ajax({
        url: '/api/coords',
        type: 'GET',
        data: {
        		'lon1': bounds.getSouthWest().lng, 
        		'lat1': bounds.getSouthWest().lat, 
        		'lon2': bounds.getNorthEast().lng, 
        		'lat2': bounds.getNorthEast().lat
        	},

        success: function(stops) {
        	// console.log(stops);
        		$.each(stops, function (key, item) {

		  			var latlng = new L.LatLng(item['location'].coordinates[1], item['location'].coordinates[0]);
					var stop = new L.marker(latlng, {draggable: false});
					stop.name = item['stop_name'];
					stop.code = item['stop_code'];
					stop.lat = item['location'].coordinates[1];
					stop.lon = item['location'].coordinates[0];
					stop.circle = new L.circle(new L.LatLng(stop.lat, stop.lon), 20);

					//popup
					// stop.bindPopup('<span class="lato-text"><b>' + item['stop_name'] + '</b> ('+ item['stop_code'] + ')</span>');

					stop.on('click', function(e) {
						// remove circle from previously selectedstop
						if(self.selectedStop) {
							self.map.removeLayer(self.selectedStop.circle);
						}

						self.map.setView(new L.LatLng(stop.lat, stop.lon), 17);
						self.openStop(stop);

						stop.circle.addTo(self.map);

						self.selectedStop = stop;

						// setLineNumbers(data['stop_id'], data['stop_name']);
		   	// 			getCurrTime(data['stop_id']);

		   	// 			//Save currently clicked stop
		   	// 			$('#timetable').attr('data-stop',data['stop_id']);

			   // 			if(isOpen == 0) {
			   // 				menuToggle();
			   // 			}
					});

					//caching markers (stops)
					if($.inArray(item['stop_code'], self.cachedStops) === -1) {
						markers.push(stop)
						self.cachedStops.push(item['stop_code']);
					} 

		  		});

				//add all once
				self.stopsLayer.addLayers(markers);

        },
        error: function(err) {
        	console.log(err);
        }
    });
}

Stops.prototype.goToMyLocation = function() {
	var self = this; 
	self.map.setView(self.lastPosition, self.map.getZoom());
}

Stops.prototype.openStop = function(stop) {
	var self = this;

	$('.masterheader').html('<i class="fa fa-circle-o-notch fa-spin"></i>');
	$('.subheader').html('<i class="fa fa-flag-o"></i> ' + stop.name + ' (' + stop.code + ')');

	$('.schedule tbody').html('<td class="list-spinner"><i class="fa fa-circle-o-notch fa-spin"></i></td>');

	self.expandDrawer();

	$.ajax({
		url: '/api/stop',
		data: {stop: stop.code},
		type: 'GET',

		success: function(data) {
			var d = new Date; 
			var currTime = d.getHours() + ':' + d.getMinutes();

			var dayType = self.getDayType(new Date());
			var schedule = data.timetable[dayType];

			schedule = self.orderTimetable(schedule);

			for(var i=0; i<schedule.length; i++) {
				$('.schedule tbody').append(
			    	// '<li><i class="fa fa-clock-o"></i> <strong> ' + schedule[i].time.replace('.', ':') +' ('+self.getTimeDifference(currTime, schedule[i].time)+') </strong> <i class="spacing-left fa yellow fa-bus"></i> ' + schedule[i].line + ' <span class="spacing-left"></span> päätepysäkki</li>'
					
					 '<tr>'
	          			+'<td><i class="fa fa-clock-o"></i> <strong> '+schedule[i].time.replace('.', ':') +' </strong></td>'
	          			+'<td>'+self.getTimeDifference(currTime, schedule[i].time)+'</td>'
	    				+'<td><i class="fa yellow fa-bus"></i><strong> '+ schedule[i].line +'</strong></td>'
		          		+'<td>Päätepysäkki</td>'
        			+'</tr>'

				)

			}
			// remove spinner
			$('.list-spinner').remove();


			// set next busline 
				$('.masterheader').html('<i class="fa fa-clock-o"></i> <strong> '+schedule[0].time.replace('.', ':') + ' <span class="hide">('+self.getTimeDifference(currTime, schedule[0].time)+')</span> </strong> <i class="spacing-left yellow fa fa-bus"></i> '+schedule[0].line+' <span class="spacing-left"></span> päätepysäkki'); 

		},	
		error: function(err) {
			console.log("Error getting stop info: ", err);
		}
	});
}


Stops.prototype.resizeCallback = function() {
	var self = this;
	setTimeout(function() {
		self.map.invalidateSize();
		// change last position to last clicked bus stop ?
		//use panBy instead!
		if(self.selectedStop) {
			var lastPos = new L.LatLng(self.selectedStop.lat, self.selectedStop.lon); 
		}
		else {
			var lastPos = self.lastPosition; 
		}
		self.map.panTo(lastPos, {animate: true, duration: 0.1});
	}, 200);
}

Stops.prototype.isDrawerOpen = function() {
	return $('#drawer').hasClass('drawer_open');
}

Stops.prototype.collapseDrawer = function() {
	var self = this;
	//collapse drawer
	if(self.isDrawerOpen()) {
		$('#drawer').removeClass('drawer_open');
		$('#map').removeClass('map_collapse');

	}

	self.resizeCallback();
}

Stops.prototype.expandDrawer = function() {
	var self = this;

	if(!self.isDrawerOpen()) {
		$('#drawer').addClass('drawer_open');
		$('#map').addClass('map_collapse');
	}

	self.resizeCallback();

}

Stops.prototype.toggleDrawer = function() {
	var self = this;
	//collapse drawer
	if(self.isDrawerOpen()) {
		$('#drawer').removeClass('drawer_open');
		$('#map').removeClass('map_collapse');

	}
	// expand drawer
	else {
		$('#drawer').addClass('drawer_open');
		$('#map').addClass('map_collapse');
	}

	self.resizeCallback();
}


Stops.prototype.onMapClick = function(e) {
	var self=this;

	if(self.isDrawerOpen()) {
		self.toggleDrawer();
	}


}

Stops.prototype.onLocationError = function(e) {
	var self = this;

	$('.connection').removeClass('connected');
	$('.connection').addClass('disconnected');
}


Stops.prototype.onLocationFound = function(e) {
	var self = this;

	$('.connection').addClass('connected');
	$('.connection').removeClass('disconnected');
	    
    var radius = e.accuracy / 2;

	var place = [e.latlng.lat, e.latlng.lng];

	// Please don't open popup automatically, because this messes up moving on the map.
	// self.user.bindPopup('Tarkkuus: ' + radius + ' m'); //.openPopup();
	self.lastPosition = e.latlng;
	self.user.setLatLng(self.lastPosition);
	// self.userCircle.setLatLng(self.lastPosition);
	self.accuracy = radius;
	self.user.setAccuracy(radius);

	if(self.firstLocation) {
		self.map.setView(e.latlng, self.map.getZoom());
		self.firstLocation = false;
	}
}

Stops.prototype.weekday = function() {
		var d = new Date();
		
		var weekday = [];
		weekday[0]="sunnuntai";
		weekday[1]="maanantai";
		weekday[2]="tiistai";
		weekday[3]="keskiviikko";
		weekday[4]="torstai";
		weekday[5]="perjantai";
		weekday[6]="lauantai";

		return weekday[d.getDay()];
}

Stops.prototype.getDayType = function(date) {

    var weekday = date.getDay();
    // Helpot
    if (weekday === 0) return 'holidays'; // Sunnuntai, Pääsiäispäivä
    if ((date.getDate() == 1) && (date.getMonth() == 0)) return'holidays'; // UudenvuodenpÃ¤ivÃ¤
    if ((date.getDate() == 6) && (date.getMonth() == 0)) return'holidays'; // Loppiainen
    if ((date.getDate() == 1) && (date.getMonth() == 4)) return'holidays'; // Vappu
    if ((date.getDay() == 6) && (date.getMonth() == 5) && ((date.getDate() >= 20) && (date.getDate() <= 26))) return'holidays'; // Juhannus
    if ((date.getDate() == 6) && (date.getMonth() == 11)) return'holidays'; // ItsenÃ¤isyyspÃ¤ivÃ¤
    if ((date.getDate() == 25) && (date.getMonth() == 11)) return'holidays'; // JoulupÃ¤ivÃ¤
    if ((date.getDate() == 26) && (date.getMonth() == 11)) return'holidays'; // TapaninpÃ¤ivÃ¤

    var result = weekday == 6 ? 'saturdays' : 'workdays';
    return result;
}

Stops.prototype.orderTimetable = function(schedule) {
	var date = new Date; 
	var timestamp = date.getHours() + ':' +date.getMinutes() + ':00';
	var cutPoint = 0;

	for(var i=0; i<schedule.length; i++) {

		var compareTime = schedule[i].time.replace('.', ':'); 
		compareTime + ':00';

		if(timestamp > compareTime) {
			cutPoint = i;
		}
		else {
			break;
		}
	}

	// at this point cutPoint is the last schedule in the past. Now 
	// we need to reorder the schedule array.
	cutPoint++; 
	for(var i=0; i<cutPoint; i++) {
		// move first item to last
		schedule.push(schedule.shift());

	}


	return schedule;

}

//time1 = currTime, time3 = previous time in schedule
Stops.prototype.getTimeDifference = function(time1, time2) {

	var addExtra = false;

	var startTime = time2.replace('.', ':') + ':00';
	var endTime = time1.replace('.', ':') + ':00';

	var startDate = new Date("January 1, 1970 " + startTime);
	var endDate = new Date("January 1, 1970 " + endTime);
	var timeDiff = Math.abs(startDate - endDate);

	var hh = Math.floor(timeDiff / 1000 / 60 / 60);

	timeDiff -= hh * 1000 * 60 * 60;
	var mm = Math.floor(timeDiff / 1000 / 60);


	var str = ""; 

	if(hh > 0) {
		str += hh +' h '; 
	}
	str += mm + ' min';

	return str;
}