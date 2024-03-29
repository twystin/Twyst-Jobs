'use strict'; 
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var valid_hours = require("../common/operatingHours");

var VoucherSchema = new Schema({
    basics: {
        code: {type: String, trim: true, required: true, unqiue: true, index: true},
        description: {type: String, default: '', trim: true},
        type: {type: String, enum: ['WINBACK', 'CHECKIN', 'BIRTHDAY'], default: 'CHECKIN'},
        status : {type: String, enum: ['active', 'user redeemed', 'merchant redeemed'], default: 'active'},
        created_at : {type: Date, default: Date.now},
        modified_at: {type: Date, default: Date.now}
    },
    validity:{
        start_date: {type: Date, default: Date.now},
        end_date: {type: Date, default: Date.now},
        number_of_days: {type: String}
    },
    issue_details:{
        issue_date : {type: Date, default: Date.now},
        issue_time : {type: Date, default: Date.now},
        issued_at : [{type: Schema.ObjectId, ref: 'Outlet'}],
        issued_to : {type: Schema.ObjectId, ref: 'Account'},
        program: {type: Schema.ObjectId, ref: 'Program'},
        tier: {type: Schema.ObjectId, ref: 'Tier'},
        issued_for: {type: Schema.ObjectId, ref: 'Offer'},
        winback: {type: Schema.ObjectId, ref: 'Winback'},
        birthday: {type: Schema.ObjectId, ref: 'SpecialProgram'}
    },
    used_details: {
        used_by: {type: Schema.ObjectId, ref: 'Account'},
        used_at: {type: Schema.ObjectId, ref: 'Outlet'},
        used_date: {type: Date},
        used_time: {type: Date}
    },
    checkin_details: {
        checkin_id: {type: Schema.ObjectId, ref: 'Checkin'},
        batch: {type: Boolean, default: false}
    },
    applicable_hours:valid_hours.voucher_hours,
    reward: {},
    terms: {type: String}
});

module.exports = mongoose.model('Voucher', VoucherSchema);