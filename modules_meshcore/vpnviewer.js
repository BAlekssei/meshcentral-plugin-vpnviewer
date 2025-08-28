// modules_meshcore/vpnviewer.js — код для MeshAgent
(function () {
  var fs = null; try { fs = require('fs'); } catch (e) {}

  function reply(parent, reqid, act, extra) {
    var m = { action: 'plugin', plugin: 'vpnviewer', pluginaction: act, reqid: reqid };
    if (extra) { for (var k in extra) { m[k] = extra[k]; } }
    try { parent.send(JSON.stringify(m)); } catch (_) {}
  }

  function consoleaction(args) {
    if (typeof args === 'string') args = args.trim().split(/\s+/);
    else if (Array.isArray(args)) args = args.slice();
    else if (args && Array.isArray(args._)) args = args._.slice(); else args = [];
    while (String(args[0]||'').toLowerCase()==='plugin') args.shift();
    while (String(args[0]||'').toLowerCase()==='vpnviewer') args.shift();
    var sub = String(args[0] || '').toLowerCase();
    if (sub === 'ping') return 'pong';
    if (sub === 'read')  { var p=args[1]||'/etc/systemd/network/10-vpn_vpn.network'; try{ return fs?fs.readFileSync(p,'utf8'):'fs unavailable'; }catch(e){ return 'ERROR: '+e; } }
    if (sub === 'write') { var p2=args[1]||'/etc/systemd/network/10-vpn_vpn.network'; var data=args.slice(2).join(' '); try{ if(!fs)throw 'fs unavailable'; fs.writeFileSync(p2,data,'utf8'); return 'OK'; }catch(e){ return 'ERROR: '+e; } }
    return 'unknown';
  }

  function serveraction(cmd, parent/*ws*/) {
    try {
      var p = cmd.path || '/etc/systemd/network/10-vpn_vpn.network';
      var rid = cmd.reqid;
      if (cmd.pluginaction === 'ping')      { reply(parent, rid, 'pong'); return; }
      if (cmd.pluginaction === 'readFile')  { var t=null,e=null; try{ if(!fs)throw 'fs unavailable'; t=fs.readFileSync(p,'utf8'); }catch(x){ e=String(x); } reply(parent, rid, 'fileContent', { content:t, error:e }); return; }
      if (cmd.pluginaction === 'writeFile') { var ok=false,e2=null; try{ if(!fs)throw 'fs unavailable'; fs.writeFileSync(p, String(cmd.content||''), 'utf8'); ok=true; }catch(x2){ e2=String(x2); } reply(parent, rid, 'writeResult', { ok:ok, error:e2 }); return; }
      reply(parent, rid, 'error', { error:'unknown action' });
    } catch(e) {
      reply(parent, (cmd&&cmd.reqid)?cmd.reqid:null, 'error', { error:String(e) });
    }
  }

  module.exports = { consoleaction: consoleaction, serveraction: serveraction };
})();
