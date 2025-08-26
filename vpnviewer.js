module.exports = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj.exports = ['registerPluginTab', 'onWebUIStartupEnd'];

  obj.registerPluginTab = function () {
    console.log('[vpnviewer] registerPluginTab');
    return { tabId: 'vpnviewer', tabTitle: 'VPN .network' };
  };

  obj.onWebUIStartupEnd = function () {
    console.log('[vpnviewer] UI loaded');
  };

  return obj;
};
