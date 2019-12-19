/* file: server.js
 * Author: Gregory Brusick <brusick@evok.com>
 * Created on 2019-12-19
 * Description: MediaConstrol Main file
 */

var HID = require('node-hid');
var DBus = require('dbus');
var util = require('util');
var exec = require('child_process').exec;

var devices = HID.devices();
var deviceInfo = devices.find( function(d) {
  var isTeensy = d.vendorId===0x16C0 && (d.productId===0x0480 || d.productId===0x0486);
  return isTeensy;// && d.usagePage===0xFFAB && d.usage===0x200;
});
console.log('deviceInfo',deviceInfo);
if( deviceInfo ) {
  var device = new HID.HID( deviceInfo.path );

  console.log(device);
  // ... use device
  device.on("data", receivedData);
}

var bus = DBus.getBus('session');
console.log(bus);
DBusList();
DBusInfo();

setInterval(() => {}, 1 << 30);

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

function runCommand(data) {

}

function getInfo(data) {

}

function switchMode(data) {

}

function DBusList() {
  exec('qdbus | egrep -i \'org.mpris.MediaPlayer2|plasma-browser-integration\'', function(error, stdout, stderr){
    let arr = stdout.split("\n");
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] !== "") {
        console.log('player', arr[i]);
      }
    }

  });
}

function DBusInfo() {
  bus.getInterface('org.mpris.MediaPlayer2.spotify', '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.Player', function(err, iface) {
    if (err) {
      console.error(err);
      return;
    }

    iface.getProperty('PlaybackStatus', function(err, value) {
      console.log(value);
    });

    iface.PlayPause(function(err, value) {
      console.log(value);
    });

  });
}
