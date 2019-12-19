/* file: server.js
 * Author: Gregory Brusick <brusick@evok.com>
 * Created on 2019-12-19
 * Description: MediaConstrol Main file
 */

var HID = require('node-hid');
var DBus = require('dbus');
var loudness = require('loudness');
var util = require('util');
var exec = require('child_process').exec;

var services = {};
var selected = 'org.mpris.MediaPlayer2.vlc';


var devices = HID.devices();
var device;
var deviceInfo = devices.find( function(d) {
  var isTeensy = d.vendorId===0x16C0 && (d.productId===0x0480 || d.productId===0x0486);
  return isTeensy;// && d.usagePage===0xFFAB && d.usage===0x200;
});
//console.log('deviceInfo',deviceInfo);
if( deviceInfo ) {
  device = new HID.HID( deviceInfo.path );

  //console.log(device);
  // ... use device
  device.on("data", receivedData);
}

var bus = DBus.getBus('session');
//console.log(bus);
DBusList();

loudness.getVolume( (err, vol) => {
  console.log('volume', err, vol);
    // vol = 45
});
loudness.getMuted( (err, muted) => {
  console.log('muted', err, muted);
    // vol = 45
});

setInterval(() => {
  if (!services[selected]) {
    selected='';
  }
  DBusList();
  console.log('***Satus', selected, services[selected].status);
}, 10000);

function receivedData(data) {
  if (data[0] == 0x66) {
    console.log(util.format("received command", data[1]));
    runCommand(data);
  } else if (data[0] == 0x67) {
    console.log(util.format("received request", data[1]));
    getInfo(data);
  } else if (data[0] == 0x68) {
    console.log(util.format("received switchmode", data[1]));
    switchMode(data);
  }
  console.log('received:', data[0], data[1]);
}

function sendPlayerStatus() {
  let data = new Array(64).fill(0);;
  data[0] = 0x60;
  data[1] = 0x01;
  for (let i = 0; i < services[selected].identity.length && i < 20; i++) {
    data[2 + i] = services[selected].identity[i];
  }
  for (let i = 0; i < services[selected].status.length && i < 20; i++) {
    data[2 + 20 + i] = services[selected].status[i];
  }
  console.log('status buffer', data);
  device.write(data);
}

function sendMetadata(artist, title, album) {
  let data = new Array(64).fill(0);;
  data[0] = 0x60;
  data[1] = 0x02;
  for (let i = 0; i < artist.length && i < 20; i++) {
    data[2 + i] = artist[i];
  }
  for (let i = 0; i < title.length && i < 20; i++) {
    data[2 + 20 + i] = title[i];
  }
  for (let i = 0; i < album.length && i < 20; i++) {
    data[2 + 40 + i] = album[i];
  }
  console.log('status buffer', data);
  device.write(data);
}

function runCommand(data) {
  switch(data[1]) {
  case 0x01:
    DBusMethod('Previous', (err) => {
      setTimeout(updateStatus, 400);
    });
    break;
  case 0x02:
    DBusMethod('PlayPause', (err) => {
      setTimeout(updateStatus, 400);
    });
    break;
  case 0x03:
    DBusMethod('Next', (err) => {
      setTimeout(updateStatus, 400);
    });
    break;
  }
}

function updateStatus() {
  DBusPlayStatus(selected, (err, value) => {
    if (err) {
      console.error(err);
      cb(err);
      return;
    }
    console.log(value);
    services[selected].status = value;
    sendPlayerStatus(value);
    if (value === 'Playing') {
      DBusMetadata((err, artist, title, album) => {
        sendMetadata(artist, title, album);
      });
    }
  });
}

function getInfo(data) {

}

function switchMode(data) {

}

function DBusList() {
  exec('qdbus | egrep -i \'org.mpris.MediaPlayer2|plasma-browser-integration\'', function(error, stdout, stderr){
    let arr = stdout.split("\n");
    services={};
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] !== '') {
        let servicename=arr[i].replace(/ /g,'');
        //console.log('player', "-"+servicename+"-");
        DBusGetIdentity(servicename, (err, identity) => {
          if (!err && identity) {
            DBusPlayStatus(servicename, (err, status) => {
              if (!err && status) {
                services[servicename] = {identity: identity, status: status};
                if (selected === '') {
                  selected = servicename;
                }
              }
            });
          }
        });
      }
    }
  });
}

function DBusGetIdentity(service, cb) {
  bus.getInterface(service, '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2', function(err, iface) {
    if (err) {
      //console.error(err);
      cb(err);
      return;
    }

    iface.getProperty('Identity', (err, value) => {
      //console.log('Identity', value);
      cb(undefined, value);
    });

  });
}

function DBusPlayStatus(service, cb) {
  bus.getInterface(service, '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player', function(err, iface) {
    if (err) {
      //console.error(err);
      cb(err);
      return;
    }

    iface.getProperty('PlaybackStatus', (err, value) => {
      //console.log('PlaybackStatus', value);
      cb(undefined, value);
    });

  });
}

function DBusMetadata(cb) {
  bus.getInterface(selected, '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player', function(err, iface) {
    if (err) {
      //console.error(err);
      cb(err);
      return;
    }

    iface.getProperty('Metadata', (err, value) => {
      console.log('Metadata', value);
      let title = value['xesam:title'] || '';
      let artist = value['xesam:artist'] || '';
      let album = value['xesam:album'] || '';
      cb(undefined, artist, title, album);
    });

  });
}

function DBusMethod(action, cb) {
  bus.getInterface(selected, '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player', function(err, iface) {
    if (err) {
      console.error(err);
      cb(err);
      return;
    }

    console.log('action', action);
    switch(action) {
    case 'PlayPause':
      iface.PlayPause((err, value) => {
        if (err) {
          console.error(err);
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
        DBusPlayStatus(selected, (err, value) => {
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
        DBusPlayStatus(selected, (err, value) => {
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
