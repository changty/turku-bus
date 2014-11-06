var mongoose 	= require('mongoose');
var Schema 		= mongoose.Schema;

var StopSchema = new Schema({
	stop_name: String, 
	stop_code: String,
	location: {
		type: {type: String, enum: 'Point', default: 'Point'}, // 'Point'
		coordinates: [Number], default: [0,0] //long, lat !important
		},
}); 

StopSchema.index({ location: '2dsphere' });
module.exports = mongoose.model('Stop', StopSchema);