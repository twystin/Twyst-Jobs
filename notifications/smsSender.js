var sms_push_url = "http://myvaluefirst.com/smpp/sendsms?username=twysthttp&password=twystht6&to=";
var http = require('http');

module.exports.sendBulkSMS = function(item) {
    var body = "";
    message = item.body;
    message.replace(/(\n)+/g, '');
    message.replace(/% /g,'%25 ');
    phones = item.phones.join(',');
    var send_sms_url = sms_push_url + 
	phones + 
	"&from=TWYSTR&text=" +
	message +
	"&category=bulk";

    saveSentSms(phones, message);
    http.get(send_sms_url, function(res) {
	console.log(res.statusCode);
	res.on('data', function(chunk) {
            body += chunk;
        });
        res.on('end', function() {
            console.log(body);
        });
        res.on('error', function(e) {
            console.log("Error message: " + e.message);
        });
    });
}

// This will be yanked to the top
// But makes better reading here

var mongoose = require('mongoose');
var conn2 = mongoose.createConnection('mongodb://54.214.46.139/twyst');
var smsSentLog = require('../models/smsMessageSentLogs');
var SmsSentLog = conn2.model('SmsSentLog');

function saveSentSms (phone, message) {
	var sms_log = {};
	sms_log.phone = phone;
	sms_log.message = message;
	
	var sms_log = new SmsSentLog(sms_log);

	sms_log.save(function (err) {
		if(err) {
			console.log(err);
		}
	});
}