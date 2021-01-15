/* file: web.js
 * Author: Gregory Brusick <brusick@evok.com>
 * Created on 2019-12-26
 * Description: web
 */
var http = require('http');
var exec = require('child_process').exec;
var notifysend = require('notify-send');
var fs = require('fs');
var request = require('request');

module.exports = class {
  constructor(mc) {
    this.mc = mc;
    this.server = http.createServer((req, res) => {
      let q=req.url.split('?'),params={};
      if(q.length>=2){
        q[1].split('&').forEach((item)=>{
          try {
            params[item.split('=')[0]]=item.split('=')[1];
          } catch (e) {
            params[item.split('=')[0]]='';
          }
        });
      }
      //console.log(req, params);

      switch( params.action ) {
      case 'call':
        this.download( 'http://torres.lan.evok.ch/' + params.number + '.png', '/var/www/html/tmp/' + params.number + '.png', (err) => {
          let img = 'default';
          if(!err) {
            img = params.number;
          }
          let name = decodeURI(params.name);
          notifysend.icon('/var/www/html/tmp/' + img + '.png').notify('Call From', name + ' (' + params.number + ')');
          this.mc.pause('Call From: ', name, params.number);
        });

      }


      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.write('OK');
      res.end();


    }).listen(30606);
  }

  download (uri, filename, callback){
    request.head(uri, function(err, res, body){
      if(err) {
        callback(err);
      } else {
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);

        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
      }
    });
  };

  notifyMe (level, title, body) {
    _log.info('notifyMe', level, title, body);

    let urgency = '';
    if (level === 'CRITICAL') {
      urgency = ' --urgency=critical';
    } else if (level === 'OK' || level === 'UP') {
      urgency = ' --urgency=low';
    }
    exec('/usr/bin/send-notify \'' + title + '\' \'' + body + '\' --icon=/var/www/html/nagios_logo.png' + urgency, (error, stdout, stderr) => {
      if (error) {
        _log.error(`exec error: ${error}`);
        return;
      }
      _log.debug(`stdout: ${stdout}`);
      _log.debug(`stderr: ${stderr}`);
    });
  }
}
