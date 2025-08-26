// MeshCentral plugin: просто добавляет вкладку "VPN .network" и выводит заглушку.
// Работает без токенов/CLI, только Web UI-хуки.

module.exports = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj.shortName = 'vpnviewer';

  // 1) Регистрируем вкладку (документация: registerPluginTab принимает объект).
  obj.registerPluginTab = { tabId: 'vpnviewer', tabTitle: 'VPN .network' };

  // 2) Лог для проверки, что JS плагина реально загрузился в браузер.
  obj.onWebUIStartupEnd = function () {
    try { console.log('[vpnviewer] UI script loaded'); } catch (e) {}
  };

  // 3) Как только страница устройства перерисована — рисуем контент вкладки.
  // divid — это id контейнера именно нашей вкладки.
  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    try {
      const el = document.getElementById(divid || 'p_vpnviewer') || document.getElementById('p_vpnviewer');
      if (!el || el.dataset.vpnviewerInit) return;
      el.dataset.vpnviewerInit = '1';

      const label = (currentNode && (currentNode.name || currentNode._id)) || 'unknown';
      el.innerHTML = `
        <div style="padding:12px">
          <h3 style="margin:0 0 8px">VPN .network</h3>
          <div>Плагин установлен ✅</div>
          <div>Узел: <b>${String(label).replace(/[&<>"']/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[s]))}</b></div>
          <hr/>
          <pre>Здесь будет вывод файла /etc/systemd/network/10-vpn_vpn.network</pre>
        </div>`;
    } catch (e) {
      try { console.warn('[vpnviewer] onDeviceRefreshEnd error:', e); } catch (_) {}
    }
  };

  return obj;
};
