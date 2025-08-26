// Мини-плагин: добавляет вкладку "VPN .network" и показывает заглушку
module.exports = function (parent) {
  const obj = {};
  obj.shortName = 'vpnviewer';

  obj.registerPluginTab = function () {
    return { tabId: 'vpnviewer', tabTitle: 'VPN .network' };
  };

  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    try {
      const el = document.getElementById(divid || 'p_vpnviewer');
      if (!el || el.dataset.vpnviewerInit) return;
      el.dataset.vpnviewerInit = '1';
      const label = (currentNode && (currentNode.name || currentNode._id)) || 'unknown';
      el.innerHTML = `<div style="padding:12px">
        <h3 style="margin:0 0 8px">VPN .network</h3>
        <div>Плагин установлен ✅</div>
        <div>Узел: <b>${String(label).replace(/[&<>"']/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[s]))}</b></div>
        <hr/><pre>Здесь будет вывод файла /etc/systemd/network/10-vpn_vpn.network</pre>
      </div>`;
    } catch (e) {}
  };

  return obj;
};
