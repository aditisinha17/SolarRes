// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .html to asset extensions so Metro can bundle cesium-map.html for native WebView
config.resolver.assetExts.push('html');

module.exports = config;
