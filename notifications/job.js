var schedule = require('node-schedule');
var async = require('async');
var SmsSender = require('./SmsSender');
var GcmBatcher = require('./gcmBatcher');
var rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [new schedule.Range(0, 6)];
rule.minute = 32;

var mongoose = require('mongoose');
var fs = require('fs');

mongoose.connect('mongodb://localhost/twyst');

var Schema = mongoose.Schema;
var notif = require('../models/notif');
var Notif = mongoose.model('Notif');

seriesExecuter();
var j = schedule.scheduleJob(rule, function(){	
	seriesExecuter();
});

function seriesExecuter() {
	async.parallel({
	    sms: function(callback) {
	    	smsNotifs(callback);
	    },
	    gcm: function(callback) {
	    	gcmNotifs(callback);
	    }
	}, function(err, results) {
	    console.log(results);
	});

};

function smsNotifs (callback) {
	Notif.find({
		message_type: 'SMS',
		scheduled_at: {
			$gte: new Date(Date.now() - 30 * 60 * 1000),
			$lt: new Date(Date.now() + 30 * 60 * 1000)
		},
		status: 'DRAFT'
	}, function(err, notifs) {
		if(err) {
			console.log(err);
		}
		else {
			sendSmsNotifs(notifs);
		}
	});

	function sendSmsNotifs (notifs) {
		var length = notifs.length;
		if(length === 0) {
			callback(null, notifs);
		}
		else {
			notifs.forEach(function (item) {
				item.status = 'SENT';
				item.sent_at = Date.now();
				item.save();
				if(item.phones && item.phones.length > 0) {
					item.phones.forEach(function (phone) {
						SmsSender.sendSms(phone, item.body);
					});
				}
				if (--length === 0) {
					callback(null, notifs);
				};
			});
		}
	}
}


function gcmNotifs (callback) {
	Notif.find({
		message_type: 'GCM',
		scheduled_at: {
			$gte: new Date(Date.now() - 30 * 60 * 1000),
			$lt: new Date(Date.now() + 30 * 60 * 1000)
		},
		status: 'DRAFT'
	}, function(err, notifs) {
		if(err) {
			console.log(err);
		}
		else {
			sendGcmNotifs(notifs);
		}
	});

	function sendGcmNotifs (notifs) {
		var length = notifs.length;
		if (length === 0) {
			callback(null, notifs);
		}
		else {
			notifs.forEach(function (item) {
				item.status = 'SENT';
				item.sent_at = Date.now();
				item.save();
				GcmBatcher.sendPush(item);
				if (--length === 0) {
					callback(null, notifs);
				};
			});
		}
	}
}