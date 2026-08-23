'use strict';

const Homey = require('homey');
const NordluxApi = require('../../lib/api');


module.exports = class MyDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('MyDriver has been initialized');
  }

  async onPair(session) {
    session.setHandler('showView', async (viewId) => {
      if (viewId === 'login') {
        // If the user is already logged in, skip the login view and go to the device list
        if (this.homey.settings.get('token')) {
          return await session.showView('list_devices');
        }
      }
    });
    session.setHandler('login', async (data) => {
      try {
        const api = new NordluxApi({ log: this.log });
        const { email, password } = data;
        const response = await api._post('smartLight/api/account/emailLogin', {
          email,
          password,
          languages: "en",
          pushToken: "",
          appCode: "nordlux",
          appVersion: "v2.6.2",
          buildVersion: 137,
          mobileBrand: "samsung",
          mobileModel: "SM-A515F",
          accountId: "test_account_id",
          mobileSystemType: "android",
          mobileSystemVersion: "Android 13",
          uniqueIndication: this.homey.settings.get('indication'),
          version: "v2.0.0",
        });
        if (response && response.hasGateway !== 1) {
          return { success: false, error: "A Nordlux bridge is required to use this app." };
        }
        this.homey.settings.set('token', response.token);
        this.homey.settings.set('accountId', response.accountId);
        this.homey.settings.set('userId', response.userId);
        this.homey.settings.set('username', email);
        await session.showView('list_devices');
        return { success: true };
      } catch (error) {
        this.log('Error during login:', error);
        return { success: false, error: "An error occurred during login. Please try again." };
      }
    });

    session.setHandler('list_devices', async () => {
      try {
        const api = new NordluxApi({ log: this.log });
        const token = this.homey.settings.get('token');
        const accountId = this.homey.settings.get('accountId');
        const uniqueIndication = this.homey.settings.get('indication');

        const commonPayload = {
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
          token,
        };

        const housesData = await api._post('/smartLight/api/sync/syncHouse', commonPayload);

        if (!housesData || !housesData.houseList) {
          throw new Error('No houses found for the account.');
        }

        // Filter houses that have devices to check
        const validHouses = housesData.houseList.filter(house => house && house.houseId && house.deviceNum >= 1);

        // Fetch house info for all valid houses concurrently
        const housePromises = validHouses.map(async (house) => {
          try {
            const houseInfo = await api._post('smartLight/api/house/getHouseInfo', {
              ...commonPayload,
              houseId: house.houseId,
            });

            if (houseInfo && Array.isArray(houseInfo.deviceList)) {
              return houseInfo.deviceList
                .filter(device => device.deviceTypeCode === 9)
                .map(device => ({
                  name: device.deviceName,
                  data: {
                    id: device.deviceId,
                    houseId: house.houseId,
                  }, 
                  store: {
                    mac: device.deviceMac,
                    deviceTypeCode: device.deviceTypeCode,
                    address: device.pubAddress,
                    roomId: device.roomId,
                    roomCode: houseInfo.roomList.find(room => room.roomId === device.roomId)?.roomCode || '',
                  },
                }));
            }
          } catch (err) {
            this.log(`Failed to fetch info for house ${house.houseId}:`, err);
          }
          return [];
        });

        const devicesPerHouse = await Promise.all(housePromises);

        // Flatten all device arrays into a single list
        const allDevices = devicesPerHouse.flat();

        return allDevices;

        throw new Error('No E27 devices found in any houses.');
      } catch (error) {
        this.log('Error during device listing:', error);
        throw new Error('Failed to list devices. Please try again.');
      }
    });
  }

  async onRepair(session) {
    session.setHandler('login', async (data) => {
      try {
        const api = new NordluxApi({ log: this.log });
        const { email, password } = data;
        const response = await api._post('smartLight/api/account/emailLogin', {
          email,
          password,
          languages: "en",
          pushToken: "",
          appCode: "nordlux",
          appVersion: "v2.6.2",
          buildVersion: 137,
          mobileBrand: "samsung",
          mobileModel: "SM-A515F",
          accountId: "test_account_id",
          mobileSystemType: "android",
          mobileSystemVersion: "Android 13",
          uniqueIndication: this.homey.settings.get('indication'),
          version: "v2.0.0",
        });
        if (response && response.hasGateway !== 1) {
          return { success: false, error: "A Nordlux bridge is required to use this app." };
        }
        this.homey.settings.set('token', response.token);
        this.homey.settings.set('accountId', response.accountId);
        this.homey.settings.set('userId', response.userId);
        this.homey.settings.set('username', email);
        await session.done();
        return { success: true };
      } catch (error) {
        this.log('Error during login:', error);
        return { success: false, error: "An error occurred during login. Please try again." };
      }
    });
  }


  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    return [
      // Example device data, note that `store` is optional
      // {
      //   name: 'My Device',
      //   data: {
      //     id: 'my-device',
      //   },
      //   store: {
      //     address: '127.0.0.1',
      //   },
      // },
    ];
  }

};
