var fs = require('fs'),
	_ = require('underscore'),
	schedule = require('node-schedule'),
	keygen = require("keygenerator"),
	async = require('async');
require('../config/config_models')();
var mongoose = require('mongoose');
var Voucher = mongoose.model('Voucher'),
	Winback = mongoose.model('Winback'),
	Outlet = mongoose.model('Outlet'),
	Checkin = mongoose.model('Checkin'),
	Account = mongoose.model('Account');

mongoose.connect('mongodb://localhost/twyst');

var job = schedule.scheduleJob({minute: 38, dayOfWeek: [new schedule.Range(0,6)]}, main);

function main() {
	getWinbacks(function (err, winbacks) {
		if(err) {
			console.log("Error getting winbacks.")
		}
		else {
			if(winbacks && winbacks.length > 0) {
				async.each(winbacks, function (w, callback) {
			        getUsers(w, function (err, users) {
			        	if(err) {
			        		callback(err);
			        	}
			        	else {
			        		users = filterUsers(w, users);
			        		console.log(users)
			        		generateVouchers(w, users, function (err) {
			        			callback(err);
			        		});
			        	}
			        });
			    }, function (err) {
			        console.log("Done the winbacks");
			    })
			}
			else {
				console.log("No winbacks found currently.");
			}
		}
	})
}
main()

function filterUsers(winback, users) {
	var filtered_users = [],
		winback_filter_date_down = new Date(Date.now() - winback.weeks_since_last_visit * 7 * 86400000 - 86400000),
		winback_filter_date_up = new Date(Date.now() - winback.weeks_since_last_visit * 7 * 86400000);
	winback_filter_date_up = setHMS(winback_filter_date_up);
	winback_filter_date_down = setHMS(winback_filter_date_down);
	users.forEach(function (u) {
		u.dates = _.sortBy(u.dates, function (d) {
			return -d;
		});
		if(u.dates[0] < winback_filter_date_up 
			&& u.dates[0] > winback_filter_date_down) {
			//filtered_users.push(u);
		}
		if(u._id == '9871303236') {
			filtered_users.push(u);
		}
	});
	return filtered_users;
}

function setHMS(date) {
	date.setHours(0);
	date.setMinutes(0);
	date.setSeconds(0);
	return date;
}

function generateVouchers(winback, users, cb) {
    async.each(users, function (u, callback) {
        saveVoucher(u, winback, function (err) {
        	callback(err);
        });
    }, function (err) {
        cb(err);
    })
}

function saveVoucher(user, winback, cb) {
	Account.findOne(function (err, user) {
		if(err) {
			cb(err);
		}
		else {
			if(!user) {
				cb();
			}
			else {
				var voucher = {
					basics: {
						code: keygen._({
							forceUppercase: true, 
							length: 6, 
							exclude:['O', '0', 'L', '1']
						}),
						description: winback.name,
						type: 'WINBACK'
					},
					validity: {
						start_date: Date.now(),
				        end_date: winback.validity.voucher_valid_days * 86400000,
				        number_of_days: winback.validity.voucher_valid_days
					},
					issue_details: {
						winback: winback._id,
						issued_for: winback.offers[0],
						issued_at: winback.outlets.map(function (o) {
							return o._id;
						}),
						issued_to: user._id
					}
				}

				voucher = new Voucher(voucher);
				voucher.save(function (err) {
					cb(err);
				})
			}
		}
	})
}

function getUsers(winback, cb) {
	Checkin.aggregate({
		$match: {
			outlet: {
				$in: winback.outlets.map(function (o) {
					return mongoose.Types.ObjectId(o._id);
				})
			}
		}
	}, {
		$group :{
			_id: '$phone',
			count: {
				$sum: 1
			},
			dates: {
				$push: '$checkin_date'
			}
		}
	}, {
		$match: {
			count: {
				$gt: winback.min_historical_checkins
			}
		}
	}, function (err, op) {
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
			$lt: new Date(),
		},
		'validity.earn_end': {
			$gt: new Date(),
		}
	})
	.populate('outlets')
	.populate('offers')
	.exec(function (err, winbacks) {
		cb(err, winbacks);
	})
}
