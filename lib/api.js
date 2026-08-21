'use strict';

const axios = require('axios');
const crypto = require('crypto');
const Homey = require('homey');

const ACCESS_KEY_ID = 'd780d5f3c706851ad386e7d7acdaf6f7';
// You need to extract the secret from the Android app when compiling from source.
const SECRET_KEY = Homey.env.SECRET;
const BASE_URL = 'https://api.yankon-xm.com/';
const APP_CODE = 'nordlux';

class NordluxApi {

  constructor({ log } = {}) {
    this.log = log || console.log;
    this.token = null;
    this.accountId = null;

    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 15000,
      headers: {
        'User-Agent': 'okhttp/3.12.0',
      },
    });

    // Attach fresh sign/authorization per request, since they're timestamp-bound
    this.client.interceptors.request.use((config) => {
      const timestamp = this._getCurTimerString();
      config.headers['authorization'] = this._encryptAuthorization(timestamp);
      config.headers['sign'] = this._encryptSign(timestamp);
      return config;
    });
  }

  // --- crypto primitives -------------------------------------------------

  _getCurTimerString(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return (
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }

  _encryptAuthorization(timestamp) {
    return Buffer.from(`${ACCESS_KEY_ID}:${timestamp}`, 'utf8').toString('base64');
  }

  _encryptSign(timestamp) {
    return crypto
      .createHash('md5')
      .update(ACCESS_KEY_ID + SECRET_KEY + timestamp, 'utf8')
      .digest('hex')
      .toUpperCase();
  }

  _aesEncrypt2(plainText) {
    const keyBuf = Buffer.from(SECRET_KEY, 'utf8');
    const cipher = crypto.createCipheriv('aes-128-ecb', keyBuf, null);
    cipher.setAutoPadding(true);
    return Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
      .toString('hex')
      .toUpperCase();
  }

  _aesDecrypt2(hexCipher) {
    if (!hexCipher) return null;
    const keyBuf = Buffer.from(SECRET_KEY, 'utf8');
    const data = Buffer.from(hexCipher, 'hex');
    const decipher = crypto.createDecipheriv('aes-128-ecb', keyBuf, null);
    decipher.setAutoPadding(true);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  // --- request helper ------------------------------------------------

  /**
   * POSTs an encrypted {cipher} body to `path`, returns the parsed response.
   * Assumes response bodies are plaintext JSON (confirmed for emailLogin and
   * getHouseInfo) — adjust here if a future endpoint turns out to encrypt
   * its response too.
   */
  async _post(path, payload) {
    const plainJson = JSON.stringify(payload);
    const cipherHex = this._aesEncrypt2(plainJson);

    const res = await this.client.post(path, { cipher: cipherHex }, {
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    });

    if (res.data && res.data.isSuccess !== 1) {
      throw new Error(`Nordlux API error: ${res.data.msg || 'unknown error'}`);
    }

    return res.data.data;
  }
}

module.exports = NordluxApi;