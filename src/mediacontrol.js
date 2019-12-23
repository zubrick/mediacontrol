/* file: mediacontrol.js
 * Author: aaaa
 * Created on 2019-12-23
 * Description: ffff
 */

module.exports = class {
  constructor(dbus, hidd) {
    this.dbs = dbus;
    this.hidd = hidd;
    this.volIncrement = 2;
    this.vol = 10;
  }

  sendLines(msgId, line1, line2, byte1, byte2) {

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
  }


  muteToggle() {
    this.muted = this.muted === 0 ? 1 : 0;
    this.updateStatus();
  }

  changeVolume(direction) {
    if (this.muted) {
      this.muteToggle();
    }
    if (direction > 0 && this.vol < 100) {
      this.vol += this.volIncrement;
    } else if (direction < 0 && this.vol > 0) {
      this.vol -= this.volIncrement;
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
    console.log('changeVolume', this.vol, nbSquares);

    //console.log('status buffer', data[0], data[1], data);
    this.hidd.write(data);

  }

  runCommand(data) {
    switch(data[1]) {
    case 0x01:
      this.dbs.method('Previous', (err) => {
        setTimeout(this.updateStatus, 400);
      });
      break;
    case 0x02:
      this.dbs.method('PlayPause', (err) => {
        setTimeout(this.updateStatus, 400);
      });
      break;
    case 0x03:
      this.dbs.method('Next', (err) => {
        setTimeout(this.updateStatus, 400);
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
      this.switchSelected();
      break;
    }
  }

  updateStatus() {
    this.dbs.metadata((err, artist, title, album) => {
      this.sendPlayerStatus(artist, title, album);
    });
  }
}
