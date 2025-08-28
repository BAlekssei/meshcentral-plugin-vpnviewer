// modules_meshcore/vpnviewer.js — модуль для MeshAgent
(function () {
  var fs = null; try { fs = require('fs'); } catch (e) {}

  function reply(parent, reqid, act, extra) {
    var m = { action: 'plugin', plugin: 'vpnviewer', pluginaction: act, reqid: reqid };
    if (extra) { for (var k in extra) { m[k] = extra[k]; } }
    try { parent.send(JSON.stringify(m)); } catch (_) {}
  }

  // Консольная команда агента: "plugin vpnviewer <...>"
  function consoleaction(args /*array|string|object*/) {
    if (typeof args === 'string') args = args.trim().split(/\s+/);
    else if (Array.isArray(args)) args = args.slice();
    else if (args && Array.isArray(args._)) args = args._.slice(); else args = [];

    while ((args[0] || '').toLowerCase() === 'plugin') args.shift();
    while ((args[0] || '').toLowerCase() === 'vpnviewer') args.shift();

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

    return 'unknown';
  }

  // Канал сервер→агент для UI (ping/readFile/writeFile)
  function serveraction(cmd, parent /*ws*/) {
    try {
      if (!cmd || !parent) return;
      var p = cmd.path || '/etc/systemd/network/10-vpn_vpn.network';
      var rid = cmd.reqid;

      if (cmd.pluginaction === 'ping') {
        reply(parent, rid, 'pong');
        return;
      }

      if (cmd.pluginaction === 'readFile') {
        var txt = null, err = null;
        try { if (!fs) throw new Error('fs unavailable'); txt = fs.readFileSync(p, 'utf8'); } catch (e) { err = String(e); }
        reply(parent, rid, 'fileContent', { content: txt, error: err });
        return;
      }

      if (cmd.pluginaction === 'writeFile') {
        var ok = false, err2 = null;
        try { if (!fs) throw new Error('fs unavailable'); fs.writeFileSync(p, String(cmd.content || ''), 'utf8'); ok = true; } catch (e) { err2 = String(e); }
        reply(parent, rid, 'writeResult', { ok: ok, error: err2 });
        return;
      }

      reply(parent, rid, 'error', { error: 'unknown action' });
    } catch (e) {
      reply(parent, (cmd && cmd.reqid) ? cmd.reqid : null, 'error', { error: String(e) });
    }
  }

  // Зарегистрировать модуль под именем shortName ('vpnviewer')
  var mod = { consoleaction: consoleaction, serveraction: serveraction };
  try { if (typeof plugins === 'object') { plugins.vpnviewer = mod; } } catch (_){}
  try { if (typeof pluginHandler === 'object') { pluginHandler.vpnviewer = mod; } } catch (_){}
  module.exports = mod;
})();
