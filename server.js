/* file: server.js
 * Author: Gregory Brusick <brusick@evok.com>
 * Created on 2019-12-19
 * Description: MediaConstrol Main file
 */

var util = require('util');
var hid = require('./src/hid');
var dbus = require('./src/dbus');
var mediacontrol = require('./src/mediacontrol');

var running = false;

var hidd = new hid(receivedData);

var dbs = new dbus();

var mc = new mediacontrol(dbs, hidd);

hidd.connect();

interval = setInterval(() => {
  if(hidd.connected) {
    mc.updateStatus(dbs);
  }
}, 5000);

function receivedData(data) {
  if (data[0] == 0x66) {
    //console.log(util.format("received command", data[1]));
    mc.runCommand(data);
  }
  //console.log('received:', data[0], data[1]);
}
