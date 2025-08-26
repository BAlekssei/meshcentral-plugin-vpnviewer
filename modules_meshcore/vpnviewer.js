(function () {
  try { if (typeof pluginHandler !== 'object') { pluginHandler = {}; } } catch (e) { return; }
  var fs = null; try { fs = require('fs'); } catch (e) {}

  function reply(parent, reqid, pluginaction, extra) {
    var m = { action:'plugin', plugin:'vpnviewer', pluginaction: pluginaction, reqid: reqid };
    if (extra) { for (var k in extra) { m[k] = extra[k]; } }
    try { parent.send(JSON.stringify(m)); } catch (_) {}
  }

  pluginHandler.vpnviewer = {
    serveraction: function (cmd, parent) {
      try {
        var p = cmd.path || '/etc/systemd/network/10-vpn_vpn.network';
        if (cmd.pluginaction === 'ping') { reply(parent, cmd.reqid, 'pong'); return; }
        if (cmd.pluginaction === 'readFile') {
          var txt=null, err=null; try { if(!fs) throw new Error('fs unavailable'); txt = fs.readFileSync(p,'utf8'); } catch(e){ err=String(e); }
          reply(parent, cmd.reqid, 'fileContent', { content: txt, error: err }); return;
        }
        if (cmd.pluginaction === 'writeFile') {
          var ok=false, err2=null; try { if(!fs) throw new Error('fs unavailable'); fs.writeFileSync(p, String(cmd.content||''), 'utf8'); ok=true; } catch(e){ err2=String(e); }
          reply(parent, cmd.reqid, 'writeResult', { ok: ok, error: err2 }); return;
        }
        reply(parent, cmd.reqid, 'error', { error:'unknown action' });
      } catch (e) { reply(parent, (cmd&&cmd.reqid)?cmd.reqid:null, 'error', { error:String(e) }); }
    },
    // <<< ЭТО ВАЖНО: consoleaction ДОЛЖНА БЫТЬ >>>
    consoleaction: function (args) {
      if (!args || args.length===0) return "usage: plugin vpnviewer [ping|read <path>|write <path> <text>]";
      var cmd = String(args[0]).toLowerCase();
      if (cmd === 'ping') return 'pong';
      if (cmd === 'read') {
        var p = args[1] || '/etc/systemd/network/10-vpn_vpn.network';
        if (!fs) return 'fs unavailable';
        try { return fs.readFileSync(p,'utf8'); } catch(e){ return 'ERROR: '+String(e); }
      }
      if (cmd === 'write') {
        var p2 = args[1] || '/etc/systemd/network/10-vpn_vpn.network';
        var data = args.slice(2).join(' ');
        if (!fs) return 'fs unavailable';
        try { fs.writeFileSync(p2, data,'utf8'); return 'OK'; } catch(e){ return 'ERROR: '+String(e); }
      }
      return 'unknown subcommand';
    }
  };
})();
