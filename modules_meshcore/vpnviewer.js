// /opt/meshcentral/meshcentral-data/plugins/vpnviewer/modules_meshcore/vpnviewer.js
// Агентский модуль: регистрируем через `plugins.vpnviewer`.
// Требуется для консольной команды `plugin vpnviewer ...` и обмена сервер<->агент.

(function () {
  // В MeshAgent есть глобальный объект `plugins`, куда нужно регистрировать модуль
  if (typeof plugins !== 'object') { return; } // если по какой-то причине нет — просто выходим

  var fs = null; try { fs = require('fs'); } catch (e) {}

  function send(parent, reqid, act, extra) {
    var m = { action: 'plugin', plugin: 'vpnviewer', pluginaction: act, reqid: reqid };
    if (extra) { for (var k in extra) { m[k] = extra[k]; } }
    try { parent.send(JSON.stringify(m)); } catch (e) {}
  }

  plugins.vpnviewer = {
    // 1) Консольная команда агента: "plugin vpnviewer <...>"
    consoleaction: function (args) {
      if (!args || args.length === 0) return "usage: plugin vpnviewer [ping|read <path>|write <path> <text>]";
      var sub = String(args[0]).toLowerCase();

      if (sub === 'ping') return 'pong';

      if (sub === 'read') {
        var path = args[1] || '/etc/systemd/network/10-vpn_vpn.network';
        if (!fs) return 'fs unavailable';
        try { return fs.readFileSync(path, 'utf8'); } catch (e) { return 'ERROR: ' + String(e); }
      }

      if (sub === 'write') {
        var path2 = args[1] || '/etc/systemd/network/10-vpn_vpn.network';
        var data = args.slice(2).join(' ');
        if (!fs) return 'fs unavailable';
        try { fs.writeFileSync(path2, data, 'utf8'); return 'OK'; } catch (e) { return 'ERROR: ' + String(e); }
      }

      return 'unknown subcommand';
    },

    // 2) Канал сервер<->агент для вашего UI: ping/readFile/writeFile
    serveraction: function (cmd, parent /* ws */) {
      try {
        var rid = cmd && cmd.reqid;
        var path = (cmd && cmd.path) || '/etc/systemd/network/10-vpn_vpn.network';

        if (!cmd || !parent) return;

        if (cmd.pluginaction === 'ping') { send(parent, rid, 'pong'); return; }

        if (cmd.pluginaction === 'readFile') {
          var txt = null, err = null;
          try { if (!fs) throw new Error('fs unavailable'); txt = fs.readFileSync(path, 'utf8'); } catch (e) { err = String(e); }
          send(parent, rid, 'fileContent', { content: txt, error: err });
          return;
        }

        if (cmd.pluginaction === 'writeFile') {
          var ok = false, err2 = null;
          try { if (!fs) throw new Error('fs unavailable'); fs.writeFileSync(path, String(cmd.content || ''), 'utf8'); ok = true; } catch (e) { err2 = String(e); }
          send(parent, rid, 'writeResult', { ok: ok, error: err2 });
          return;
        }

        send(parent, rid, 'error', { error: 'unknown action' });
      } catch (e) {
        send(parent, (cmd && cmd.reqid) ? cmd.reqid : null, 'error', { error: String(e) });
      }
    }
  };
})();
