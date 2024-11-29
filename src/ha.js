/* file: hid.js
 * Author: aaaa
 * Created on 2019-12-23
 * Description: ffff
 */

const HomeAssistant = require('homeassistant');

module.exports = class {
  constructor(options) {
    this.options = options;

    this.hass = new HomeAssistant({
      // Your Home Assistant host
      // Optional, defaults to http://locahost
      host: options.server,

      // Your Home Assistant port number
      // Optional, defaults to 8123
      port: options.port,

      // Your long lived access token generated on your profile page.
      // Optional
      token: options.token,

      // Your Home Assistant Legacy API password
      // Optional
      // password: 'api_password',

      // Ignores SSL certificate errors, use with caution
      // Optional, defaults to false
      ignoreCert: true
    });
  }

  call(command_str) {
    const command = this.options.commands[command_str];
    this.hass.services.call(command.service, command.domain, command.entity)
  .then(res => console.log(command.service + ' ' + command.domain + '.' + command.entity, res))
  .catch(err => console.error(err));
  }
}
