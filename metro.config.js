const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve('react-native-quick-crypto'),
  stream: require.resolve('stream-browserify'),
  os: require.resolve('os-browserify/browser'),
  'node:os': require.resolve('os-browserify/browser'),
  events: require.resolve('events/'),
  buffer: require.resolve('buffer/'),
  util: require.resolve('util/'),
  process: require.resolve('process/browser.js'),
};

module.exports = config;
