var csv = require('csv');
var fs = require("fs");
var account = require('../models/account.js');

var mongoose = require('mongoose');
var Account = mongoose.model('Account');

mongoose.connect('mongodb://localhost/twyst');

	Account.findOne({role: {$in: [6,7]}}, function(err,	account) {
		if (err) {
			console.log(err);
		} 
		else {
			if (!account) {
				console.log("Not found!");
			} 
			else {
				if(account.role === 7 && account.facebook !== undefined || (account.social_graph !== undefined && account.social_graph.facebook !== undefined)) {
					if(account.profile.email && !account.validated.email_validated.is_welcome_mailer_sent)  {
						//Send Welcome Mail if not sent

					}
	          	}
	          	else {
	          		//do nothing
	          	}
				if(account.role === 7 && account.facebook === undefined && account.social_graph.facebook === undefined) {
					if(!account.validated.email_validated.status && !account.validated.email_validated.token) {
						//send verification mail
					}
					else {

					}
	          	}

	          	if(account.role === 7 && account.facebook === undefined && account.social_graph.facebook === undefined) {
					if(account.validated.email_validated.status && !account.validated.email_validated.is_welcome_mailer_sent) {
						//send welcome mail
					}
					else {

					}
	          	}

	          	if(account.role === 6 && account.facebook === undefined && account.social_graph.facebook === undefined) {
					if(!account.validated.email_validated.status && !account.validated.email_validated.is_app_upgrade_mailer_sent) {
						//send app upgrade mailer mail
					}
					else {

					}
	          	}

				if(account.role === 6 && account.facebook === undefined && account.social_graph.facebook === undefined) {
					if(account.validated.email_validated.status && !account.validated.email_validated.is_welcome_mailer_sent) {
						//send welcome  mail
					}
					else {

					}
	          	}	          	 
		        
	            	//account.updated_at = new Date();
	    			console.log("Saving");
					
			   		
	    			account.save(function(s, err) {
	    				//console.log(s);
	    				console.log(err);
	    			});  
			   		console.log('found ' + found) 			
	    		}
	    	}	 
		}
	})  	     		    
	