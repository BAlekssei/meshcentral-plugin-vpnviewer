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

      // Ищем тулбар устройства
      const toolbar = document.querySelector('.device-toolbar');
      if (!toolbar) {
        console.warn('[vpnviewer] Тулбар не найден!');
        return;
      }

      // Проверяем, что кнопка ещё не добавлена
      if (document.getElementById('vpnviewer-button')) {
        console.log('[vpnviewer] Кнопка уже добавлена');
        return;
      }

      // Создаём кнопку
      const btn = document.createElement('button');
      btn.id = 'vpnviewer-button';
      btn.className = 'device-toolbar-button'; // Используем стандартный класс MeshCentral
      btn.textContent = 'VPN .network';
      btn.style.marginLeft = '8px';
      btn.onclick = () => {
        alert('Кнопка VPN .network работает!');
        // Здесь можно добавить логику загрузки конфига
      };

      // Добавляем кнопку в тулбар
      toolbar.appendChild(btn);
      console.log('[vpnviewer] Кнопка добавлена в тулбар');
    } catch (e) {
      console.error('[vpnviewer] Ошибка:', e);
    }
  };

  return obj;
};
