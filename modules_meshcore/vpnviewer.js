// Агентный модуль: отвечает на ping/readFile/writeFile
(function () {
  try { if (process.platform !== 'linux') { return; } } catch (e) {}
  var fs; try { fs = require('fs'); } catch (e) { return; }

  if (typeof pluginHandler !== 'object') { pluginHandler = {}; }

  pluginHandler.vpnviewer = {
    serveraction: function (command, parent/*ws*/) {
      var path = command.path || '/etc/systemd/network/10-vpn_vpn.network';

      if (command.pluginaction === 'ping') {
        parent.send(JSON.stringify({ action:'plugin', plugin:'vpnviewer', pluginaction:'pong', reqid: command.reqid }));
        return;
      }

      if (command.pluginaction === 'readFile') {
        var out = { action:'plugin', plugin:'vpnviewer', pluginaction:'fileContent', reqid:command.reqid };
        try { out.content = fs.readFileSync(path).toString(); out.ok = true; }
        catch(e){ out.ok = false; out.error = e.toString(); }
        parent.send(JSON.stringify(out));
        return;
      }

      if (command.pluginaction === 'writeFile') {
        var out = { action:'plugin', plugin:'vpnviewer', pluginaction:'writeResult', reqid:command.reqid };
        try { fs.writeFileSync(path, String(command.content||''), { mode:0o644 }); out.ok = true; }
        catch(e){ out.ok = false; out.error = e.toString(); }
        parent.send(JSON.stringify(out));
        return;
      }
    }
  };
})();
