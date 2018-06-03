const RemoteControl = require('./remotecontrol');
const {
  setupGoogleApiForWindow,
  setupGoogleApiWindowOpener
} = require('./googleapi');
const setupScreenSharingForWindow = require('./screensharing');
const {
    setupAlwaysOnTopRender,
    setupAlwaysOnTopMain
} = require('./alwaysontop');
const { getWiFiStats, setupWiFiStats } = require('./wifistats');

module.exports = {
    getWiFiStats,
    RemoteControl,
    setupGoogleApiForWindow,
    setupGoogleApiWindowOpener,
    setupScreenSharingForWindow,
    setupAlwaysOnTopRender,
    setupAlwaysOnTopMain,
    setupWiFiStats
};
