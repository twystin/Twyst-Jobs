var schedule = require('node-schedule');
var async = require('async');
require('../config/config_models')();
var mongoose = require('mongoose');
var Program = mongoose.model('Program');
var Voucher = mongoose.model('Voucher');
var VR = mongoose.model('VoucherReminder');
mongoose.connect('mongodb://50.112.253.131/twyst');
var Processor = require('./processor');
var job = schedule.scheduleJob({hour: 12, minute: 30, dayOfWeek: [new schedule.Range(0,6)]}, main);

function main() {
	getPrograms(function (err, programs) {
		if(err) {
			console.log("Error getting programs: " + new Date());
		}
		else {
			if(!programs && !programs.length) {
				console.log("No programs found: " + new Date());
			}
			else {
				var voucher_query = voucherFilter(programs);
				getQualifiedVouchers(voucher_query, function (err, vouchers) {
					var length = vouchers.length;
					console.log(length)
					vouchers.forEach(function (v) {
						saveReminders(v, function (err) {
							if(err) {
								console.log(err + "Error saving voucher reminder: "+ new Date());
							}
							else {
								//console.log("Voucher reminder saved successfully: "+ new Date());
							}
							if(--length === 0) {
								console.log("Hate me")
								Processor.processReminders();
							}
						})
					})
				})
			}
		}
	})
}

function saveReminders(voucher, cb) {
	var status = {
		type: 1,
		at: new Date(),
		message: 'SAVED REMINDER'
	}

	VR.findOne({
		voucher: voucher._id
	}, function (err, vr) {
		if(err) {
			cb(err);
		}
		else {
			if(!vr) {
				var vr = {
					voucher: voucher._id,
					user: voucher.issue_details.issued_to,
					batch: voucher.checkin_details.batch,
					is_processed_today: false,
					timeline: []
				}
				vr.timeline.push(status);
				vr = new VR(vr);
			}
			else {
				if(!vr.batch) {
					vr.is_processed_today = false;
					vr.timeline.push(status);
				}
				else {
					// DO NOTHING
				}
			}
			save(vr);
		}
	})

	function save(voucher_reminder) {
		voucher_reminder.save(function (err) {
			cb(err);
		})
	}
}

function getQualifiedVouchers(q, cb) {
	Voucher.find(q, function (err, vouchers) {
		cb(err, vouchers);
	})
}

function voucherFilter(programs) {
	var query = {
		'basics.status': 'active',
		'issue_details.program': {
			$in: programs.map(function (p) {
				return p._id;
			})
		},
		$where: function () {
			var today = new Date();
			var day = today.getDate(),
				month = today.getMonth(),
				year = today.getFullYear();
			var days = Math.floor((new Date(year, month, day).getTime() - new Date(obj.basics.created_at).getTime()) / 86400000);
			return ((days > 12) && (days < 28) && !Math.floor((days + 1) % 7));
		}
	};
	return query;
}

function getPrograms(cb) { 
	var q = programFilter();
	Program.find(q, function (err, program) {
		cb(err, program);
	})
}

function programFilter() {
	var today_plus_13_days = new Date(Date.now() + 1123200000);
	var query = {
		'status': 'active',
		'validity.burn_end': {
			$gt: today_plus_13_days
		},
		'validity.burn_start': {
			$lt: new Date()
		}
	};
	return query;
}