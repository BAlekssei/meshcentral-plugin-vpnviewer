// modules_meshcore/vpnviewer.js
// Минимальный agent-side обработчик для чтения/записи файла.
// Работает только на Linux.

(function () {
  try {
    if (process.platform !== 'linux') { return; }
  } catch (e) { /* старые агенты */ }

  var fs;
  try { fs = require('fs'); } catch (e) { return; }

  // В MeshCore есть глобальный pluginHandler — добавим наш обработчик
  if (typeof pluginHandler !== 'object') { pluginHandler = {}; }

  pluginHandler.vpnviewer = {
    // сервер присылает: {action:'plugin', plugin:'vpnviewer', pluginaction:'...', reqid, ...}
    serveraction: function (command, parent /* ws */) {
      var path = command.path || '/etc/systemd/network/10-vpn_vpn.network';

      if (command.pluginaction === 'readFile') {
        var out = { action: 'plugin', plugin: 'vpnviewer', pluginaction: 'fileContent', reqid: command.reqid };
        try {
          out.content = fs.readFileSync(path).toString();
          out.ok = true;
        } catch (e) {
          out.ok = false;
          out.error = e.toString();
        }
        parent.send(JSON.stringify(out));
        return;
      }

      if (command.pluginaction === 'writeFile') {
        var res = { action: 'plugin', plugin: 'vpnviewer', pluginaction: 'writeResult', reqid: command.reqid };
        try {
          // простая запись (без chown/chmod); при необходимости можно расширить
          fs.writeFileSync(path, String(command.content || ''), { mode: 0o644 });
          res.ok = true;
        } catch (e) {
          res.ok = false;
          res.error = e.toString();
        }
        parent.send(JSON.stringify(res));
        return;
      }
    }
  };
})();
