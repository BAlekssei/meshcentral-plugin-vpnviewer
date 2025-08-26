// Минимальный плагин в стиле ScriptTask.
// Критично: экспорт функции с именем shortName и список obj.exports.

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;                 // pluginHandler
  obj.mesh = parent.parent;            // MeshCentral server object
  obj.ws = obj.mesh.webserver;         // WebServer

  // --- Экспортируемые в Web UI функции/хуки (как у ScriptTask) ---
  obj.exports = [
    'registerPluginTab',
    'onWebUIStartupEnd',
    'onDeviceRefreshEnd'
  ];

  // Регистрируем вкладку на карточке устройства
  // Документация допускает объект ИЛИ функцию, возвращающую объект
  // { tabId, tabTitle } — tabId = shortName (так MeshCentral создаёт <div id="p_<tabId>">)
  obj.registerPluginTab = function () {
    return { tabId: 'vpnviewer', tabTitle: 'VPN .network' };
  };

  // Вызывается один раз после загрузки UI — просто отметим в консоли
  obj.onWebUIStartupEnd = function () {
    try { console.log('[vpnviewer] UI loaded'); } catch (e) {}
  };

  // Рисуем содержимое вкладки при открытии устройства
  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    try {
      // По соглашению MeshCentral создаёт контейнер с id "p_<tabId>"
      const hostDiv = document.getElementById(divid || 'p_vpnviewer');
      if (!hostDiv || hostDiv.dataset.vpnviewerInit) return;
      hostDiv.dataset.vpnviewerInit = '1';

      const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const nodeName = (currentNode && (currentNode.name || currentNode._id)) || 'unknown';

      hostDiv.innerHTML = `
        <div style="padding:12px">
          <h3 style="margin:0 0 8px">VPN .network</h3>
          <div>Плагин установлен ✅</div>
          <div>Узел: <b>${esc(nodeName)}</b></div>
          <hr/>
          <p style="margin:8px 0 12px; opacity:.8">Здесь будет вывод файла <code>/etc/systemd/network/10-vpn_vpn.network</code>.</p>
          <button id="vpnviewer-read" style="padding:.5rem .8rem;border:0;border-radius:.5rem;cursor:pointer">Проверить вкладку</button>
          <pre id="vpnviewer-out" style="margin-top:12px;background:#111;padding:10px;border-radius:8px;max-height:40vh;overflow:auto;color:#ddd">Нажмите "Проверить вкладку" — выведем тестовую строку.</pre>
        </div>`;

      const btn = hostDiv.querySelector('#vpnviewer-read');
      const out = hostDiv.querySelector('#vpnviewer-out');
      btn.addEventListener('click', () => {
        out.textContent = `[vpnviewer] вкладка работает для узла ${esc(nodeName)}.`;
      });
    } catch (e) {
      try { console.warn('[vpnviewer] onDeviceRefreshEnd error:', e); } catch (_) {}
    }
  };

  // (не обязательно) отметка в серверных логах при старте плагина
  try { console.log('[vpnviewer] plugin loaded'); } catch (e) {}

  return obj;
};
