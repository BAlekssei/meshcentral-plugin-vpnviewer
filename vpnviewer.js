// vpnviewer.js
// Минимальный плагин MeshCentral: регистрирует вкладку "VPN .network"
// и добавляет кнопку "VPN Viewer" в панель управления агента.
// Основано на публичной схеме плагинов MeshCentral (хуки Web UI/Backend).

'use strict';

module.exports = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj._version = '0.0.25';
  obj._name = 'vpnviewer';

  // --- Backend hook: просто логируем запуск, чтобы видеть, что плагин подхватился
  obj.server_startup = function () {
    try {
      if (obj.parent && typeof obj.parent.debug === 'function') {
        obj.parent.debug(`vpnviewer ${obj._version} loaded`);
      }
    } catch (e) { /* no-op */ }
  };

  // --- Web UI hook: регистрируем новую вкладку на странице устройства
  // Framework создаст вкладку и div с соответствующим ID (см. оф. доки про registerPluginTab).
  // https://ylianst.github.io/MeshCentral/meshcentral/plugins/
  obj.registerPluginTab = function () {
    return { tabId: obj._name, tabTitle: 'VPN .network' };
  };

  // --- Web UI hook: вызывается при открытии/обновлении страницы устройства
  // Добавляем кнопку в правую кнопку-панель. Делаем максимально «бережный» поиск контейнера.
  obj.onDeviceRefreshEnd = function () {
    try {
      // Не дублируем кнопку
      if (document.getElementById('vpnviewer-button')) return;

      // Находим правую "кнопочную" панель карточки устройства (в разных версиях/темах DOM может отличаться)
      const candidates = [
        '#p10Buttons',
        '#dp_ActionBar',
        '.h2 .right',
        '.RightButtons',
        '.devicetoolbar .right'
      ];
      let host = null;
      for (const sel of candidates) {
        const el = document.querySelector(sel);
        if (el) { host = el; break; }
      }
      if (!host) return;

      // Создаём простую кнопку
      const btn = document.createElement('div');
      btn.id = 'vpnviewer-button';
      btn.role = 'button';
      btn.textContent = 'VPN Viewer';
      btn.title = 'Открыть вкладку «VPN .network»';
      btn.style.display = 'inline-block';
      btn.style.padding = '4px 8px';
      btn.style.marginLeft = '6px';
      btn.style.border = '1px solid #ccc';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      btn.style.userSelect = 'none';

      btn.addEventListener('click', function () {
        // Пытаемся переключиться на нашу вкладку; если не получится — просто покажем алерт
        try {
          const tabBtn =
            document.querySelector('#pluginTabs .tab[for="vpnviewer"]') ||
            document.querySelector('[data-tab="vpnviewer"]') ||
            document.querySelector('a[href="#vpnviewer"]');

          if (tabBtn) { tabBtn.click(); }
          else { alert('VPN Viewer: вкладка «VPN .network» добавлена (макет).'); }
        } catch (e) {
          alert('VPN Viewer');
        }
      });

      host.appendChild(btn);

      // Небольшой плейсхолдер внутри вкладки (если контейнер уже создан)
      const tabDiv =
        document.getElementById('vpnviewer') ||
        document.querySelector('#vpnviewer, [data-panel="vpnviewer"]');

      if (tabDiv && !tabDiv.hasChildNodes()) {
        const wrap = document.createElement('div');
        wrap.style.padding = '12px';
        wrap.innerHTML = `
          <h3 style="margin:0 0 8px">VPN Viewer</h3>
          <p style="margin:0 0 8px">Пока что это заглушка. Далее тут выведем информацию по VPN-интерфейсам (например, .network).</p>
        `;
        tabDiv.appendChild(wrap);
      }
    } catch (e) {
      try { console.log('vpnviewer onDeviceRefreshEnd error:', e); } catch (_) {}
    }
  };

  // Список функций, доступных на стороне Web UI (важно для вызова хуков в браузере)
  obj.exports = ['onDeviceRefreshEnd', 'registerPluginTab'];

  return obj;
};
