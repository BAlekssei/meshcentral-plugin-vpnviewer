// MeshCentral plugin: добавляет вкладку "VPN .network" и выводит заглушку.
// ВАЖНО: имя экспорта совпадает с shortName, и функции перечислены в exports.

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj.shortName = 'vpnviewer';

  // Эти функции будут переданы в Web UI
  obj.exports = ['registerPluginTab', 'onWebUIStartupEnd', 'onDeviceRefreshEnd'];

  // Сообщаем UI, что надо создать вкладку с id 'vpnviewer'
  obj.registerPluginTab = function () {
    return { tabId: 'vpnviewer', tabTitle: 'VPN .network' };
  };

  // Пометка в консоль, чтобы понять, что UI-скрипт плагина реально подгрузился
  obj.onWebUIStartupEnd = function () {
    try { console.log('[vpnviewer] UI loaded'); } catch (e) {}
  };

  // Рисуем содержимое вкладки при открытии карточки устройства
  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    try {
      const id = divid || 'p_vpnviewer';
      const el = document.getElementById(id) || document.getElementById('p_vpnviewer');
      if (!el || el.dataset.vpnviewerInit) return;
      el.dataset.vpnviewerInit = '1';

      const label = (currentNode && (currentNode.name || currentNode._id)) || 'unknown';
      const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      el.innerHTML = `
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
