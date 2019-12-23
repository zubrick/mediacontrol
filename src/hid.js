/* file: hid.js
 * Author: aaaa
 * Created on 2019-12-23
 * Description: ffff
 */

var HID = require('node-hid');

module.exports = class {
  constructor(cbPause, cbResume, cbData) {
    this.cbPause = cbPause;
    this.cbResume = cbResume;
    this.cbData = cbData;
  }

  connect() {
    var devices = HID.devices();
    //console.log(devices);
    var deviceInfo = devices.find( function(d) {
      var isTeensy = d.vendorId===0x16C0 && (d.productId===0x0480 || d.productId===0x0486);
      return isTeensy && d.usagePage===65451 && d.usage===512;
    });
    //console.log('deviceInfo',deviceInfo);
    if( deviceInfo ) {
      this.device = new HID.HID( deviceInfo.path );

      //console.log(device);
      // ... use device
      this.device.on("data", this.cbData);
      this.device.on("error", (err) => {
        console.error('HID Error', err);
        this.device.close();
        this.connected = false;
        this.cbPause();
        this.connectHID();
      });
    } else {
      setTimeout(() => {this.connectHID();}, 10000);
    }
    this.connected = true;
    this.cbResume();
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
