var csv = require('csv');
var fs = require("fs");
var account = require('../models/account.js');

var mongoose = require('mongoose');
var Account = mongoose.model('Account');

mongoose.connect('mongodb://localhost/twyst');
var found = 0;
csv()
	.from.stream(fs.createReadStream(__dirname + '/user_details.csv', { encoding: 'utf8' }))
	.on('record', function (row, index) {
		console.log(row[0], row[1], row[2], row[3], new Date(row[6], row[5]-1, row[4]), row[7])
	   	
	   		Account.findOne({phone:row[7]}, function(err,	account) {
		    	if (err) {
		    		console.log(err);
		    	} 
		    	else {
		    		if (!account) {
		    			console.log("Not found!");
		    		} 
		    		else {
		    			if(account.profile === undefined) {
				            account.profile.first_name = row[0] || '';
				            account.profile.middle_name = row[1] || '';
				            account.profile.last_name = row[2] || '';
				            account.profile.email = row[3] || '';
				            account.profile.bday.d = row[4] || '';
				            account.profile.bday.m = row[5] || '';
				            account.profile.bday.y = row[6] || '';	       
				            console.log('All Updated');				          
			          	}
				        else {
				            if(account.profile !== undefined &&
				            (account.profile.first_name === undefined || account.profile.first_name === '' ||
				              account.profile.first_name === null)){
				            account.profile.first_name = row[0] || '';
				            console.log('firstName Updated');
				            }

				            if(account.profile !== undefined &&
				              (account.profile.middle_name === undefined || account.profile.middle_name === '' ||
				                account.profile.middle_name === null)){
				              account.profile.middle_name = row[1] || '';
				              console.log('middleName Updated');
				            }

				            if(account.profile !== undefined &&
				              (account.profile.last_name=== undefined || account.profile.last_name === '' ||
				                account.profile.last_name === null)){
				              account.profile.last_name = row[2] || '';
				              console.log('lastName Updated');
				            }

				            if(account.profile !== undefined &&
				              (account.profile.email !== undefined && account.profile.email !== '' &&
				                account.profile.email !== null)){
				              account.profile.email = account.profile.email.toLowerCase() || '';	
				              found= found + 1;			              			    
				              console.log('email Updated');
				              
				            }
				

				            if(account.profile !== undefined &&
				              (account.profile.bday === undefined || account.profile.bday === '' || 
				                account.profile.bday === null)){
				              account.profile.bday.d = row[4] || '';
				              account.profile.bday.m = row[5] || '';
				              account.profile.bday.y = row[6] || '';
				              console.log('bday Updated');
				            }
				            else {
				              	if(account.profile !== undefined && account.profile.bday !== undefined &&
				              	(account.profile.bday.d === undefined || account.profile.bday.d === '' || 
				                account.profile.bday.d === null)){
				              	account.profile.bday.d = row[4] || '';
				              	console.log('date Updated ' + account.profile.bday.d);
				              	}
				              	if(account.profile !== undefined && account.profile.bday !== undefined &&
				                	(account.profile.bday.m === undefined || account.profile.bday.m === '' ||
				                  	account.profile.bday.m === null)){
				                	account.profile.bday.m = row[5]
				                	console.log('month Updated');
				              	}
				              	if(account.profile !== undefined && account.profile.bday !== undefined &&
				                (account.profile.bday.y === undefined || account.profile.bday.y === '' || 
				                  account.profile.bday.y === null)){
				                account.profile.bday.y = row[6] || '';
				                console.log('year Updated');
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
	})
	.on('end', function (count) {
		console.log("I am finished.")
	})