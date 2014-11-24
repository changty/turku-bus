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

	// Creative Commons – Attribution (CC BY 3.0) 
	//Map Marker designed by Venkatesh Aiyulu from the Noun Project
	this.mapIcon = L.icon({
    	iconUrl: 'img/busstop.png',
	    iconSize:     [32, 37], // size of the icon
	    iconAnchor:   [16, 37], // point of the icon which will correspond to marker's location
	    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
	});

	this.selectedMapIcon = L.icon({
		iconUrl: 'img/busstopSelected.png',
	    iconSize:     [32, 37], // size of the icon
	    iconAnchor:   [16, 37], // point of the icon which will correspond to marker's location
	    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
	});

	this.map.setView(new L.LatLng(60.451667, 22.266944),16);
	this.map.locate({setView: false, maxZoom: 19, watch: true});

	// resize map after drawer animation
	var transitionEnd = transitionEndEventName();
	$('#drawer')[0].addEventListener(transitionEnd, 
		function() {
			setTimeout(function() {
				self.map.invalidateSize();
			},100);
		}, false);
	
	// other map functions
	this.map.on('locationfound', this.onLocationFound.bind(this));
	this.map.on('locationerror', this.onLocationError.bind(this));
	this.map.on('click', this.onMapClick.bind(this));
	this.map.on('moveend', this.onMoveEnd.bind(this));

	// get stops for new view
	this.onMoveEnd();

	// events
	
	$('.myLoc').click(function(e) {
		e.preventDefault();
		e.stopPropagation();
		self.goToMyLocation();
		$(this).addClass('active');
		setTimeout(function() {
			$('.myLoc').removeClass('active');
		}, 1000);
	});

	$('.expand').click(function() {
		self.toggleDrawer();
	});

	$('#drawer').click(function() {
		if(!self.isDrawerOpen()) {
			self.toggleDrawer();
		}
	});

	$('.search-form').submit(function(e) {
		// prevent post/get
		e.preventDefault();

		self.search($('.searchfield').val());

	});

	$('.searchfield').on('focus', function(e) {
		$('.searchresults').removeClass('hide');
		$(this).addClass('active');
		$('#drawer').addClass('drawer_hidden');

	});

	$('.searchfield').on('blur', function(e) {

	});

	$('body').on('click', '.result', function(e){
		$('.searchresults').addClass('hide');
		$('#drawer').removeClass('drawer_hidden');

		self.map.setView([$(this).attr('data-lat'), $(this).attr('data-lon')], self.map.getZoom());
	}); 

	$('body').on('click', '.showOnMap', function(e) {
		var stop = $(this);
		self.stopsLayer.eachLayer(function(marker) {
		   if (marker.code == stop.attr('data-stopcode')) {

		   		// show clicked stop location 
	            self.map.setView(marker.getLatLng(), 18);
	            
	            if(self.selectedStop && self.selectedStop.circle) {
	            	self.map.removeLayer(self.selectedStop.circle);
					self.selectedStop.setIcon(self.mapIcon);
	            }

	            self.selectedStop = marker;
	            marker.circle.addTo(self.map);
	        	marker.setIcon(self.selectedMapIcon);
	        
	        }
	    });

	});
}

