Stops = function(place, config, translation) {
	var self = this;
	// initialize map
	this.map = L.map(place).setView([51.505, -0.09], 13);
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

					//popup
					stop.bindPopup('<span class="lato-text"><b>' + item['stop_name'] + '</b> ('+ item['stop_code'] + ')</span>');

					stop.on('click', function(e) {
						self.map.setView(new L.LatLng(stop.lat, stop.lon), 17);
						self.openStop(stop);
						
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

Stops.prototype.openStop = function(stop) {
	var self = this;

	$('.masterheader').html('<i class="fa fa-clock-o"></i> <strong> 3 min </strong> <i class="spacing-left yellow fa fa-bus"></i> 32 <span class="spacing-left"></span> kauppatorille'); 

	$('.subheader').html('<i class="fa fa-flag-o"></i> ' + stop.name);


	self.expandDrawer();

	$.ajax({
		url: '/api/stop',
		data: {stop: stop.code},
		type: 'GET',

		success: function(data) {
			console.log(data);
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
		var lastPos = new L.LatLng(self.selectedStop.lat, self.selectedStop.lon); 
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