// [AR] Include dependencies
var fs = require('fs');
var schedule = require('node-schedule');
var async = require('async');
var SmsSender = require('./smsSender');
var GcmBatcher = require('./gcmBatcher');
var notif = require('../models/notif');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Notif = mongoose.model('Notif');

mongoose.connect('mongodb://localhost/twyst');
var j = schedule.scheduleJob({minute:34, dayOfWeek: [new schedule.Range(0,6)]}, jobRunner);

function jobRunner() {
    console.log("Sending the SMS and Push notifications");
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
    getNotifications(
	'SMS', 
	new Date(Date.now() - 30 * 60 * 1000), 
	new Date(Date.now() + 30 * 60 * 1000), 
	'DRAFT', 
	sendSmsNotifs
    );

    function sendSmsNotifs (notifs) {
	processNotifications(
	    notifs, 
	    callback, 
	    function(item) {
		if(item.phones && item.phones.length > 0) {
		    item.phones.forEach(function (phone) {
			SmsSender.sendSms(phone, item.body);
		    });
		}
	    }
	);
    }
}

function gcmNotifs (callback) {
    getNotifications(
	'GCM',
	new Date(Date.now() - 30 * 60 * 1000),
	new Date(Date.now() + 30 * 60 * 1000),
	'DRAFT',
	sendGcmNotifs
    );

    function sendGcmNotifs (notifs) {
	processNotifications(
	    notifs, 
	    callback, 
	    function(item) {
		GcmBatcher.sendPush(item);
	    }
	);
    }
}

// [AR] Added these as helper functions
function processNotifications(notifs, callback, doSomething) {
    if (notifs.length === 0) {
	callback(null, notifs);
    } else {
	notifs.forEach(function(item) {
	    item.status = 'SENT';
	    item.sent_at = Date.now();
	    item.save();
	    doSomething(item);
	    if (--length === 0) {
		callback(null, notifs);
	    };
	});
    }
}

function getNotifications(type, begin, end, status, callback) {
    console.log("Getting notifications from the database");
    Notif.find({
	message_type: type,
	scheduled_at: {
	    $gte: begin,
	    $lte: end
	},
	status: status
    }, function(err, notifs) {
	if (err) { 
	    console.log(err); 
	} else {
	    console.log("Sending back: " + notifs);
	    callback(notifs);
	}
    });
};
