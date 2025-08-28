// modules_meshcore/vpnviewer.js
(function () {
  var fs = null; try { fs = require('fs'); } catch (e) {}

  function reply(parent, reqid, act, extra) {
    var m = { action: 'plugin', plugin: 'vpnviewer', pluginaction: act, reqid: reqid };
    if (extra) { for (var k in extra) { m[k] = extra[k]; } }
    try { parent.send(JSON.stringify(m)); } catch (_) {}
  }

  function serveraction(cmd, parent, grandparent) {
    try {
      try { print('[vpnviewer][core] serveraction:', (cmd && cmd.pluginaction) || '<?>'); } catch(e){}
      if (!cmd || !parent) return;

      if (cmd.pluginaction === 'ping') { reply(parent, cmd.reqid, 'pong'); return; }

      if (cmd.pluginaction === 'readFile') {
        var p = cmd.path || '/etc/systemd/network/10-vpn_vpn.network';
        var txt = null, err = null;
        try { if (!fs) throw new Error('fs unavailable'); txt = fs.readFileSync(p, 'utf8'); } catch (e) { err = String(e); }
        reply(parent, cmd.reqid, 'fileContent', { content: txt, error: err }); return;
      }

      if (cmd.pluginaction === 'writeFile') {
        var p2 = cmd.path || '/etc/systemd/network/10-vpn_vpn.network';
        var ok = false, err2 = null;
        try { if (!fs) throw new Error('fs unavailable'); fs.writeFileSync(p2, String(cmd.content || ''), 'utf8'); ok = true; } catch (e) { err2 = String(e); }
        reply(parent, cmd.reqid, 'writeResult', { ok: ok, error: err2 }); return;
      }

      reply(parent, cmd.reqid, 'error', { error: 'unknown action' });
    } catch (e) {
      reply(parent, cmd && cmd.reqid, 'error', { error: String(e) });
    }
  }

  function consoleaction(args) {
    if (typeof args === 'string') args = args.trim().split(/\s+/);
    else if (Array.isArray(args)) args = args.slice();
    else if (args && Array.isArray(args._)) args = args._.slice(); else args = [];
    while (String(args[0]||'').toLowerCase()==='plugin') args.shift();
    while (String(args[0]||'').toLowerCase()==='vpnviewer') args.shift();
    if (String(args[0]||'').toLowerCase()==='ping') return 'pong';
    return 'ok';
  }

  // ВАЖНО: зарегистрировать модуль там, где его ищет MeshAgent для serveraction
  try {
    if (typeof pluginHandler !== 'object') { pluginHandler = {}; }
  } catch (_) { /* ignore */ }
  try {
    pluginHandler.vpnviewer = { consoleaction: consoleaction, serveraction: serveraction };
  } catch (_) { /* ignore */ }

  // Дополнительно оставим и exports — так консольный путь через require тоже работает
  try { module.exports = { consoleaction: consoleaction, serveraction: serveraction }; } catch (_){}
})();
