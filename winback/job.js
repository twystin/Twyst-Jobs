var fs = require('fs');
var schedule = require('node-schedule');
var async = require('async');
require('../config/config_models')();
var mongoose = require('mongoose');
var Notif = mongoose.model('Notif');

mongoose.connect('mongodb://localhost/twyst');

var job = schedule.scheduleJob({minute: 38, dayOfWeek: [new schedule.Range(0,6)]}, main);

function main() {
	console.log("Hello boss :)")
}
main()
function getWinbacks() {

}
