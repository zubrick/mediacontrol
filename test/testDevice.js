/* file: server.js
 * Author: Gregory Brusick <brusick@evok.com>
 * Created on 2019-12-19
 * Description: MediaConstrol Main file
 */

var HID = require('node-hid');
var util = require('util');

var services = {
  'org.mpris.MediaPlayer2.spotify': {
    identity: 'Spotify',
    status: 'Playing'
  },
  'org.mpris.MediaPlayer2.vlc': {
    identity: 'VLC Media Player',
    status: 'Paused'
  }
};
var selected = 'org.mpris.MediaPlayer2.spotify';
var vol = 10;
var muted = 0;

var volIncrement = 5;

var devices = HID.devices();
var device;
console.log(devices);
var deviceInfo = devices.find( function(d) {
  var isTeensy = d.vendorId===0x16C0 && (d.productId===0x0480 || d.productId===0x0486);
  return isTeensy && d.usagePage===65451 && d.usage===512;
});
console.log('deviceInfo',deviceInfo);
if( deviceInfo ) {
  device = new HID.HID( deviceInfo.path );

  console.log(device);
  // ... use device
  device.on("data", receivedData);
  device.on("error", (err) => {console.error(err);});
}
let dataInit = [];
for (let i = 0; i < 64; i++) {
  dataInit[i]=0;
}
dataInit[0] = 0x60;
dataInit[1] = 0x00;
device.write(dataInit);
updateStatus();

setInterval(() => {
  updateStatus();
}, 5000);

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

function sendLines(msgId, line1, line2, byte1, byte2) {

  //console.log(services, selected);
  let data = [];
  for (let i = 0; i < 64; i++) {
    data[i]=0;
  }
  data[0] = 0x60;
  data[1] = msgId;
  for (let i = 0; i < line1.length && i < 20; i++) {
    data[2 + i] = line1[i].charCodeAt(0);
  }
  for (let i = 0; i < line2.length && i < 20; i++) {
    data[2 + 20 + i] = line2[i].charCodeAt(0);
  }
  if(byte1) {
    data[60] = byte1;
  }
  if(byte2) {
    data[61] = byte2;
  }

  //console.log('status buffer', data[0], data[1], data);
  device.write(data);
}

function sendPlayerStatus(artist, title) {
  artist = artist || '';
  title = title || '';

  let status = services[selected].status;
  let stByte = 0x01;
  if (services[selected].status === 'Playing') {
    stByte = 0x02;
  }

  let mtByte = 0x01;
  if (muted) {
    status += ' - MUTED ';
    mtByte = 0x02;
  }

  sendLines(0x01, services[selected].identity, status, stByte, mtByte);
  if (services[selected].status === 'Playing') {
    sendLines(0x02, artist,title);
  } else {
    sendLines(0x02, '', '');
  }
}

function switchSelected() {
  let first = '';
  let newSelected = '';
  let next = 0;
  for (const [key, value] of Object.entries(services)) {
    if (first == '') {
      first = key;
    }
    if (next === 1) {
      newSelected = key;
    }
    if (key === selected) {
      next = 1;
    }
  }
  if (newSelected === '') {
    newSelected = first;
  }
  selected = newSelected;
  updateStatus();
}

function muteToggle() {
  muted = muted === 0 ? 1 : 0;
  updateStatus();
}

function changeVolume(direction) {
  if (muted) {
    muteToggle();
  }
  if (direction > 0 && vol < 100) {
    vol += volIncrement;
  } else if (direction < 0 && vol > 0) {
    vol -= volIncrement;
  }


  sendLines(0x01, services[selected].identity, services[selected].status);

  let line1 = 'Volume: ' + vol;
  let data = [];
  for (let i = 0; i < 64; i++) {
    data[i]=0;
  }
  data[0] = 0x60;
  data[1] = 0x02;
  for (let i = 0; i < line1.length && i < 20; i++) {
    data[2 + i] = line1[i].charCodeAt(0);
  }

  let nbSquares = 20*vol/100;
  for ( let i = 0; i < 20; i++) {
    if(i <= nbSquares) {
      data[2 + 20 + i] = 0xFF;
    } else {
      data[2 + 20 + i] = 0x00;
    }
  }
  console.log('changeVolume', vol, nbSquares);

  //console.log('status buffer', data[0], data[1], data);
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
    services[selected].status = services[selected].status === 'Playing' ? 'Paused' : 'Playing';
    DBusMethod('PlayPause', (err) => {
      setTimeout(updateStatus, 400);
    });
    break;
  case 0x03:
    DBusMethod('Next', (err) => {
      setTimeout(updateStatus, 400);
    });
    break;
  case 0x10:
    muteToggle();
    break;
  case 0x11:
    changeVolume(-1);
    break;
  case 0x12:
    changeVolume(1);
    break;
  case 0x20:
    switchSelected();
    break;
  }
}

function updateStatus() {
  DBusMetadata((err, artist, title, album) => {
    sendPlayerStatus(artist, title, album);
  });
}

function getInfo(data) {

}

function switchMode(data) {

}

function DBusList() {

}

function DBusGetIdentity(service, cb) {

  cb(undefined);

}

function DBusPlayStatus(service, cb) {

  cb(undefined);

}

function DBusMetadata(cb) {

  let title = 'Title';
  let artist = 'Artist';
  let album = 'Album';
  cb(undefined, artist, title, album);

}

function DBusMethod(action, cb) {

  cb(undefined);

}