Stops.prototype.search = function(value) {
	console.log(value);
	$('body').append('<div class="loader"><i class="fa fa-circle-o-notch fa-spin"></i></div>');

	$.ajax({
		url: 'http://nominatim.openstreetmap.org/search',
		type: 'GET',
		data: {q: value, format: 'json', limit: 10, countrycodes: 'fi', addressdetails: 1},

		success: function(data) {
			console.log(data);
			$('.loader').remove();
			$('.searchresults').remove();

			var str = '';
			for(var i=0; i<data.length; i++) {
				var result = ''
				
				if (data[i].address.road) { result += data[i].address.road }
				if (data[i].address.city) { result += ', ' + data[i].address.city}

				str += '<div class="result" data-lat="'+ data[i].lat+'" data-lon="'+data[i].lon+'">' + result +  '<br />(debug: ' + data[i].lat + ',' + data[i].lon + ')</div>';
			}

			$('body').append(
				'<div class="searchresults">'
					+ str 
				+'</div>'
			);
		},

		error: function(err) {
			console.log("error finding address: ", err);
			$('.loader').remove();
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
				

					var stop = new L.marker(latlng, {draggable: false, icon: self.mapIcon});
					stop.name = item['stop_name'];
					stop.code = item['stop_code'];
					stop.lat = item['location'].coordinates[1];
					stop.lon = item['location'].coordinates[0];
					stop.circle = new L.circle(new L.LatLng(stop.lat, stop.lon), 10, {
						color: '#f39c12',
						weight: '3',
						opacity: '0.8',
						fillOpacity: '0.8',
						fillColor: '#f1c40f'
					});

					//popup
					// stop.bindPopup('<span class="lato-text"><b>' + item['stop_name'] + '</b> ('+ item['stop_code'] + ')</span>');

					stop.on('click', function(e) {
						// remove circle from previously selectedstop
						if(self.selectedStop && self.selectedStop.circle) {
							self.map.removeLayer(self.selectedStop.circle);
							self.selectedStop.setIcon(self.mapIcon);
						}
						stop.setIcon(self.selectedMapIcon);
						self.selectedStop = $.extend({}, stop);
						self.map.setView(new L.LatLng(stop.lat, stop.lon), 18);

						self.openStop(stop);

						stop.circle.addTo(self.map);


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
	// console.log(self.selectedStop);
	if(!self.selectedStop) { 
		self.selectedStop = {};
	}

	self.selectedStop.lat = self.lastPosition.lat; 
	self.selectedStop.lon = self.lastPosition.lng; 
	self.selectedStop.name = "My location"; 
	self.selectedStop.code = "";

	// remove circle around previously selected stop
	if(self.selectedStop && self.selectedStop.circle) {
		self.map.removeLayer(self.selectedStop.circle);
		self.selectedStop.setIcon(self.mapIcon);
	}

	self.map.setView(self.lastPosition, self.map.getZoom());
	self.scheduleNearMe();
}

Stops.prototype.openStop = function(stop) {
	var self = this;

	$('.drawerheader').removeClass('nearMe');
	$('.timeAndLine').html('<i class="fa fa-circle-o-notch fa-spin"></i>');
	$('.endOfLine').html('');
	$('.stop').html('<i class="fa fa-flag-o"></i> ' + stop.name + ' (' + stop.code + ')');

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

			// schedule = self.orderTimetable(schedule);

			schedule = self.getRelevantSchedule(schedule, self.orderTimetable(schedule));

			self.updateTimeTable(schedule, false);

		},	
		error: function(err) {
			console.log("Error getting stop info: ", err);
		}
	});
}


Stops.prototype.scheduleNearMe = function() {
	var self = this;


	var dayType = self.getDayType(new Date());
	var schedule = []; 

	var d = new Date; 
	var currTime = d.getHours() + ':' + d.getMinutes();

	$('.drawerheader').addClass('nearMe');

	$('.timeAndLine').html('<i class="fa fa-circle-o-notch fa-spin"></i>');
	$('.endOfLine').html('');
	$('.stop').html('');


	$('.schedule tbody').html('<td class="list-spinner"><i class="fa fa-circle-o-notch fa-spin"></i></td>');

	// self.expandDrawer();

	$.ajax({
		url: 'api/nearMe',
		type: 'GET', 
		data: { lat: self.lastPosition.lat, lon: self.lastPosition.lng },

		success: function(data) {

			var stopsNear = [];

			for (var i=0; i<data.length; i++) {

				// save coordinates, so that he location can be adjusted to show all near by stops
				stopsNear.push(new L.LatLng(data[i].location.coordinates[1], data[i].location.coordinates[0]));
				
				for (var n =0; n<data[i].timetable[dayType].length; n++) {
					data[i].timetable[dayType][n].stop_code = data[i].stop_name + ' (' + data[i].stop_code + ')';
					data[i].timetable[dayType][n].scode = data[i].stop_code;
					data[i].timetable[dayType][n].coordinates = data[i].location.coordinates;
				}
				
				schedule.push.apply(schedule, data[i].timetable[dayType]);
			}

			self.map.fitBounds(stopsNear);

			schedule = schedule.sort(function (a, b) {
				var time1 = new Date('1970/01/01 ' + a.time.replace('.', ':'));
				var time2 = new Date('1970/01/01 ' + b.time.replace('.', ':'));
				// return time1 - time2;
				return time1 < time2 ? -1 : time1 > time2 ? 1 : 0;
			  // return (new Date('1970/01/01 ' + a.time) < new Date('1970/01/01 ' + b.time)) ? -1 : (new Date('1970/01/01 ' + a.time) > new Date('1970/01/01 ' + b.time)) ? 1 : 0;
			});	

			schedule = self.getRelevantSchedule(schedule, self.orderTimetable(schedule));
			// schedule = self.orderTimetable(schedule);

			self.updateTimeTable(schedule, true);
		},

		error: function(err) {
			console.log("Error getting schedule close by: ", err);
		}
	});
}

Stops.prototype.updateTimeTable = function(schedule, nearMe) {
	var self = this;

	var d = new Date; 
	var currTime = d.getHours() + ':' + d.getMinutes();

	if(nearMe) {
		$('.schedule thead').html(
			      	'<tr>'
	    				+ '<th>Lähtee</th>'
	    				+ '<th>Aikaa</th>'
	    				+ '<th>Linja</th>'
	    				+ '<th>Päätepysäkki</th>'
	    				+ '<th>Pysäkiltä</th>'
	  				+ '</tr>'
		);
	}

	else {
		$('.schedule thead').html(
			      	'<tr>'
	    				+ '<th>Lähtee</th>'
	    				+ '<th>Aikaa</th>'
	    				+ '<th>Linja</th>'
	    				+ '<th>Päätepysäkki</th>'
	  				+ '</tr>'
		);
	}

	if(schedule[0]) {
		for(var i=0; i<schedule.length; i++) {

			var past = i<2 ? "past":""; 			
			var timeToWait = self.getTimeDifference(currTime, schedule[i].time, past);


			if(nearMe) {

				$('.schedule tbody').append(					
					 '<tr class="schedule_entry ' + past +'">'
	          			+'<td><i class="fa fa-clock-o"></i> <strong> '+schedule[i].time.replace('.', ':') +' </strong></td>'
	          			+'<td>'+timeToWait+'</td>'
	    				+'<td><i class="fa yellow fa-bus"></i><strong> '+ schedule[i].line +'</strong></td>'
		          		+'<td>'+schedule[i].destination+'</td>'
		          		+'<td><i class="spacing-right fa fa-flag-o"></i>' +schedule[i].stop_code+'</td>'
	    			+'</tr>'

	    			+'<tr>'
	    				+'<td class="contextmenu" colspan="5">'
	    				+'<button class="contextbtn showOnMap" data-stopcode="'+schedule[i].scode+'"><i class="fa fa-crosshairs"></i></button>'
	    				+'<button class="contextbtn addAlarm"><i class="fa fa-volume-up"></i></button>'
	    				+'</td>'
	    			+'</tr>'
				);

			}

			else {
				$('.schedule tbody').append(					
					 '<tr class="schedule_entry ' + past +'">'
	          			+'<td><i class="fa fa-clock-o"></i> <strong> '+schedule[i].time.replace('.', ':') +' </strong></td>'
	          			+'<td>'+timeToWait+'</td>'
	    				+'<td><i class="fa yellow fa-bus"></i><strong> '+ schedule[i].line +'</strong></td>'
		          		+'<td>'+schedule[i].destination+'</td>'
	    			+'</tr>'

	    			+'<tr>'
	    				+'<td class="contextmenu" colspan="5">'
	    				+'<button class="contextbtn showOnMap" data-stopcode="'+schedule[i].scode+'"><i class="fa fa-crosshairs"></i></button>'
	    				+'<button class="contextbtn addAlarm"><i class="fa fa-volume-up"></i></button>'
	    				+'</td>'
	    			+'</tr>'
				);
			}

		}

		// set next busline 
		$('.timeAndLine').html('<i class="fa yellow fa-clock-o"> </i> <span class="spacing-right"><strong> '+schedule[0].time.replace('.', ':') + '</span> <span class="spacing-right">'+self.getTimeDifference(currTime, schedule[0].time)+'</span> </strong> <i class="spacing-left yellow fa fa-bus"></i><strong> '+schedule[0].line+' </strong>'); 
		$('.stop').html('<i class="fa fa-flag-o"> </i> '+ schedule[0].stop_code);
		

		// FIX THIS!
		// if(nearMe) {
		// 	$('.endOfLine').html(schedule[0].destination + ' <i class="spacing-left fa fa-arrows-h"></i> ' + Math.round(getDistanceFromLatLonInKm(self.lastPosition.lat, self.lastPosition.lng, schedule[0].coordinates[1], schedule[0].coordinates[0]) *100)/100 + ' km' );
		// }
		// else {
		// 	$('.endOfLine').html(schedule[0].destination + ' <i class="spacing-left fa fa-arrows-h"></i> ' + Math.round(getDistanceFromLatLonInKm(self.lastPosition.lat, self.lastPosition.lng, data.location.coordinates[1], data.location.coordinates[0]) *100)/100 + ' km' );
		// }

		$('.schedule').jExpand();
	}

	else {

		if(nearMe) {
			$('.schedule tbody').append(
				'<tr>'
	      			+'<td colspan="5">Ei lähteviä busseja</td>'
				+'</tr>'
			);			
		}

		else {
			$('.schedule tbody').append(
				'<tr>'
	      			+'<td colspan="4">Ei lähteviä busseja</td>'
				+'</tr>'
			);
		}
		$('.stop').html('<i class="fa fa-flag-o"> </i> '+ schedule[0].stop_code);
		$('.endOfLine').html('');
	

		// set next busline 
		$('.timeAndLine').html('<i class="fa fa-clock-o"> </i> <span class="spacing-right"><strong>Ei lähteviä yhteyksiä lähettyvillä</span>'); 
		$('.endOfLine').html('')
	
	}
	// remove spinner
	$('.list-spinner').remove();

}

Stops.prototype.resizeCallback = function() {
	var self = this;

	// change last position to last clicked bus stop ?
	//use panBy instead!
	if(self.selectedStop) {
		var lastPos = new L.LatLng(self.selectedStop.lat, self.selectedStop.lon); 
	}
	else {
		var lastPos = self.lastPosition; 
	}
	self.map.panTo(lastPos, {animate: true, duration: 0.1});

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
		$('#search').removeClass('hide');
	}

	// self.resizeCallback();
}

Stops.prototype.expandDrawer = function() {
	var self = this;

	if(!self.isDrawerOpen()) {
		$('#drawer').addClass('drawer_open');
		$('#map').addClass('map_collapse');
		$('#search').addClass('hide');
	}

	self.resizeCallback();

}

Stops.prototype.toggleDrawer = function() {
	var self = this;
	//collapse drawer
	if(self.isDrawerOpen()) {
		$('#drawer').removeClass('drawer_open');
		$('#map').removeClass('map_collapse');
		$('#search').removeClass('hide');

	}
	// expand drawer
	else {
		$('#drawer').addClass('drawer_open');
		$('#map').addClass('map_collapse');
		$('#search').addClass('hide');
		self.resizeCallback();
	}
}


Stops.prototype.onMapClick = function(e) {
	var self=this;

	$('.searchresults').addClass('hide');
	$('.searchfield').removeClass('active');
	$('#drawer').removeClass('drawer_hidden');

	$('.searchfield').blur();


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

Stops.prototype.getRelevantSchedule = function(schedule, cutPoint) {

	// take five next from schedule
	var limited = schedule.splice(cutPoint, 5);

	var diff = limited.length - 5; 
	var n = cutPoint + 5;

	for(var i=0; i<diff; i++) {
		if(schedule[n]) {
			limited.unshift(schedule[n]);
		}
		else {
			n = -1;
		}

		n++;
	}

	console.log("length", limited.length);

	// remember last to busses
	if(cutPoint === 0) {
		limited.unshift(schedule[schedule.length -1]);
		limited.unshift(schedule[schedule.length -2]);

	}
	else if (cutPoint === 1) {
		limited.unshift(schedule[cutPoint -1]);
		limited.unshift(schedule[schedule.length -1]);
	}
	else {
		limited.unshift(schedule[cutPoint -1]);
		limited.unshift(schedule[cutPoint -2]);
	}

	console.log("length", limited.length);

	return limited;
}

Stops.prototype.orderTimetable = function(schedule) {
	var date = new Date();
	var timestamp =  new Date('1970/01/01 ' + date.getHours() + ':' +date.getMinutes() + ':00');
	var cutPoint = 0;

	for(var i=0; i<schedule.length; i++) {

		var compareTime = new Date('1970/01/01 ' + schedule[i].time.replace('.', ':') + ":00"); 


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
	// for(var i=0; i<cutPoint; i++) {
	// 	// move first item to last
	// 	schedule.push(schedule.shift());
	// }


	// return schedule;
	// changed to handle only the position in which the current schedule starts
	return cutPoint;

}

//time1 = currTime, time3 = previous time in schedule
Stops.prototype.getTimeDifference = function(currTime, scheduleTime, past) {

	// current time
	var startTime = scheduleTime.replace('.', ':') + ':00';
	// time in future
	var endTime = currTime.replace('.', ':') + ':00';

	var startDate = new Date('1970/01/01 ' + startTime);
	var endDate = new Date('1970/01/01 ' + endTime);
	var timeDiff = startDate - endDate;

	if(timeDiff < 0 && !past || past.legngth === 0) {
		startDate = new Date('1970/01/02 ' + startTime);
		var timeDiff = startDate - endDate;
	}

	// time in past
	else if(past && past.length) {
		var hh = Math.floor(timeDiff / 1000 / 60 / 60) + 1;
		timeDiff += hh * 1000 * 60 * 60;
		var mm = Math.floor(timeDiff / 1000 / 60);

		var str = ""; 

		if(hh > 0) {
			str += hh +' h '; 
		}
		str += mm + ' min';

		return str;
	}

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


/*---- Helper stuff ----*/
/* Random functions */

// for transition end event
function transitionEndEventName () {
    var i,
        undefined,
        el = document.createElement('div'),
        transitions = {
            'transition':'transitionend',
            'OTransition':'otransitionend',  // oTransitionEnd in very old Opera
            'MozTransition':'transitionend',
            'WebkitTransition':'webkitTransitionEnd'
        };

    for (i in transitions) {
        if (transitions.hasOwnProperty(i) && el.style[i] !== undefined) {
            return transitions[i];
        }
    }

    //TODO: throw 'TransitionEnd event is not supported in this browser'; 
}

// Calculate distance betwee coordinates
function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}
