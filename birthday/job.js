var mongoose = require('mongoose');
var async = require('async');

mongoose.connect('mongodb://localhost/twyst');

require('../config/config_models')();
require('../models/specialProgram.js');

var Special = mongoose.model('SpecialProgram'),
    Outlet = mongoose.model('Outlet'),
    Checkin = mongoose.model('Checkin'),
    Account = mongoose.model('Account'),
    Voucher = mongoose.model('Voucher'),
    keygen = require("keygenerator"),
    Transport = require('./transport');

main();

function main() {
    var days = null;
    getOutletsRunningSpecialPrograms(function(err, specials) {
        if (err) {
            console.log("Error getting specials. " + new Date());
        } else {
            if (specials && specials.length > 0) {
                async.each(specials, function(w, callback) {
                    if (w.outlets.length > 0) {
                        findUsersWithCheckinsAtThisOutlet(w, function(err, users) {
                            if (err) {
                                callback(err);
                            } else {
                                days = (w.validity &&
                                    w.validity.send_at &&
                                    w.validity.send_at.days_before) || 7;
                                getUsersWithBirthdayInTheHorizon(users, days, function(u, c) {
                                    if (u !== undefined) {
                                        saveVoucher(u, w, function(v) {
                                            Transport.handleMessage(u, w, v);
                                        });
                                    }
                                })
                            }
                        });
                    } else {
                        console.log("Special has no outlets. Special ID: " + w._id + ' ' + new Date());
                    }
                }, function(err) {
                    if (err) {
                        console.log("Error executing specials: " + new Date());
                    } else {
                        console.log("Done the specials " + new Date());
                    }
                })
            } else {
                console.log("No specials found currently." + new Date());
            }
        }
    });
}

function getOutletsRunningSpecialPrograms(cb) {
    // Do some filtering here.
    Special.find({})
        .populate('outlets')
        .exec(function(err, specials) {
            cb(err, specials);
        })
}

function findUsersWithCheckinsAtThisOutlet(special, cb) {
    Checkin.aggregate({
        $match: {
            outlet: {
                $in: special.outlets.map(function(o) {
                    return mongoose.Types.ObjectId(o._id);
                })
            }
        }
    }, {
        $group: {
            _id: '$phone',
            count: {
                $sum: 1
            }
        }
    }, {
        $match: {
            count: {
                $gte: 0
            }
        }
    }, function(err, op) {
        cb(err, op);
    })
}

function getUsersWithBirthdayInTheHorizon(users, days, cb) {
    var birthday = null;
    var delta = 0;
    var jobdate = new Date();
    async.each(users, function(u, callback) {
        if (u._id) {
            Account.findOne({
                phone: u._id,
                'profile.bday.d': {
                    $ne: null
                },
                'profile.bday.m': {
                    $ne: null
                }
            }, function(err, user) {
                if (err) {
                    //console.log("Error finding the account");
                } else {
                    if (user) {
                        // Should not hard code this to 2015.
                        birthday = new Date(2015, user.profile.bday.m - 1, user.profile.bday.d);
                        delta = birthday.getTime() - jobdate.getTime();
                        if (delta < days * 24 * 60 * 60 * 1000 && delta > 0) {
                            //console.log(birthday);
                            //console.log("Matching date found!!");
                            cb(user, u.count);
                        }
                    } else {
                        //console.log("Account is null");
                    }
                }
            })
        } else {
            console.log("Couldn't find the user!")
        }
    })
}

function saveVoucher(user, special, cb) {
    var voucher = getVoucherObject(special, user);
    voucher = new Voucher(voucher);
    voucher.save(function (err) {
        cb(err, voucher);
    })
}

function getVoucherObject(special, user) {
    var voucher = {
        basics: {
            code: keygen._({
                forceUppercase: true, 
                length: 6, 
                exclude:['O', '0', 'L', '1']
            }),
            type: 'BIRTHDAY',
            description: special.desc
        },
        validity: {
            start_date: new Date(),
            end_date: special.validity.earn_end,
            //number_of_days: winback.validity.voucher_valid_days
        },
        issue_details: {
            birthday: special._id,
            issued_at: special.outlets.map(function (o) {
                return o._id;
            }),
            issued_to: user._id
        }
    }
    voucher.validity.end_date = new Date(voucher.validity.end_date);
    voucher.validity.end_date = setHMS(voucher.validity.end_date, 23, 59, 59);
    return voucher;
}

function setHMS(date, h, m, s) {
    date.setHours(h || 0);
    date.setMinutes(m || 0);
    date.setSeconds(s || 0);
    return date;
}