/* vpnviewer.js */
(function () {
  function plugin(parent) {
    var obj = {};
    obj.parent = parent;
    obj._name = 'vpnviewer';
    obj._title = 'VPN Viewer (topbar)';
    const logSrv = (m)=>{ try{ console.log('[vpnviewer][srv]', m);}catch{} };

    // ===== BACKEND HOOKS =====
    obj.server_startup = function () {
      logSrv('server_startup: plugin loaded');
    };

    obj.hook_setupHttpHandlers = function (app, express) {
      logSrv('hook_setupHttpHandlers');
      app.get('/plugins/vpnviewer', function (req, res) {
        if (!req || !req.session || !req.session.userid) { res.redirect('/'); return; }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`<!doctype html><meta charset="utf-8"><title>VPN Viewer</title>
<style>body{font:14px system-ui;background:#111;color:#ddd;margin:0;padding:24px}</style>
<h2>VPN Viewer</h2><p>Страница плагина работает.</p>`);
      });
    };

    // ===== WEB UI HOOKS =====
    function log(msg){ try{ console.log('[vpnviewer][ui]', msg);}catch{} }

    function ensureStyle(){
      if (document.getElementById('vpnviewer-topbar-style')) return;
      var s = document.createElement('style');
      s.id = 'vpnviewer-topbar-style';
      s.textContent =
        '#vpnviewer-topbar-wrap{position:absolute;right:10px;top:8px;display:flex;gap:8px;align-items:center;z-index:5}' +
        '#vpnviewer-topbar-btn{padding:5px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.25);background:#2d2d2d;color:#fff;cursor:pointer;font-size:12px}' +
        '#vpnviewer-topbar-btn:hover{background:#3b3b3b}';
      document.head.appendChild(s);
    }

    function addTopbarButton(){
      var topbar = document.getElementById('topbar');
      if (!topbar) { log('no #topbar yet'); return false; }
      if (document.getElementById('vpnviewer-topbar-btn')) { return true; }

      ensureStyle();
      var wrap = document.getElementById('vpnviewer-topbar-wrap');
      if (!wrap) { wrap = document.createElement('div'); wrap.id = 'vpnviewer-topbar-wrap'; topbar.appendChild(wrap); }

      var btn = document.createElement('button');
      btn.id = 'vpnviewer-topbar-btn';
      btn.type = 'button';
      btn.textContent = 'VPN';
      btn.title = 'VPN Viewer';
      btn.onclick = function(e){ e.preventDefault(); window.open('/plugins/vpnviewer','_blank','noopener'); };
      wrap.appendChild(btn);

      log('button added to #topbar');
      return true;
    }

    function tryAddNowAndLater(){
      // попытка сразу
      if (addTopbarButton()) return;
      // и несколько повторных попыток (SPA перерисовывает DOM)
      var tries = 0, t = setInterval(function(){
        tries++; if (addTopbarButton() || tries>20) clearInterval(t);
      }, 250);
    }

    obj.onWebUIStartupEnd = function(){ log('onWebUIStartupEnd'); tryAddNowAndLater(); };
    obj.goPageEnd          = function(){ log('goPageEnd');          tryAddNowAndLater(); };
    obj.onDeviceRefreshEnd = function(){ log('onDeviceRefreshEnd'); tryAddNowAndLater(); };

    // экспортов не требуется, но оставим каркас
    obj.exports = [];
    return obj;
  }

  // ===== EXPORTS (Node.js / Browser) =====
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = plugin;               // сервер подхватит
  } else if (typeof pluginHandler !== 'undefined') {
    try { pluginHandler.addPlugin('vpnviewer', plugin); } catch(e){ console.error('vpnviewer register error', e); }
  }
})();
