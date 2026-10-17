import axios from 'axios';
import mockAdapter from '../demo/mockAdapter.js';

// Demo build: all requests are answered in the browser from fake data.
const client = axios.create({
  baseURL: '/api',
  adapter: mockAdapter,
});

export default client;
