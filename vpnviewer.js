// Плагин MeshCentral: добавляет вкладку "VPN .network" (только заглушка)

// Export plugin function directly so MeshCentral can load it
module.exports = function (parent) {
  const obj = {};
  obj.parent = parent;

  // Экспортируемые в Web UI функции (как у ScriptTask)
  obj.exports = ['registerPluginTab', 'onWebUIStartupEnd', 'onDeviceRefreshEnd'];

  // ВАЖНО: ФУНКЦИЯ, возвращающая { tabId, tabTitle }
  obj.registerPluginTab = function () {
    try { console.log('[vpnviewer] registerPluginTab()'); } catch (e) {}
    return { tabId: 'vpnviewer', tabTitle: 'VPN .network' };
  };

  obj.onWebUIStartupEnd = function () {
    try { console.log('[vpnviewer] UI loaded'); } catch (e) {}
  };

  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    try {
      console.log('[vpnviewer] onDeviceRefreshEnd, divid =', divid);
      const host = document.getElementById(divid || 'p_vpnviewer');
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
    } catch (e) { try { console.warn('[vpnviewer] onDeviceRefreshEnd error:', e); } catch (_) {} }
  };

  return obj;
};
