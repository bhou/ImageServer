var http = require('http');
var config = require('../config')
var imageprocessor = require('../lib/imageprocessor');

http.createServer(function (req, res) {
  if (req.method == 'POST') {
    imageprocessor.createImage(req, res);
  } else {
    res.writeHead(404, {
      "Content-Type": "text/plain"
    });
    res.write("404 Not Found\n");
    res.end();
  }
}).listen(config.port, '0.0.0.0');

console.log('Server running at http://0.0.0.0:'+config.port);