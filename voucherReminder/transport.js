var mongoose = require('mongoose');
var Notif = mongoose.model('Notif');
var Unsbs = mongoose.model('Unsbs');
var days = [ 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

var transports = {
	'CONSOLE': processConsole,
	'EMAIL': processEmail,
	'PUSH': processPush,
	'SMS': processSms
};

module.exports.handleReminder = function (info) {
	filterUnsbs(info, function (err, info) {
		var transport = getUserTransport(info.user);
		if(transport.CONSOLE) {
			transports['CONSOLE'](info);
		}
		if(transport.EMAIL) {
			transports['EMAIL'](info);
		}
		if(transport.PUSH) {
			transports['PUSH'](info);
		}
		if(transport.SMS) {
			transports['SMS'](info);
		}
	})
}

function filterUnsbs(info, cb) {
	Unsbs.findOne({
		user: info.user._id
	}, function (err, unsbs) {
		if(err) {
			info.vouchers = [];
			cb(err, info);
		}
		else {
			if(unsbs) {
				var vouchers = [];
				info.vouchers.forEach(function (v) {
					if(!isUnsbs(v, unsbs)) {
						vouchers.push(v);
					}
				})
				info.vouchers = vouchers;
				cb(err, info);
			}
			else {
				cb(err, info);
			}
		}
	})
}

function isUnsbs(voucher, unsbs) {
	for(var i = 0; i < unsbs.sms.remind.outlets.length; i++) {
		if(isMatchedOutlet(voucher, unsbs.sms.remind.outlets[i])) {
			return true;
		}
	}
	return false;
}

function isMatchedOutlet(voucher, outlet) {
	console.log(voucher)
	console.log(outlet)
	for(var i = 0; i < voucher.issue_details.issued_at.length; i++) {
		if(voucher.issue_details.issued_at[i]._id.equals(outlet)) {
			return true;
		}
	}
	return false;
}

function getSmsMessage() {

}

function getPushMessage() {

}

function getEmailMessage() {

}

function processPush(info) {

}

function processEmail(info) {

}

function processSms(info) {
	if(info.vouchers.length > 0) {
		var v = pickVoucher(info.vouchers);
		var push_message = 'Your Twyst Voucher for ' + rewardify(v.issue_details.issued_for) +', (TnC apply) at '+ v.issue_details.issued_at[0].basics.name +' is pending. Voucher code '+ v.basics.code +' - Redeem Today!';
		push_message += ' Click http://twy.st/' + v.issue_details.issued_at[0].shortUrl[0] + ' to see all rewards at ' + v.issue_details.issued_at[0].basics.name +'. To stop receiving this, sms STOP ' + v.issue_details.issued_at[0].shortUrl[0] +' to 9266801954.';
		saveReminder(info.user.phone, push_message);
	}
}

function saveReminder(phone, message) {
	var notif = getNotifObject(phone, message);

	notif.save(function (err) {
		if(err) {
			console.log(err);
		}
		else {
			console.log("Saved notif");
		}
	});
}

function getNotifObject(phone, message) {
	var obj = {};
	obj.phones = [];
	obj.phones.push(phone);
	obj.head = "VOUCHER_REMINDER_MESSAGE";
	obj.body = message;
	obj.message_type = "VOUCHER_REMINDER";
	obj.status = 'DRAFT';
	obj.message_type = "SMS";
	obj.logged_at = Date.now();
	obj.scheduled_at = new Date(getSmsScheduleTime());

	return new Notif(obj);
}

function getSmsScheduleTime() {
	var today = new Date();
	var day = today.getDate(),
		month = today.getMonth(),
		year = today.getFullYear();
	return new Date(year, month, day, 11, 30);
}

function pickVoucher(vouchers) {
	if(!(vouchers && vouchers.length)) {
		return null;
	}
	return vouchers[0];
} 

function processConsole(info) {
	if(info.vouchers.length > 1){
		console.log(info.user.phone)
		info.vouchers.forEach(function (v) {
			console.log(v._id)
			console.log(v.basics.description)
		});
	}
}

function getUserTransport(user) {
	var user_transports = {
		'CONSOLE': false,
		'EMAIL': false,
		'PUSH': false,
		'SMS': true
	};
	return user_transports;
}

function rewardify(input) {
    if (input.reward.custom && input.reward.custom.text) {
        return input.reward.custom.text;
    } else if (input.reward.flat && (input.reward.flat.off || input.reward.flat.spend)) {
        if(input.reward.flat.off && input.reward.flat.spend) {
            return "Rs. " + ifEmpty(input.reward.flat.off) + " off on a min spend of Rs." + ifEmpty(input.reward.flat.spend);
        }
        if(input.reward.flat.off) {
            return "Rs. " + ifEmpty(input.reward.flat.off) + " off on your bill";
        }
    } else if (input.reward.free && (input.reward.free.title || input.reward.free._with)) {
        if(input.reward.free.title && input.reward.free._with) {
            return "A free " + ifEmpty(input.reward.free.title) + " with " + ifEmpty(input.reward.free._with);
        }
        if(input.reward.free.title) {
            return "A free " + ifEmpty(input.reward.free.title);
        }
    } else if (input.reward.buy_one_get_one && input.reward.buy_one_get_one.title) {
        return "Buy one get one " + ifEmpty(input.reward.buy_one_get_one.title);
    } else if (input.reward.reduced && (input.reward.reduced.what || input.reward.reduced.worth || input.reward.reduced.for_what)) {
        if(input.reward.reduced.what && input.reward.reduced.worth) {
           return ifEmpty(input.reward.reduced.what) + " worth Rs. " + ifEmpty(input.reward.reduced.worth) + " for Rs. " + ifEmpty(input.reward.reduced.for_what);
        }
    } else if (input.reward.happyhours && input.reward.happyhours.extension) {
        return "Extended happy hours by " + ifEmpty(input.reward.happyhours.extension);
    } else if (input.reward.discount) {
        if (input.reward.discount.max) {
            return ifEmpty(input.reward.discount.percentage) + " off, subject to a max discount of Rs." + ifEmpty(input.reward.discount.max);
        } else {
            return ifEmpty(input.reward.discount.percentage) + " off on your bill";
        }
    } else {
        return ifEmpty(input.basics.description);
    }

    function ifEmpty(input) {
        if(input) {
            return input;
        }
        return '';
    }
}