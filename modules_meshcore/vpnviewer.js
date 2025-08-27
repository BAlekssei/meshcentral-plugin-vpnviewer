(function () {
  if (typeof pluginHandler !== 'object') { pluginHandler = {}; }
  var fs = null; try { fs = require('fs'); } catch (e) {}
  function reply(parent, reqid, act, extra){ var m={action:'plugin',plugin:'vpnviewer',pluginaction:act,reqid:reqid}; if(extra){for(var k in extra){m[k]=extra[k];}} try{parent.send(JSON.stringify(m));}catch(_){}} 

  pluginHandler.vpnviewer = {
    serveraction: function (cmd, parent) {
      var p = cmd.path || '/etc/systemd/network/10-vpn_vpn.network';
      if (cmd.pluginaction === 'ping') { reply(parent, cmd.reqid, 'pong'); return; }
      if (cmd.pluginaction === 'readFile') { var t=null,e=null; try{ if(!fs) throw new Error('fs unavailable'); t=fs.readFileSync(p,'utf8'); }catch(x){ e=String(x); } reply(parent, cmd.reqid, 'fileContent', { content:t, error:e }); return; }
      if (cmd.pluginaction === 'writeFile') { var ok=false,e2=null; try{ if(!fs) throw new Error('fs unavailable'); fs.writeFileSync(p, String(cmd.content||''),'utf8'); ok=true; }catch(x2){ e2=String(x2); } reply(parent, cmd.reqid, 'writeResult', { ok:ok, error:e2 }); return; }
      reply(parent, cmd.reqid, 'error', { error:'unknown action' });
    },
    consoleaction: function (args) { return (args && String(args[0]).toLowerCase()==='ping') ? 'pong' : 'ok'; }
  };
})();
