/* file: dbus.js
 * Author: aaaa
 * Created on 2019-12-23
 * Description: ffff
 */

var DBus = require('dbus');

var exec = require('child_process').exec;

module.exports = class {
  constructor() {
    this.services = {
    };
    this.selected = '';

    this.bus = DBus.getBus('session');
    console.log(this.bus);
    this.list();
  }

  switchSelected() {
    let first = '';
    let newSelected = '';
    let next = 0;
    for (const [key, value] of Object.entries(this.services)) {
      if (first == '') {
        first = key;
      }
      if (next === 1) {
        newSelected = key;
        break;
      }
      if (key === this.selected) {
        next = 1;
      }
      //console.log(key, value, first, newSelected, next);
    }
    if (newSelected === '') {
      newSelected = first;
    }
    //console.log('selection', this.services, this.selected, newSelected);
    this.selected = newSelected;
  }

  noServices() {
    for(var prop in this.services) {
      if(this.services.hasOwnProperty(prop)) {
        return false;
      }
    }
    return JSON.stringify(this.services) === JSON.stringify({});
  }

  list() {
    exec('qdbus | egrep -i \'org.mpris.MediaPlayer2|plasma-browser-integration\'', (error, stdout, stderr) => {
      let arr = stdout.split("\n");
      this.services={};
      let remaining = arr.length;
      let found = false;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== '') {
          let servicename=arr[i].replace(/ /g,'');
          //console.log('player', "-"+servicename+"-");
          this.getIdentity(servicename, (err, identity) => {
            if (!err && identity) {
              //console.log('identity', identity);
              this.playStatus(servicename, (err, status) => {
                if (!err && status) {
                  remaining--;
                  this.services[servicename] = {identity: identity, status: status};
                  //console.log(identity, status, remaining);
                  if (this.selected === '' && status === 'Playing') {
                    this.selected = servicename;
                  }
                  if (this.selected === servicename) {
                    found = true;
                  }
                  if (remaining == 0) {
                    if (this.selected === '' || found === false) {
                      this.selected = servicename;
                      //console.log('default service', servicename);
                    }
                  }
                } else {
                  remaining--;
                }
              });
            }
          });
        } else {
          remaining--;
        }
      }
      if (this.noServices()) {
        this.selected = '';
      }
    });
  }

  getIdentity(service, cb) {
    if (service.includes('chrome')) {
      cb(undefined, 'Chrome');
      return;
    }
    if (service.includes('chromium')) {
      cb(undefined, 'Chromium');
      return;
    }
    //console.log('service', service);
    this.bus.getInterface(service, '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2', (err, iface) => {
      if (err) {
        console.error(service, err);
        cb(err);
        return;
      }

      iface.getProperty('Identity', (err, value) => {
        //console.log('Identity', service, value);
        cb(undefined, value);
      });

    });
  }

  playStatus(service, cb) {
    service = service || this.selected;
    if (this.noServices()) {
      cb(undefined, 'Unknown');
      return;
    }
    if (service.includes('chrome')) {
      cb(undefined, 'Unknown');
      return;
    }
    //console.log('service', service);
    this.bus.getInterface(service, '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player', (err, iface) => {
      if (err) {
        console.error(err);
        cb(err);
        return;
      }

      iface.getProperty('PlaybackStatus', (err, value) => {
        //console.log(service, '.PlaybackStatus', value);
        if(this.services[service]) this.services[service].status = value;
        cb(undefined, value);
      });

    });
  }

  metadata(cb) {
    if (this.noServices()) {
      cb(undefined, 'Unknown');
      return;
    }
    if(this.services[this.selected].status == 'Playing') {
      this.bus.getInterface(this.selected, '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player', (err, iface) => {
        let title = '                    ';
        let artist = '                    ';
        let album = '                    ';
        if (err) {
          console.error(err);
          cb(err, artist, title, album);
          return;
        }

        iface.getProperty('Metadata', (err, value) => {
          if(!err && value) {
            //console.log('Metadata', value);
            title = value['xesam:title'] || '                    ';
            artist = value['xesam:artist'] ? value['xesam:artist'].join('') : '                    ';
            album = value['xesam:album'] || '                    ';
            cb(undefined, artist, title, album);
          } else {
            cb (undefined, '', '');
          }
        });
      });
    } else {
      cb();
    }
  }

  method(action, cb) {
    cb = cb || function () {};
    if (this.noServices()) {
      cb(undefined, 'Unknown');
      return;
    }
    if (this.selected.includes('chrome')) {
      exec('dbus-send --session --print-reply --dest=' + this.selected
           +  ' /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.' + action, (error, stdout, stderr) => {
             //console.log(error, stdout, stderr);
             cb();
           });
      return;
    }

    this.bus.getInterface(this.selected, '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player', (err, iface) => {
      if (err) {
        console.error('Method - get interface error',err);
        cb(err);
        return;
      }

      console.log('action', action);
      switch(action) {
      case 'PlayPause':
        iface.PlayPause((err, value) => {
          if (err) {
            console.error('Method - PlayPause error', err);
            cb(err);
            return;
          }
          cb(undefined);

        });
        break;
      case 'Previous':
        iface.Previous((err, value) => {
          if (err) {
            console.error(err);
            cb(err);
            return;
          }
          this.playStatus(this.selected, (err, value) => {
            if (err) {
              console.error(err);
              cb(err);
              return;
            }
            console.log(value);
            cb(undefined, value);
          });
        });
        break;
      case 'Next':
        iface.Next((err, value) => {
          if (err) {
            console.error(err);
            cb(err);
            return;
          }
          this.playStatus(this.selected, (err, value) => {
            if (err) {
              console.error(err);
              cb(err);
              return;
            }
            console.log(value);
            cb(undefined, value);
          });
        });
        break;
      }

    });

  }
};
