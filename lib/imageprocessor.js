var fs = require('fs');
var request = require('request');
var mkdirp = require('mkdirp');
var moment = require('moment');
var crypto = require('crypto');
var uuid = require('node-uuid');
var shortId = require('shortid');
var gm = require('gm').subClass({imageMagick: true});
var config = require('../config');

/**
 * download an image from its url
 * @param uri   url used to download the image
 * @param path    the path used to save the image
 * @param filename    the new file name
 * @param callback
 * @param errCallback
 */
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

function generateFileName(url) {
  return shortId.generate();
  //return getSignature(url);
  //return uuid.v4();
}

function prepareImage(res, resObj, url, count) {
  // generate path
  var path = ''; //generatePath();
  var file = generateFileName(url);
  var ext = getExtension(url);

  if (ext == null || typeof ext == 'undefined') {
    return;
  }

  var lowerExt = ext.toLowerCase();
  if (lowerExt != '.jpg' && lowerExt != '.png' && lowerExt != '.gif') {
    return;
  }

  // download the image and save it
  path = file;
  download(url, path, 'origin' + lowerExt,
    // call back for succeed
    function(){
      if (lowerExt != '.jpg') {
        gm(config.path + '/' + path + '/origin' + lowerExt)
        .write(config.path + '/' + path + '/origin.jpg', function(err) {
          if (err) {
            console.error(err);
          }
        });
      }

      resObj[url] = file + '/origin' + lowerExt;
      if (Object.keys(resObj).length == count) {
        res.writeHead(200, "OK", {'Content-Type': 'text/plain'});
        res.end(JSON.stringify(resObj));
      }
    },

    // call back for error
    function(err){
      resObj[url] = null;
      if (Object.keys(resObj).length == count) {
        res.writeHead(600, "Failed to create image", {'Content-Type': 'text/plain'});
        res.end(JSON.stringify(resObj));
      }
    });
};


/**
 * create image from a url
 * @param req
 * @param res
 */
function createImage(req, res) {
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

/**
 * resize and crop image
 * @param id    image id
 * @param width   new width
 * @param height  new height
 * @param crop  where to make the crop, percent
 */
function resizeAndCropImage(req, res, id, width, height, option, crop, errCallback) {
  // read image
  var path = config.path + '/' + id + '/origin.jpg';
  var tmp = config.path + '/' + id + '/' + generateFileName(null) + '.jpg';
  gm(path).resize(width, height, option).write(tmp, function(err){
    if (err) {
      console.error(err);
      res.writeHead(404, "Not Found", {'Content-Type': 'text/plain'});
      res.end();
      return;
    }

    function cleanTmp() {
      fs.unlink(tmp, function(err){
        console.log('remove tmp image ' + tmp);
      });
    }
    gm(tmp).size(function(err, size){
      if (err) {
        cleanTmp();
        res.writeHead(404, "Not Found", {'Content-Type': 'text/plain'});
        res.end();
        console.error(err);
        return;
      }

      var x = 0;
      var y = 0;
      if (crop != null) {
        // crop along width
        if (size.width > width) {
          x = size.width * crop/100 - width/2;
        } else if (size.height > height) { // crop along height
          y = size.height * crop/100 - height/2;
        }
      }

      var pathToExport = config.path + '/' + id;
      var tmpCanvas = gm(tmp);
      var w = size.width;
      var h = size.height;
      if (crop != null) {
        tmpCanvas = tmpCanvas.crop(width, height, x, y);
        pathToExport += '/' + width + 'x' + height + '.jpg';
        w = width;
        h = height;
      }else {
        pathToExport += '/' + size.width + 'x' + size.height + '.jpg';
      }
      tmpCanvas.write(pathToExport, function(err){
        cleanTmp();

        if (err) {
          console.error(err);
          res.writeHead(404, "Not Found", {'Content-Type': 'text/plain'});
          res.end(config.path + '/' + id + '/' + w + 'x' + h + '.jpg');
          return;
        }

        res.writeHead(200, "OK", {'Content-Type': 'text/plain'});
        res.end(config.path + '/' + id + '/' + w + 'x' + h + '.jpg');
      });
    });
  });
}

function vignette(req, res, id, name, params) {
  var path = config.path + '/' + id + '/' + name + '.jpg';
  var tmp = config.path + '/' + id + '/' + generateFileName(null) + '.jpg';
  gm(path).size(function(err, size){
    if (err) {
      res.writeHead(404, "Not Found", {'Content-Type': 'text/plain'});
      res.end();
      console.error(err);
      return;
    }

    var pathToExport = config.path + '/' + id + '/' + name + '_vignette.jpg';
    gm(path).out('-background CEDAE8 -vignette 200x200').write(pathToExport, function(err){
      if (err) {
        console.error(err);
      }
    });
  });
}

module.exports = {
  createImage: createImage,
  resizeAndCropImage: resizeAndCropImage,
  vignette: vignette
}
