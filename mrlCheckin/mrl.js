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
fs.readdir('../../Dropbox/MRL/', function (err, fileName) {
  	if (err) throw err;
  	console.log(fileName + 'okokok')
  	if(fileName != '') {
  		var source = fs.createReadStream('../../Dropbox/MRL/' + fileName);
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
		'checkin_url': 'http://localhost:3000/api/v1/mrl_checkins' // Checkin API
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
			var dest = fs.createWriteStream('../../Dropbox/Checkin/'+ file_name);			
			source.pipe(dest);
			source.on('end', function() { console.log('moved') });
			source.on('error', function(err) { console.log(err)});
			fs.unlink('MRL/' + file_name, function(er) {
				if(err) console.log(err)
				console.log('removed  file from mrlCheckin/MRL folder successfully ');
			})
			fs.unlink('../../Dropbox/MRL/' + file_name, function(er) {
				if(err) console.log(err)
				console.log('removed  file from DropBOX/MRL folder successfully');
			})

			console.log('---------------------------------------');
			console.log(err || 'Completed MRL checkin process at '+ new Date());
		});
	});
};
VoucherReminder/reminder.js
birthday/job.js
function httpCheckin (user, cb) {
	rest.post(config.checkin_url, {
		data: user
	}).on('complete', function(data, response) {
		cb(data, response);
	});
};

function getDataFromFile(file_name, cb) {
	var allUsers = [];
	var checkin_details = {};
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
			checkin_details = {
				'txn_time': row[5].replace("'", ''),
				'phone': row[6].replace("'", ''),
				'outlet': outlet.outlet.replace("'", ''),
				'location': 'DINE_IN'
			}
			//console.log(checkin_details)
			allUsers.push(checkin_details);	
		}		
		
	})
	.on('end', function (count) {
		console.log(allUsers);
		cb(allUsers);
	})
};

