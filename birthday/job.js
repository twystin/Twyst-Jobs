// Arun Rajappa
// 11th March 2015

var mongoose = require('mongoose');
var async = require('async');
var schedule = require('node-schedule');
require('../config/config_models')();
var Special = mongoose.model('SpecialProgram'),
  Outlet = mongoose.model('Outlet'),
  Checkin = mongoose.model('Checkin'),
  Account = mongoose.model('Account'),
  Voucher = mongoose.model('Voucher'),
  keygen = require("keygenerator"),
  Transport = require('./transport');

var job = schedule.scheduleJob({hour: 4, minute: 30, dayOfWeek: [new schedule.Range(0,6)]}, main);
main();
function main() {
  mongoose.connect('mongodb://localhost/twyst');
  getSpecialPrograms(function(err, specials) {
    if (err) {
      console.log("Error getting special programs " + new Date());
    } else {
      console.log('running job at ' + new Date() + specials)
      processSpecialPrograms(specials);
    }
  });
};

function getSpecialPrograms(cb) {
  // Do some filtering here.
  Special.find({
      'status': 'active'
    })
    .populate('outlets')
    .exec(function(err, specials) {
      cb(err, specials);
    })
}

function processSpecialPrograms(specials) {
  var days = null;
  if (specials && specials.length > 0) {
    async.each(specials, processSpecialProgram, function(err) {
      if (err) {
        console.log("Error executing the job: " + new Date());
      } else {
        console.log("Done processing the special programs " + new Date());
      }
    })
  } else {
    console.log("No special programs found currently." + new Date());
  }
}

function processSpecialProgram(special, callback) {
  if (special.outlets.length > 0) {
    findUsersWithCheckinsAtThisOutlet(special, function(err, users) {
      if (err) {
        callback(err);
      } else {
        days = (special.validity &&
          special.validity.send_at &&
          special.validity.send_at.days_before) || 7;

        getUsersWithBirthdayInTheHorizon(users, days, function(u, c) {
          if (u !== undefined) {
            Voucher.findOne({
              'issue_details.issued_to': u._id,
              'basics.type': 'WINBACK',
              'basics.description': /birthday/ 
            }).exec(function (err, voucher) {
              if(err) {
                console.log(err)
              }
              else if(voucher) {
                console.log('voucher already generated ');
              }
              else {
                saveVoucher(u, special, sendMessage);
              }
            })
            
          } else {
            console.log("Error: Undefined user");
          }
        })
      }
    });
  } else {
    console.log("Special program has no outlets. Special ID: " + special._id + ' ' + new Date());
  }
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
          console.log("Error finding the account");
        } else {
          if (user) {
            // Should not hard code this to 2015.
            birthday = new Date(2015, user.profile.bday.m - 1, user.profile.bday.d);
            delta = birthday.getTime() - jobdate.getTime();
            if (delta < days * 24 * 60 * 60 * 1000 && delta > 0) {
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
  voucher.save(function(err) {
    cb(err, user, special, voucher);
  })
}

function sendMessage(err, u, w, v) {
    if (err) {
      console.log(err);
    } else {
      Transport.handleMessage(u, w, v);
    }
}

function getVoucherObject(special, user) {
  //console .log(JSON.stringify(special))
  var voucher = {
    basics: {
      code: keygen._({
        forceUppercase: true,
        length: 6,
        exclude: ['O', '0', 'L', '1']
      }),
      type: 'WINBACK',
      description: Transport.rewardify(special)
    },
    validity: {
      start_date: new Date(),
      end_date: special.validity.earn_end,
      //number_of_days: winback.validity.voucher_valid_days
    },
    issue_details: {
      birthday: special._id,
      issued_at: special.outlets.map(function(o) {
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
