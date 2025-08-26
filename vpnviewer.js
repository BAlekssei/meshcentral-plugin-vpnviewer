// vpnviewer.js
module.exports = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj.exports = ['registerPluginTab', 'onDeviceRefreshEnd'];

  obj.registerPluginTab = function () {
    console.log('[vpnviewer] registerPluginTab');
    return { tabId: 'vpnviewer', tabTitle: 'VPN .network' };
  };

  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    try {
      console.log('[vpnviewer] onDeviceRefreshEnd');

      const toolbar = document.querySelector('.device-toolbar');
      if (!toolbar) {
        console.warn('[vpnviewer] Тулбар не найден!');
        return;
      }

      if (document.getElementById('vpnviewer-button')) {
        console.log('[vpnviewer] Кнопка уже добавлена');
        return;
      }

      const btn = document.createElement('button');
      btn.id = 'vpnviewer-button';
      btn.className = 'device-toolbar-button';
      btn.textContent = 'VPN .network';
      btn.style.marginLeft = '8px';
      btn.onclick = () => {
        alert('Кнопка VPN .network работает!');
      };

      toolbar.appendChild(btn);
      console.log('[vpnviewer] Кнопка добавлена в тулбар');
    } catch (e) {
      console.error('[vpnviewer] Ошибка:', e);
    }
  };

  return obj;
};
