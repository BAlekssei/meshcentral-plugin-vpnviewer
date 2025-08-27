// modules_meshcore/vpnviewer.js  (АГЕНТ)
// Регистрируем модуль сразу в двух реестрах: pluginHandler и plugins.

(function () {
  // безопасно получаем зависимости
  var fs = null; try { fs = require('fs'); } catch (e) {}
  // формируем единый модуль
  var mod = {
    // консольная команда агента: "plugin vpnviewer ping"
    consoleaction: function (args) {
      if (!args || args.length === 0) return "usage: plugin vpnviewer [ping|read <path>|write <path> <text>]";
      var sub = String(args[0] || '').toLowerCase();
      if (sub === 'ping') return 'pong';
      if (sub === 'read') {
        var p = args[1] || '/etc/systemd/network/10-vpn_vpn.network';
        if (!fs) return 'fs unavailable';
        try { return fs.readFileSync(p, 'utf8'); } catch (e) { return 'ERROR: ' + String(e); }
      }
      if (sub === 'write') {
        var p2 = args[1] || '/etc/systemd/network/10-vpn_vpn.network';
        var data = args.slice(2).join(' ');
        if (!fs) return 'fs unavailable';
        try { fs.writeFileSync(p2, data, 'utf8'); return 'OK'; } catch (e) { return 'ERROR: ' + String(e); }
      }
      return 'unknown subcommand';
    },

    // сообщения от сервера (кнопки «Проверка модуля / Загрузить / Сохранить» в UI)
    serveraction: function (cmd, parent /* ws */) {
      try {
        var path = (cmd && cmd.path) || '/etc/systemd/network/10-vpn_vpn.network';
        var rid  = cmd && cmd.reqid;
        function send(act, extra) {
          var m = { action:'plugin', plugin:'vpnviewer', pluginaction:act, reqid: rid };
          if (extra) { for (var k in extra) { m[k] = extra[k]; } }
          try { parent.send(JSON.stringify(m)); } catch(_) {}
        }

        if (!cmd || !parent) return;
        if (cmd.pluginaction === 'ping') { send('pong'); return; }

        if (cmd.pluginaction === 'readFile') {
          var txt=null, err=null;
          try { if (!fs) throw new Error('fs unavailable'); txt = fs.readFileSync(path,'utf8'); } catch (e) { err = String(e); }
          send('fileContent', { content: txt, error: err });
          return;
        }

        if (cmd.pluginaction === 'writeFile') {
          var ok=false, err2=null;
          try { if (!fs) throw new Error('fs unavailable'); fs.writeFileSync(path, String(cmd.content||''), 'utf8'); ok=true; } catch (e) { err2 = String(e); }
          send('writeResult', { ok: ok, error: err2 });
          return;
        }

        send('error', { error:'unknown action' });
      } catch (e) {
        try { parent.send(JSON.stringify({ action:'plugin', plugin:'vpnviewer', pluginaction:'error', reqid:(cmd?cmd.reqid:null), error:String(e) })); } catch(_){}
      }
    }
  };

  // зарегистрировать в обоих реестрах, если они есть
  try { if (typeof pluginHandler !== 'object') { pluginHandler = {}; } } catch (e) { /* ignore */ }
  try { pluginHandler.vpnviewer = mod; } catch (e) { /* ignore */ }

  try { if (typeof plugins !== 'object') { /* если нет — просто не трогаем */ } else { plugins.vpnviewer = mod; } } catch (e) { /* ignore */ }
})();
