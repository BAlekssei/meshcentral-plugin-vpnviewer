// MeshAgent side plugin: регистрируем в `plugins.vpnviewer`
(function () {
  if (typeof plugins !== 'object') { return; }
  var fs = null; try { fs = require('fs'); } catch (e) {}

  function send(parent, reqid, act, extra){
    var m = { action:'plugin', plugin:'vpnviewer', pluginaction:act, reqid:reqid };
    if (extra) { for (var k in extra) { m[k]=extra[k]; } }
    try { parent.send(JSON.stringify(m)); } catch(_){}
  }

  plugins.vpnviewer = {
    consoleaction: function(args){
      if (!args || !args.length) return "usage: plugin vpnviewer [ping|read <path>|write <path> <text>]";
      var sub = String(args[0]).toLowerCase();
      if (sub==='ping') return 'pong';
      if (sub==='read'){
        var p = args[1] || '/etc/systemd/network/10-vpn_vpn.network';
        if(!fs) return 'fs unavailable';
        try { return fs.readFileSync(p,'utf8'); } catch(e){ return 'ERROR: '+String(e); }
      }
      if (sub==='write'){
        var p2 = args[1] || '/etc/systemd/network/10-vpn_vpn.network';
        var data = args.slice(2).join(' ');
        if(!fs) return 'fs unavailable';
        try { fs.writeFileSync(p2,data,'utf8'); return 'OK'; } catch(e){ return 'ERROR: '+String(e); }
      }
      return 'unknown subcommand';
    },

    serveraction: function(cmd,parent){
      try{
        var rid = cmd && cmd.reqid;
        var p   = (cmd && cmd.path) || '/etc/systemd/network/10-vpn_vpn.network';
        if (!cmd || !parent) return;

        if (cmd.pluginaction==='ping'){ send(parent,rid,'pong'); return; }

        if (cmd.pluginaction==='readFile'){
          var t=null,e=null; try{ if(!fs) throw new Error('fs unavailable'); t=fs.readFileSync(p,'utf8'); }catch(x){ e=String(x); }
          send(parent,rid,'fileContent',{content:t,error:e}); return;
        }

        if (cmd.pluginaction==='writeFile'){
          var ok=false,e2=null; try{ if(!fs) throw new Error('fs unavailable'); fs.writeFileSync(p,String(cmd.content||''),'utf8'); ok=true; }catch(x2){ e2=String(x2); }
          send(parent,rid,'writeResult',{ok:ok,error:e2}); return;
        }

        send(parent,rid,'error',{error:'unknown action'});
      }catch(e){ send(parent,(cmd?cmd.reqid:null),'error',{error:String(e)}); }
    }
  };
})();
