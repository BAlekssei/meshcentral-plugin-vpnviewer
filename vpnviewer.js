// Минимальный плагин: добавляет вкладку "VPN .network" на карточку устройства
// Важно: экспорт функции с именем shortName и registerPluginTab как ОБЪЕКТ.

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;

  // Экспортируемые хуки в Web UI
  obj.exports = [
    'registerPluginTab',
    'onWebUIStartupEnd',
    'onDeviceRefreshEnd',
    'goPageEnd'
  ];

  // <<< КЛЮЧЕВОЕ >>> — объект, а не функция
  obj.registerPluginTab = { tabId: 'vpnviewer', tabTitle: 'VPN .network' };

  obj.onWebUIStartupEnd = function () {
    try { console.log('[vpnviewer] UI loaded'); } catch (e) {}
  };

  // Логируем смену страниц, чтобы видеть, что UI нас дергает
  obj.goPageEnd = function (pageId, ev) {
    try { console.log('[vpnviewer] goPageEnd:', pageId); } catch (e) {}
  };

  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    try {
      console.log('[vpnviewer] onDeviceRefreshEnd, divid =', divid);
      // Mesh создаёт контейнер с id "p_<tabId>"
      const host = document.getElementById(divid || 'p_vpnviewer') ||
                   document.getElementById('p_vpnviewer');
      if (!host) { console.warn('[vpnviewer] host div not found'); return; }
      if (host.dataset.vpnviewerInit) return;
      host.dataset.vpnviewerInit = '1';

      const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const label = (currentNode && (currentNode.name || currentNode._id)) || 'unknown';

      host.innerHTML = `
        <div style="padding:12px">
          <h3 style="margin:0 0 8px">VPN .network</h3>
          <div>Плагин установлен ✅</div>
          <div>Узел: <b>${esc(label)}</b></div>
          <hr/>
          <pre>Здесь будет вывод /etc/systemd/network/10-vpn_vpn.network</pre>
        </div>`;
    } catch (e) {
      try { console.warn('[vpnviewer] onDeviceRefreshEnd error:', e); } catch (_) {}
    }
  };

  return obj;
};
