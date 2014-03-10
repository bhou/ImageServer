var fs = require('fs');
var request = require('request');
var mkdirp = require('mkdirp');
var moment = require('moment');
var crypto = require('crypto');
var uuid = require('node-uuid');

var config = require('../config');

var download = function(uri, path, filename, callback, errCallback){
  var prefix = config.path + '/' + path;
  request.head(uri, function(err, res, body){
    if (err != null && typeof err != 'undefined') {
      errCallback(err);
    }

    if (res.statusCode == 200) {
      mkdirp(prefix, function (err) {
        if (err) {
          console.error(err);
        } else {
          request(uri).pipe(fs.createWriteStream(prefix+'/'+filename)).on('close', callback);
        }
      });
    }else{
      errCallback("404 Not found");
    }
  });
};

function getSignature(text) {
  var hmac = crypto.createHmac("sha1", 'BHOUSTUDIO');
  hmac.update(text);

  return hmac.digest("hex");
}

function getExtension(filename) {
  var i = filename.lastIndexOf('.');
  return (i < 0) ? '' : filename.substr(i);
}

function generatePath() {
  var date = moment().format('MMDD/YYYY');
  return date;
}

function generateFileName() {
//  return getSignature(moment().format());
  return uuid.v4();
}

function prepareImage(res, resObj, url, count) {
  // generate path
  var path = generatePath();
  var file = generateFileName();
  var ext = getExtension(url);

  if (ext == null || typeof ext == 'undefined') {
    return;
  }

  var lowerExt = ext.toLowerCase();
  if (lowerExt != '.jpg' && lowerExt != '.png' && lowerExt != '.gif') {
    return;
  }

  // download the image and save it
  download(url, path, file + lowerExt,
    // call back for succeed
    function(){
      resObj[url] = path+'/' + file + lowerExt;
      if (Object.keys(resObj).length == count) {
        res.writeHead(200, "OK", {'Content-Type': 'text/plain'});
        res.end(JSON.stringify(resObj));
      }
    },

    // call back for error
    function(err){
      resObj[url] = null;
      if (Object.keys(resObj).length == count) {
        res.writeHead(200, "OK", {'Content-Type': 'text/plain'});
        res.end(JSON.stringify(resObj));
      }
    });
};

exports.createImage = function(req, res) {
  var body = '';
  req.on('data', function(chunk) {
    body += chunk;
  });

  req.on('end', function() {
    var images = [];
    try {
      images = JSON.parse(body);
    } catch (e) {
      console.error(e);
      res.writeHead(435, 'Invalid JSON format', {'Content-Type': 'text/plain'});
      res.end();
    }

    var resObj = {};

    for (var i = 0; i < images.length; i++) {
      prepareImage(res, resObj, images[i], images.length);
    }
  });
}
