var mongoose = require('mongoose');
var async = require('async');

mongoose.connect('mongodb://localhost/twyst');

require('../config/config_models')();
require('../models/specialProgram.js');

var Special = mongoose.model('SpecialProgram'),
    Outlet = mongoose.model('Outlet'),
    Checkin = mongoose.model('Checkin'),
    Account = mongoose.model('Account');

main();

function main() {
    var days = null;
    getSpecialPrograms(function(err, specials) {
        if (err) {
            console.log("Error getting specials. " + new Date());
        } else {
            if (specials && specials.length > 0) {
                async.each(specials, function(w, callback) {
                    if (w.outlets.length > 0) {
                        getUsers(w, function(err, users) {
                            if (err) {
                                callback(err);
                            } else {
                                days = (w.validity &&
                                    w.validity.send_at &&
                                    w.validity.send_at.days_before) || 7;
                                getAccounts(users, days, function(a) {
                                    if (a !== undefined) {
                                        console.log("Matching user found!");
                                        console.log(a);
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

function getSpecialPrograms(cb) {
    // Do some filtering here.
    Special.find({})
        .populate('outlets')
        .exec(function(err, specials) {
            cb(err, specials);
        })
}

function getUsers(special, cb) {
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

function getAccounts(users, days, cb) {
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
                            cb(user);
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
