'use strict';

const Homey = require('homey');
const crypto = require('crypto');
const NordluxApi = require('./lib/api');

module.exports = class MyApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('MyApp has been initialized');
    this._api = new NordluxApi({ log: this.log });
    if (!this.homey.settings.get('indication')) {
      const cloudId = await this.homey.cloud.getHomeyId();
      const hashed = crypto.createHash('md5').update(cloudId).digest('hex');
      this.homey.settings.set('indication', hashed);
    }
    this.homey.setInterval(async () => {
      await this.pollDevices();
    }, 60000); // Poll every minute
    //}, 5000); // poll every 5 seconds for testing
    await this.pollDevices();
  }

async pollDevices() {
  const api = this._api;
  const token = this.homey.settings.get('token');
  const accountId = this.homey.settings.get('accountId');
  const uniqueIndication = this.homey.settings.get('indication');

  if (!token || !accountId) {
    this.log('No token or accountId found, skipping device polling.');
    return;
  }

  try {
    const drivers = this.homey.drivers.getDrivers();
    let allDevices = [];

    for (const driver of Object.values(drivers)) {
      const devices = driver.getDevices();
      allDevices = allDevices.concat(devices);
    }

    if (!allDevices || allDevices.length === 0) return;
    const houseIds = [...new Set(allDevices.map(device => device.getData().houseId))];

    for (const houseId of houseIds) {
      const payload = {
        accountId,
        appCode: "nordlux",
        appVersion: "v2.6.2",
        buildVersion: 137,
        mobileBrand: "samsung",
        mobileModel: "SM-A515F",
        mobileSystemType: "android",
        mobileSystemVersion: "Android 13",
        uniqueIndication,
        version: "v2.0.0",
        houseId,
        token,
      };

      const houseInfo = await api._post('/smartLight/api/device/getDeviceStatus', payload);
      for (const device of allDevices.filter(d => d.getData().houseId === houseId)) {
        const deviceStatus = houseInfo.deviceList.find(d => d.deviceId === device.getData().id);
        if (deviceStatus) {
          if (deviceStatus.isOnLine !== 1) {
            await device.setUnavailable("The light is unreachable. Is it powered on and connected to the bridge?");
            continue;
          } else {
            await device.setAvailable();
          }
          await device.setCapabilityValue('onoff', deviceStatus.power === 1);
          await device.setCapabilityValue('dim', deviceStatus.bri / 100);
          await device.setCapabilityValue('light_temperature', (900 - Math.max(801, Math.min(900, deviceStatus.cct))) / 99);
        }
      }
    }
  } catch (error) {
    this.error('Error polling devices:', error);
    
    const drivers = this.homey.drivers.getDrivers();
    for (const driver of Object.values(drivers)) {
      for (const device of driver.getDevices()) {
        await device.setUnavailable("Could not connect to the Nordlux server. Please check your internet connection.");
      }
    }
  }
}
};
