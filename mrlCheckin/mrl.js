var schedule = require('node-schedule');
var async = require('async');
var _ = require('underscore');
var rest = require('restler');
var csv = require('csv');
var fs = require("fs");
require('../config/config_models')();
var mongoose = require('mongoose');
var Voucher = mongoose.model('Voucher');
var outletHandle = require('./outletHandles');
mongoose.connect('mongodb://localhost/twyst');
var file_name, config;
fs.readdir('../../Dropbox/Checkin/', function (err, fileName) {
  	if (err) throw err;
  	console.log('filename ' + fileName)
  	if(fileName != '') {
  		var source = fs.createReadStream('../../Dropbox/Checkin/' + fileName);
		var dest = fs.createWriteStream('MRL/'+ fileName);			
		source.pipe(dest);
		source.on('end', function() { console.log('moved') });
		source.on('error', function(err) { console.log(err)});
	  	file_name = fileName;
	  	setFileName(file_name);	
	  	setTimeout(function(){ initCheckin(); }, 1000);
  	}
  	else {
  		console.log('no file to checkin today ' + new Date());
  	}
  	
});
var job = schedule.scheduleJob({hour: 6, minute: 25, dayOfWeek: [new schedule.Range(0,6)]}, initCheckin);

function setFileName(file_name) {
	config = {
		'csv_file_name': __dirname + '/MRL/' + file_name, // File path which has phone numbers
		'checkin_url': 'http://localhost:3000/api/v4/checkin/mrl' // Checkin API
	}; 
}




function initCheckin() {
	getDataFromFile(config.csv_file_name, function (all_users) {
		async.each(all_users, function (user, callback) {
			httpCheckin(user, function (data, response) {
				console.log(data.status + ' ' + data.message);
				//console.log(response);
				callback();
			});
		}, function (err) {
			var source = fs.createReadStream('MRL/' + file_name);
			var dest = fs.createWriteStream('../../Dropbox/Already_Checkin/'+ file_name);			
			source.pipe(dest);
			source.on('end', function() { console.log('moved') });
			source.on('error', function(err) { console.log(err)});
			fs.unlink('MRL/' + file_name, function(er) {
				if(err) console.log(err)
				console.log('removed  file from mrlCheckin/MRL folder successfully ');
			})
			fs.unlink('../../Dropbox/Checkin/' + file_name, function(er) {
				if(err) console.log(err)
				console.log('removed  file from DropBOX/Checkin folder successfully');
			})

			console.log('---------------------------------------');
			console.log(err || 'Completed MRL checkin process at '+ new Date());
		});
	});
};
function httpCheckin (user, cb) {
	rest.post(config.checkin_url, {
		data: user
	}).on('complete', function(data, response) {
		cb(data, response);
	});
};

function getDataFromFile(file_name, cb) {
	var allUsers = [];
	var event_data = {};
	csv()
	.from
	.stream(fs.createReadStream(file_name, { encoding: 'utf8' }))
	.on('record', function (row, index) {
		var outlet = _.find(outletHandle.handles,  function(item){ 	
			if(item.mid.toString() === row[0].toString().replace("'", '')) {
				return item.outlet;
			}
		})	
		if(outlet && row[5]) {

			event_data.event_meta= {};
			event_data.event_meta.phone = row[6].replace("'", '');
			event_data.event_meta.event_type = 'checkin';
			event_data.event_outlet = outlet.outlet.replace("'", '');
			event_data.event_meta.date = row[5].replace("'", '');
			
			event_data.event_meta.location =  'DINE_IN'
			rest.post(config.checkin_url+'?token='+'8OqHcyk7NWRFEwA7LjFhQR0YknBu0PpO', {
				data: event_data
			}).on('complete', function(data, response) {
				cb(data, response);
			});

			//console.log(checkin_details)
			allUsers.push(event_data);	
		}		
		
	})
	.on('end', function (count) {
		console.log(allUsers);
		cb(allUsers);
	})
};

