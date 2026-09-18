'use strict';

const Homey = require('homey');
const NordluxApi = require('../../lib/api');


module.exports = class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('MyDevice has been initialized');
    this._houseId = this.getData().houseId;
    this._deviceId = this.getData().id;
    this._roomId = this.getStoreValue('roomId');
    this._roomCode = this.getStoreValue('roomCode');
    this._conAddress = this.getStoreValue('address');
    this._type = this.getStoreValue('deviceTypeCode');
    this._api = new NordluxApi({ log: this.log });
    this.registerCapabilityListener('onoff', async (value) => {
      try {
        const api = this._api;
        const token = this.homey.settings.get('token');
        const accountId = this.homey.settings.get('accountId');
        const uniqueIndication = this.homey.settings.get('indication');

        const payload = {
          addressType: 0,
          appkeyIndex: 0,
          conAddress: this._conAddress,
          conList: [
            {
              conModel: 4867,
              conName: "cct",
              conValue: value ? 10000 : 15000,
            }
          ],
          elemIndex: 0,
          houseId: this._houseId,
          roomCode: this._roomCode,
          targetId: this._deviceId,
          targetType: 0,
          type: 1,
          uv: 0,
          accountId,
          appCode: "nordlux",
          appVersion: "v2.6.2",
          buildVersion: 137,
          mobileBrand: "samsung",
          mobileModel: "SM-A515F",
          mobileSystemType: "android",
          mobileSystemVersion: "Android 13",
          token,
          uniqueIndication,
          version: "v2.0.0",
        };

        await api._post('/smartLight/api/device/controllerBLE', payload);
      } catch (error) {
        this.log('Error controlling device:', error);
        throw new Error('Failed to control device. Please try again.');
      }
    });

    this.registerCapabilityListener('dim', async (value) => {
      try {
        const api = this._api;
        const token = this.homey.settings.get('token');
        const accountId = this.homey.settings.get('accountId');
        const uniqueIndication = this.homey.settings.get('indication');

        const payload = {
          addressType: 0,
          appkeyIndex: 0,
          conAddress: this._conAddress,
          conList: [
            {
              conModel: 4864,
              conName: "bri",
              conValue: Math.round(value * 100),
            }
          ],
          elemIndex: 0,
          houseId: this._houseId,
          roomCode: this._roomCode,
          targetId: this._deviceId,
          targetType: 0,
          type: 1,
          uv: 0,
          accountId,
          appCode: "nordlux",
          appVersion: "v2.6.2",
          buildVersion: 137,
          mobileBrand: "samsung",
          mobileModel: "SM-A515F",
          mobileSystemType: "android",
          mobileSystemVersion: "Android 13",
          token,
          uniqueIndication,
          version: "v2.0.0",
        };

        await api._post('/smartLight/api/device/controllerBLE', payload);
      } catch (error) {
        this.log('Error controlling device:', error);
        throw new Error('Failed to control device. Please try again.');
      }
    });
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('MyDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('MyDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('MyDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('MyDevice has been deleted');
  }

};
