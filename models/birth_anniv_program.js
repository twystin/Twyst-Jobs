'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var BirthAnnivProgramSchema = new Schema ({
    name: {type: String, trim: true, required: true},
    slug: {type: String, trim: true, required: true},
    event_type: [{type: String, enum: ['birth', 'anniv']}],
    created_at : {type: Date, default: Date.now},
    modified_at: {type: Date, default: Date.now},
    status: {type: String, enum: ['active', 'archived', 'draft'], default: 'draft'},
    message: {
        sms: {type: String},
        push: {type: String},
        email: {type: String}
    },
    num_day_before: {type: Number, default: 7},
    outlets: [{type: Schema.ObjectId, ref: 'Outlet'}]
});

module.exports = mongoose.model('BirthAnnivProgram', BirthAnnivProgramSchema);