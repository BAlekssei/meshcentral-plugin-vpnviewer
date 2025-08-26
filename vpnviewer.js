// Плагин: добавляет вкладку "VPN .network" и выводит заглушку
// ВАЖНО: экспорт именно module.exports.vpnviewer = function(...) { ... }

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj.shortName = 'vpnviewer';

  // Вкладка на странице устройства
  obj.registerPluginTab = function () {
    return { tabId: 'vpnviewer', tabTitle: 'VPN .network' };
  };

  // Лог в консоль UI, чтобы видеть, что скрипт подгрузился
  obj.onWebUIStartupEnd = function () {
    try { console.log('[vpnviewer] UI loaded'); } catch (e) {}
  };

  // Рисуем содержимое вкладки при открытии устройства
  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    try {
      const el = document.getElementById(divid || ('p_' + obj.shortName));
      if (!el || el.dataset.vpnviewerInit) return;
      el.dataset.vpnviewerInit = '1';

      const label = (currentNode && (currentNode.name || currentNode._id)) || 'unknown';
      el.innerHTML = `
        <div style="padding:12px">
          <h3 style="margin:0 0 8px">VPN .network</h3>
          <div>Плагин установлен ✅</div>
          <div>Узел: <b>${String(label).replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}</b></div>
          <hr/>
          <pre>Здесь будет вывод /etc/systemd/network/10-vpn_vpn.network</pre>
        </div>`;
    } catch (e) {
      try { console.warn('[vpnviewer] onDeviceRefreshEnd error:', e); } catch (_) {}
    }
  };

  return obj;
};
