var recursive = require('recursive-readdir'),
	AWS = require('aws-sdk'),
	fs = require('fs'),
	mongoose = require('mongoose'),
	Settings = require('./config/settings');

AWS.config.update(Settings.values.aws_config);
require('./config/config_models')();
mongoose.connect('mongodb://localhost/twyst');
var Outlet = mongoose.model('Outlet');

// Outlet.find({}, function (err, outlets) {
// 	outlets.forEach(function (o) {
// 		o.photos = {};
// 		o.photos.others = [];
// 		console.log(o.photos)
// 		o.save(function (err) {
// 			console.log(err)
// 		})
// 	})
// })	

function uploader(upload_object, cb) {
	var s3 = new AWS.S3();
	s3.client.putObject(upload_object, function (err, data) {
	    console.log(err || data)
	    cb(err, data)
  	});
}
main();
function main() {
	var slug = "";
	recursiveReader(slug, function (files) {
		console.log(files)
		files.forEach(function (f) {
			splited_file = f.split('\\');
			var slug = splited_file[2]
			if(splited_file[3] === 'logo.png') {
				readOutlet(slug, function (outlets) {
					outlets.forEach(function (outlet) {
						var image_object = getImageObject('logo', f, outlet);
						uploader(image_object, function (err, s) {
							saveOutlet(outlet._id, 'logo', 'logo');
						})
					})
				})
			}
			else if(splited_file[3] === 'logo1.png') {
				readOutlet(slug, function (outlets) {
					outlets.forEach(function (outlet) {
						var image_object = getImageObject('logo_gray', f, outlet);
						uploader(image_object, function (err, s) {
							saveOutlet(outlet._id, 'logo_gray', 'logo_gray')
						})
					})
				})
			}
			else if(splited_file[3] === 'Background.png') {
				readOutlet(slug, function (outlets) {
					outlets.forEach(function (outlet) {
						var image_object = getImageObject('background', f, outlet);
						uploader(image_object, function (err, s) {
							saveOutlet(outlet._id, 'background', 'background');
						})
					})
				})
			}
			// else {
			// 	readOutlet(slug, function (outlets) {
			// 		outlets.forEach(function (outlet) {
			// 			var image_object = getImageObject(null, f, outlet);
			// 			uploader(image_object, function (err, s) {
			// 				saveOutlet(outlet._id, 'others', image_object.Key);
			// 			})
			// 		})
			// 	})
			// }
		})
	});
}

function getImageObject(type, image_path, outlet) {
        var imageObject = {
        	ACL : 'public-read',
            Bucket : "twyst-outlets/"+ outlet._id,
            ContentType: 'image/png',
            Key: type ? type : Date.now().toString(),
            Body: fs.readFileSync(image_path)
        };
        imageObject.Bucket = imageObject.Bucket.replace(/[^a-zA-Z0-9-\/]/g,'-')
        return imageObject;
    }

function recursiveReader(slug, cb) {
	recursive('E:/merchants/' + slug, function (err, files) {
		cb(files);
	})
}

function readOutlet(slug, cb) {
	Outlet.find({
		'basics.slug': slug
	}, function (err, outlets) {
		cb(outlets);
	})
}

function saveOutlet(id, type, url) {
	Outlet.findOne({
		_id: id
	}, function (err, outlet) {
		if(JSON.stringify(outlet.photos)[0] === '[') {
            delete outlet.photos;
            outlet.photos = {};
        }
        if(type === 'others') {
        	var image = {
        		image: url,
        		title: url,
        		approved: true
        	}
        	outlet.photos.others.push(image);
        }
        else {
        	outlet.photos[type] = url
        }
		console.log(outlet.photos)
		outlet.save(function (err) {
			console.log("Saved")
		})
	})
}