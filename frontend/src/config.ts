// frontend/src/config.ts
const DEV_URL  = 'http://192.168.100.6:3000';
const PROD_URL = 'http://57.129.112.6:3000';

export const API_URL = __DEV__ ? DEV_URL : PROD_URL;