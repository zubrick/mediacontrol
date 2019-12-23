/* file: server.js
 * Author: Gregory Brusick <brusick@evok.com>
 * Created on 2019-12-19
 * Description: MediaConstrol Main file
 */


var util = require('util');
var hid = require('../src/hid');
var dbus = require('../test/dbus');
var mediacontrol = require('../src/mediacontrol');

var interval;

var hidd = new hid(stopInterval, startInterval, receivedData);

var dbs = new dbus();

var mc = new mediacontrol(dbs, hidd);

hidd.connect();

function startInterval() {
  if(mc) {
    mc.updateStatus();
    interval = setInterval(() => {
      mc.updateStatus();
    }, 5000);
  }
}

function stopInterval() {
  cancelInterval(interval);
}

function receivedData(data) {
  if (data[0] == 0x66) {
    console.log(util.format("received command", data[1]));
    mc.runCommand(data);
  }
  console.log('received:', data[0], data[1]);
}
