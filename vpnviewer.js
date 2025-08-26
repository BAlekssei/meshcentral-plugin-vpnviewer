// Мини-плагин: создаёт вкладку "VPN .network" и выводит заглушку.
// ВАЖНО: module.exports.<shortName> и НЕ класть registerPluginTab в exports.

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;

  // Только функции тут! (Иначе объект превратится в [object Object] в UI-скрипте)
  obj.exports = ['onWebUIStartupEnd', 'onDeviceRefreshEnd'];

  // Спец-поле, которое MeshCentral сам подхватит при сборке UI
  obj.registerPluginTab = { tabId: 'vpnviewer', tabTitle: 'VPN .network' };

  obj.onWebUIStartupEnd = function () {
    try { console.log('[vpnviewer] UI loaded'); } catch (e) {}
  };

  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    try {
      const host = document.getElementById(divid || 'p_vpnviewer') || document.getElementById('p_vpnviewer');
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
