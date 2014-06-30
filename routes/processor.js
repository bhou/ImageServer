/**
 * Created by BHOU on 5/22/14.
 */
var processor = require('../lib/imageprocessor');

/**
 * download images from web
 * @param req
 * @param res
 */
function download(req, res) {
  processor.createImage(req, res);
}

/**
 * upload image from PC
 * @param req
 * @param res
 */
function upload(req, res) {

}

/**
 * resize image
 * url: root/:id
 * body: {
 *  "width" : width,
 *  "height" : height,
 *  "option" : '^'
 * }
 * @param req
 * @param res
 */
function resize(req, res) {
  var id = req.params.id;

  if (id == null) {
    res.writeHead(404, "Not Found", {'Content-Type': 'text/plain'});
    res.end();
  }

  var body = '';
  req.on('data', function(chunk) {
    body += chunk;
  });

  req.on('end', function() {
    var params = [];
    try {
      params = JSON.parse(body);
    } catch (e) {
      console.error(e);
      res.writeHead(435, 'Invalid JSON format', {'Content-Type': 'text/plain'});
      res.end();
      return;
    }

    processor.resizeAndCropImage(req, res, id, params.width, params.height, params.option, params.crop);
  });
}

function vignette(req, res){
  var id = req.params.id;

  if (id == null) {
    res.writeHead(404, "Not Found", {'Content-Type': 'text/plain'});
    res.end();
  }

  var body = '';
  req.on('data', function(chunk) {
    body += chunk;
  });

  req.on('end', function() {
    var params = [];
    try {
      params = JSON.parse(body);
    } catch (e) {
      console.error(e);
      res.writeHead(435, 'Invalid JSON format', {'Content-Type': 'text/plain'});
      res.end();
      return;
    }

    processor.vignette(req, res, id, req.params.name, req.params);
  });
}

module.exports = {
  download: download,
  upload: upload,
  resize: resize,
  vignette: vignette
}