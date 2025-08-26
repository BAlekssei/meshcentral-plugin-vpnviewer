// Экспорт функции с именем shortName
module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;

  // обязательно перечисляем хуки, которые UI подхватит
  obj.exports = ['registerPluginTab', 'onWebUIStartupEnd', 'onDeviceRefreshEnd'];

  // правильные ключи: tabId и tabTitle
  obj.registerPluginTab = function () {
    try { console.log('[vpnviewer] registerPluginTab()'); } catch (e) {}
    return { tabId: 'vpnviewer', tabTitle: 'VPN .network' };
  };

  obj.onWebUIStartupEnd = function () {
    try { console.log('[vpnviewer] UI loaded'); } catch (e) {}
  };

  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    // divid должен быть "p_vpnviewer"; если что — подстрахуемся
    const id = divid || 'p_vpnviewer';
    const el = document.getElementById(id) || document.getElementById('p_vpnviewer');
    if (!el || el.dataset.vpnviewerInit) return;
    el.dataset.vpnviewerInit = '1';

    const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const label = (currentNode && (currentNode.name || currentNode._id)) || 'unknown';

    el.innerHTML = `
      <div style="padding:12px">
        <h3 style="margin:0 0 8px">VPN .network</h3>
        <div>Плагин установлен ✅</div>
        <div>Узел: <b>${esc(label)}</b></div>
        <hr/>
        <pre>Здесь будет вывод /etc/systemd/network/10-vpn_vpn.network</pre>
      </div>`;
  };

  return obj;
};
