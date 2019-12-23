/* file: dbus.js
 * Author: aaaa
 * Created on 2019-12-23
 * Description: ffff
 */



module.exports = class {
  constructor() {
    this.services = {
      'org.mpris.MediaPlayer2.spotify': {
        identity: 'Spotify',
        status: 'Playing'
      },
      'org.mpris.MediaPlayer2.vlc': {
        identity: 'VLC Media Player',
        status: 'Paused'
      }
    };
    this.selected = 'org.mpris.MediaPlayer2.spotify';
  }


  switchSelected() {
    let first = '';
    let newSelected = '';
    let next = 0;
    for (const [key, value] of Object.entries(this.dbs.services)) {
      if (first == '') {
        first = key;
      }
      if (next === 1) {
        newSelected = key;
      }
      if (key === this.dbs.selected) {
        next = 1;
      }
    }
    if (newSelected === '') {
      newSelected = first;
    }
    this.dbs.selected = newSelected;
    this.updateStatus();
  }

  list() {

  }

  getIdentity(service, cb) {

    cb(undefined);

  }

  playStatus(service, cb) {

    cb(undefined);

  }

  metadata(cb) {

    let title = 'Title';
    let artist = 'Artist';
    let album = 'Album';
    cb(undefined, artist, title, album);

  }

  method(action, cb) {

    if (action === 'PlayPause') {
      this.dbs.services[this.dbs.selected].status = this.dbs.services[this.dbs.selected].status === 'Playing' ? 'Paused' : 'Playing';
    }

    cb(undefined);

  }
};
