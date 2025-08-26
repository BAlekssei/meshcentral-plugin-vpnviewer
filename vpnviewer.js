// ИМЕНОВАННЫЙ экспорт: имя совпадает с shortName = "vpnviewer"
module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;

  // Функции, которые будет дергать Web-UI
  obj.exports = ['onWebUIStartupEnd', 'onDeviceRefreshEnd'];

  // ВАЖНО: объект, не функция — так сервер корректно создаёт вкладку и div p_vpnviewer
  obj.registerPluginTab = { tabId: 'vpnviewer', tabTitle: 'VPN .network' };

  obj.onWebUIStartupEnd = function () {
    try { console.log('[vpnviewer] UI loaded'); } catch (e) {}
  };

  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    // Контейнер вкладки создаёт сам MeshCentral: id = "p_" + tabId
    const host = document.getElementById('p_vpnviewer');
    console.log('[vpnviewer] onDeviceRefreshEnd; tab div exists =', !!host);
    if (!host || host.dataset.vpnviewerInit) return;
    host.dataset.vpnviewerInit = '1';

    const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const label = (currentNode && (currentNode.name || currentNode._id)) || 'unknown';

    host.innerHTML = `
      <div style="padding:12px">
        <h3 style="margin:0 0 8px">VPN .network</h3>
        <div>Плагин установлен ✅</div>
        <div>Узел: <b>${esc(label)}</b></div>
        <hr/>
        <pre>Здесь позже выведем /etc/systemd/network/10-vpn_vpn.network</pre>
      </div>`;
  };

  return obj;
};
