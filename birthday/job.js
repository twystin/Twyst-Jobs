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
                                getAccounts(users, function(a) {
                                	if (a !== undefined) {
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

function getAccounts(users, cb) {
    async.each(users, function(u, callback) {
        if (u._id) {
            Account.findOne({
                phone: u._id,
                'profile.bday.d': {$ne:null}
            }, function(err, user) {
                if (err) {
                	console.log("Error finding the account");
                } else {
                	if (user) {
                		cb(user);
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
