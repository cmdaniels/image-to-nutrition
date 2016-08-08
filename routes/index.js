var express = require('express');
var router = express.Router();
var request = require('request');
var multer = require('multer');
var upload = multer({ dest: 'uploads/' });
var fs = require('fs');
var path = require('path');
var usdaApiKey = 'JytNfbKXYcb96snmidZa1ZaPLl9xHKlFwqitvNGm';
var watsonApiKey = 'f464588b9f416cd8a58c218f51dda62605223b0b';
var watson = require('watson-developer-cloud');

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', {
		title: 'Home'
	});
});

var cpUpload = upload.fields([{ name: 'pic', maxCount: 1 }]);
router.post('/image', cpUpload, function(req, res, next) {
	fs.rename(path.join(__dirname, '..', req.files.pic[0].path), path.join(__dirname, '..', 'uploads/' + req.files.pic[0].path.split('/')[1] + '.jpg'), function(err) {
		if(err) {
			res.json(err);
		} else {
			var pathName = path.join(__dirname, '..', 'uploads/' + req.files.pic[0].path.split('/')[1] + '.jpg');
			var imageFile = fs.createReadStream(pathName);
			var formData = {
				image_file: imageFile
			};
			var visual_recognition = watson.visual_recognition({
				api_key: watsonApiKey,
				version: 'v3',
				version_date: '2016-05-19',
			});
			visual_recognition.classify(formData, function(error, result) {
				if(error) {
					res.json({
						error: error
					});
				} else {
					fs.unlink(pathName);
					res.redirect('/search/' + result.images[0].classifiers[0].classes[0].class);
				}
			});
		}
	});
});

router.get('/search/:item', function(req, res, next) {
	request('http://api.nal.usda.gov/ndb/search/?format=json&q=' + req.params.item + '&max=25&offset=0&api_key=' + usdaApiKey, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var itemId = JSON.parse(body).list.item[0].ndbno;
			request('http://api.nal.usda.gov/ndb/reports/?ndbno=' + itemId + '&type=s&format=json&api_key=' + usdaApiKey, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var results = JSON.parse(body).report.food;
					res.render('results', {
						title: results.name,
						id: results.ndbno,
						nutrients: results.nutrients,
						error: undefined
					});
				} else {
					res.render('results', {
						title: '',
						id: '',
						nutrients: [],
						error: JSON.parse(body).errors.error[0].message
					});
				}
			});
		} else {
			res.render('results', {
				title: '',
				id: '',
				nutrients: [],
				error: JSON.parse(body).errors.error[0].message
			});
		}
	});
});

module.exports = router;
