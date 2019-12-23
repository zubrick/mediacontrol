/* file: hid.js
 * Author: aaaa
 * Created on 2019-12-23
 * Description: ffff
 */

var HID = require('node-hid');

module.exports = class {
  constructor(cbData) {
    this.cbData = cbData;
    this.connected = false;
  }

  connect() {
    var devices = HID.devices();
    //console.log(devices);
    var deviceInfo = devices.find( function(d) {
      var isTeensy = d.vendorId===0x16C0 && (d.productId===0x0480 || d.productId===0x0486);
      if (process.platform === 'linux') {
        return isTeensy;
      } else {
        return isTeensy && d.usagePage===65451 && d.usage===512;
      }
    });
    //console.log('deviceInfo',deviceInfo);
    if( deviceInfo ) {
      this.device = new HID.HID( deviceInfo.path );
      //console.log(device);
      // ... use device
      this.device.on("data", this.cbData);
      this.device.on("error", (err) => {
        console.error('HID Error', err);
        this.connected = false;
        this.connect();
      });
    } else {
      setTimeout(() => {this.connect();}, 10000);
    }
    this.connected = true;
    let dataInit = [];
    for (let i = 0; i < 64; i++) {
      dataInit[i]=0;
    }
    dataInit[0] = 0x60;
    dataInit[1] = 0x00;
    this.write(dataInit);
  }

  write(data) {
    try {
      if(this.connected) {
        //console.log(this.device);
        this.device.write(data);
      }
    }
    catch (err) {
      console.error('HID Write error', err);
    }
  }


}
