'use strict';

// Одна фабрика плагина
function vpnviewer(parent) {
  const obj = {};
  obj.parent = parent;
  obj._version = '0.0.28';
  obj._name = 'vpnviewer';

  // --- Backend: отметка в логе, что плагин подхватился
  obj.server_startup = function () {
    try { parent?.debug?.(`vpnviewer ${obj._version} loaded`); } catch (_) {}
  };

  // --- Web UI: регистрируем вкладку устройства
  obj.registerPluginTab = function () {
    return { tabId: obj._name, tabTitle: 'VPN .network' };
  };

  // --- Web UI: добавляем кнопку в панель действий карточки устройства
  obj.onDeviceRefreshEnd = function () {
    // На сервере 'document' отсутствует — на всякий случай защитимся
    if (typeof document === 'undefined') return;
    try {
      if (document.getElementById('vpnviewer-button')) return;

      const candidates = ['#p10Buttons', '#dp_ActionBar', '.h2 .right', '.RightButtons', '.devicetoolbar .right'];
      const host = candidates.map(s => document.querySelector(s)).find(Boolean);
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
          <p style="margin:0 0 8px">Пока заглушка. Дальше тут выведем VPN-интерфейсы.</p>`;
        tabDiv.appendChild(wrap);
      }
    } catch (e) { try { console.log('vpnviewer onDeviceRefreshEnd error:', e); } catch {} }
  };

  // Список функций, доступных в Web UI
  obj.exports = ['onDeviceRefreshEnd', 'registerPluginTab'];
  return obj;
}

// ВАЖНО: экспортируем и как default, и как именованную функцию "vpnviewer"
module.exports = vpnviewer;
module.exports.vpnviewer = vpnviewer;
