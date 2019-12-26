/* file: mediacontrol.js
 * Author: aaaa
 * Created on 2019-12-23
 * Description: ffff
 */

var loudness = require('loudness');

module.exports = class {
  constructor(dbus, hidd) {
    this.dbs = dbus;
    this.hidd = hidd;
    this.volIncrement = 3;

    this.getMuted();
    this.getVolume();
    this.skip=0;

  }

  noAccent(s){
    var r=s;//.toLowerCase();
    r = r.replace(new RegExp(/\s/g)," ");
    r = r.replace(new RegExp(/[àáâãäå]/g),"a");
    r = r.replace(new RegExp(/æ/g),"ae");
    r = r.replace(new RegExp(/ç/g),"c");
    r = r.replace(new RegExp(/[èéêë]/g),"e");
    r = r.replace(new RegExp(/[ìíîï]/g),"i");
    r = r.replace(new RegExp(/ñ/g),"n");
    r = r.replace(new RegExp(/[òóôõöø]/g),"o");
    r = r.replace(new RegExp(/œ/g),"oe");
    r = r.replace(new RegExp(/[ùúûü]/g),"u");
    r = r.replace(new RegExp(/[ýÿ]/g),"y");
    return r;
  };

  sendLines(msgId, line1, line2, byte1, byte2) {
    line1 = line1 || '';
    line2 = line2 || '';

    line1 = this.noAccent(line1);
    line2 = this.noAccent(line2);

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
    this.hidd.write(data);
  }

  sendPlayerStatus(artist, title) {
    artist = artist || '';
    title = title || '';

    if (this.skip > 0) {
      this.skip--;
      return;
    }

    let status = this.dbs.services[this.dbs.selected].status;
    let stByte = 0x01;
    if (this.dbs.services[this.dbs.selected].status === 'Playing') {
      stByte = 0x02;
    }

    let mtByte = 0x01;
    if (this.muted) {
      status += ' - MUTED ';
      mtByte = 0x02;
    }

    this.sendLines(0x01, this.dbs.services[this.dbs.selected].identity, status, stByte, mtByte);
    if (this.dbs.services[this.dbs.selected].status === 'Playing') {
      this.sendLines(0x02, artist,title);
    } else {
      this.sendLines(0x02, '', '');
    }
    console.log('***', this.dbs.services[this.dbs.selected].identity, status, artist,title);
  }

  pause(line1, line2, line3, line4) {
    if (this.dbs.services[this.dbs.selected].status === 'Playing') {
      this.skip=2;
      this.sendLines(0x01, line1, line2, 0x01);
      this.sendLines(0x02, line3, line4);
      this.dbs.method('PlayPause');
    }
  }

  getVolume() {
    loudness.getVolume().then( (vol) => {
      //console.log('volume', vol);
      this.vol = vol;
      // vol = 45
    });
  }

  getMuted() {
    loudness.getMuted().then( (muted) => {
      //console.log('muted', muted);
      this.muted = muted;
      // vol = 45
    });
  }

  muteToggle() {
    loudness.setMuted(!this.muted);
    this.muted = this.muted ? false: true;
    this.updateStatus();
  }

  changeVolume(direction) {
    if (this.muted) {
      this.muteToggle();
    }
    if (direction > 0 && this.vol < (100 - this.volIncrement)) {
      this.vol += this.volIncrement;
      loudness.setVolume(this.vol);
    } else if (direction < 0 && this.vol > this.volIncrement) {
      this.vol -= this.volIncrement;
      loudness.setVolume(this.vol);
    }


    this.sendLines(0x01, this.dbs.services[this.dbs.selected].identity, this.dbs.services[this.dbs.selected].status);

    let line1 = 'Volume: ' + this.vol;
    let data = [];
    for (let i = 0; i < 64; i++) {
      data[i]=0;
    }
    data[0] = 0x60;
    data[1] = 0x02;
    for (let i = 0; i < line1.length && i < 20; i++) {
      data[2 + i] = line1[i].charCodeAt(0);
    }

    let nbSquares = this.vol > 3 ? 20*(this.vol-4)/100 : 0;
    for ( let i = 0; i < 20; i++) {
      if(i <= nbSquares && this.vol > 3) {
        data[2 + 20 + i] = 0xFF;
      } else {
        data[2 + 20 + i] = 0x00;
      }
    }
    console.log('changeVolume', direction, this.vol, nbSquares);

    //console.log('status buffer', data[0], data[1], data);
    this.hidd.write(data);

  }

  runCommand(data) {
    switch(data[1]) {
    case 0x01:
      this.dbs.method('Previous', (err) => {
        setTimeout(() => {this.updateStatus();}, 200);
      });
      break;
    case 0x02:
      this.dbs.method('PlayPause', (err) => {
        setTimeout(() => {this.updateStatus();}, 200);
      });
      break;
    case 0x03:
      this.dbs.method('Next', (err) => {
        setTimeout(() => {this.updateStatus();}, 200);
      });
      break;
    case 0x10:
      this.muteToggle();
      break;
    case 0x11:
      this.changeVolume(-1);
      break;
    case 0x12:
      this.changeVolume(1);
      break;
    case 0x20:
      this.dbs.switchSelected();
      this.updateStatus();
      break;
    }
  }

  updateStatus(dbs) {
    dbs = dbs || this.dbs;
    dbs.playStatus(undefined, (err, status) => {
      //console.log('status', status);
      dbs.metadata((err, artist, title, album) => {
        this.sendPlayerStatus(artist, title, album);
        dbs.list();
      });
    });
  }
}
