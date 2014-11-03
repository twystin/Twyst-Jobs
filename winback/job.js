var fs = require('fs');
var schedule = require('node-schedule');
var async = require('async');
require('../config/config_models')();
var mongoose = require('mongoose');
var Winback = mongoose.model('Winback');
var Outlet = mongoose.model('Outlet');
var Checkin = mongoose.model('Checkin');

mongoose.connect('mongodb://localhost/twyst');

var job = schedule.scheduleJob({minute: 38, dayOfWeek: [new schedule.Range(0,6)]}, main);

function main() {
	getWinbacks(function (err, winbacks) {
		if(err) {
			console.log("Error getting winbacks.")
		}
		else {
			if(winbacks && winbacks.length > 0) {
				getAllOutlets(winbacks, function (err, objects) {
					if(err) {
						console.log("Error getting outlets.");
					}
					else {
						getRefinedUsers(objects, function (err, users) {
							//console.log(users)
						})
					}
				}) 
			}
			else {
				console.log("No winbacks found currently.");
			}
		}
	})
}
main()

function getRefinedUsers(objects, cb) {
    async.each(objects, function (o, callback) {
        getUsers(o, function (err, users) {
        	if(err) {
        		callback(err, users);
        	}
        	else {
        		o.users = users;
        		callback(null, users);
        	}
        });
    }, function (err) {
        cb(err, objects);
    })
}

function getUsers(obj, cb) {
	Checkin.aggregate({
		$match: {
			checkin_date: {
				$lt: new Date(Date.now() - 7 * obj.winback.weeks_since_last_visit * 86400000)
			},
			outlet: {
				$in: obj.outlets.map(function (o) {
					return mongoose.Types.ObjectId(o._id);
				})
			}
		}
	}, {
		$group :{
			_id: '$phone',
			count: {
				$sum: 1
			}
		}
	}, {
		$match: {
			count: {
				$gt: obj.winback.min_historical_checkins
			}
		}
	}, function (err, op) {
		console.log(err || op)
		cb(err, op);
	})
}

function getAllOutlets(winbacks, cb) {
	var objects = [];
    async.each(winbacks, function (w, callback) {
        getOutlet(w.accounts, function (err, outlets) {
        	if(err) {
        		callback(err, outlets);
        	}
        	else {
        		var obj = {
        			outlets: outlets,
        			winback: w
        		};
        		objects.push(obj);
        		callback(null, obj);
        	}
        });
    }, function (err) {
        cb(err, objects);
    })
}

function getOutlet(user_ids, cb) {
	Outlet.find({
		'outlet_meta.accounts': {
			$in: user_ids
		}
	}, function (err, outlets) {
		cb(err, outlets);
	})
}

function getWinbacks(cb) {
	Winback.find({
		'status': 'active',
		'validity.earn_start': {
			$lt: new Date()
		},
		'validity.earn_end': {
			$gt: new Date()
		},
	}, function (err, winbacks) {
		cb(err, winbacks);
	})
}
