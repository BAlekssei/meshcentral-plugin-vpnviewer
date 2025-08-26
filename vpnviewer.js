// vpnviewer.js
// Правильный экспорт: module.exports.vpnviewer = function (...) { ... }

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;

  // Эти функции UI подхватит
  obj.exports = ['registerPluginTab', 'onDeviceRefreshEnd', 'onWebUIStartupEnd'];

  // Регистрируем вкладку
  obj.registerPluginTab = function () {
    console.log('[vpnviewer] registerPluginTab()');
    return { tabId: 'vpnviewer', tabTitle: 'VPN .network' };
  };

  // Лог, что UI-часть плагина загрузилась
  obj.onWebUIStartupEnd = function () {
    console.log('[vpnviewer] UI loaded');
  };

  // Рисуем содержимое вкладки
  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    const host = document.getElementById(divid || 'p_vpnviewer');
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
        <pre>Здесь будет вывод /etc/systemd/network/10-vpn_vpn.network</pre>
      </div>`;
  };

  return obj;
};
