Stops = function(place, config, translation) {
	var self = this;
	// initialize map
	this.map = L.map(place).setView([51.505, -0.09], 13);
	this.firstLocation = true;

	// add attr OpenStreetMap tile layer
	L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
	    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
	    maxZoom: 16
	}).addTo(this.map);

	this.lastPosition = new L.LatLng(60.451667, 22.266944);

	this.user = L.marker(this.lastPosition).addTo(this.map);
	this.userCircle = L.circle(this.lastPosition, 50).addTo(this.map);
	this.accuracy = -1;

	this.map.setView(new L.LatLng(60.451667, 22.266944),16);
	this.map.locate({setView: false, maxZoom: 18, watch: true});
	
	this.map.on('locationfound', this.onLocationFound.bind(this));
	this.map.on('locationerror', this.onLocationError.bind(this));
	this.map.on('click', this.onMapClick.bind(this));

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

Stops.prototype.isDrawerOpen = function() {
	return $('#drawer').hasClass('drawer_open');
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

	setTimeout(function() {
		self.map.invalidateSize();
		// change last position to last clicked bus stop ?
		self.map.panTo(self.lastPosition, {animate: true, duration: 1.0});
	}, 200);

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
	self.user.bindPopup('Tarkkuus: ' + radius + ' m'); //.openPopup();
	self.lastPosition = e.latlng;
	self.user.setLatLng(self.lastPosition);
	self.userCircle.setLatLng(self.lastPosition);
	self.accuracy = radius;

	if(self.firstLocation) {
		self.map.setView(e.latlng, self.map.getZoom());
		self.firstLocation = false;
	}
}