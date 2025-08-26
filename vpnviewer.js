// vpnviewer.js (исправленный)
'use strict';

// ВАЖНО: именованный экспорт равный shortName из config.json
exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj._version = '0.0.27';
  obj._name = 'vpnviewer';

  // Backend hook (опционально для проверки загрузки)
  obj.server_startup = function () {
    try { obj.parent.debug?.(`vpnviewer ${obj._version} loaded`); } catch (e) {}
  };

  // Зарегистрировать вкладку устройства
  obj.registerPluginTab = function () {
    return { tabId: obj._name, tabTitle: 'VPN .network' };
  };

  // Добавить кнопку в панель действий на странице устройства
  obj.onDeviceRefreshEnd = function () {
    try {
      if (document.getElementById('vpnviewer-button')) return;

      const candidates = ['#p10Buttons', '#dp_ActionBar', '.h2 .right', '.RightButtons', '.devicetoolbar .right'];
      let host = candidates.map(sel => document.querySelector(sel)).find(Boolean);
      if (!host) return;

      const btn = document.createElement('div');
      btn.id = 'vpnviewer-button';
      btn.role = 'button';
      btn.textContent = 'VPN Viewer';
      btn.title = 'Открыть вкладку «VPN .network»';
      Object.assign(btn.style, {
        display: 'inline-block', padding: '4px 8px', marginLeft: '6px',
        border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', userSelect: 'none'
      });
      btn.addEventListener('click', () => {
        try {
          const tabBtn =
            document.querySelector('#pluginTabs .tab[for="vpnviewer"]') ||
            document.querySelector('[data-tab="vpnviewer"]') ||
            document.querySelector('a[href="#vpnviewer"]');
          if (tabBtn) tabBtn.click(); else alert('VPN Viewer: вкладка «VPN .network» добавлена (заглушка).');
        } catch { alert('VPN Viewer'); }
      });
      host.appendChild(btn);

      const tabDiv = document.getElementById('vpnviewer') || document.querySelector('#vpnviewer, [data-panel="vpnviewer"]');
      if (tabDiv && !tabDiv.hasChildNodes()) {
        const wrap = document.createElement('div');
        wrap.style.padding = '12px';
        wrap.innerHTML = `<h3 style="margin:0 0 8px">VPN Viewer</h3>
          <p style="margin:0 0 8px">Пока что это заглушка. Далее тут выведем информацию по VPN-интерфейсам.</p>`;
        tabDiv.appendChild(wrap);
      }
    } catch (e) { try { console.log('vpnviewer onDeviceRefreshEnd error:', e); } catch {} }
  };

  // Функции, доступные в Web UI
  obj.exports = ['onDeviceRefreshEnd', 'registerPluginTab'];
  return obj;
};
