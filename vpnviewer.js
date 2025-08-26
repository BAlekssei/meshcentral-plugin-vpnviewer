/* vpnviewer.js — минимальный MeshCentral плагин с кнопкой в topbar */
(function () {
  function plugin(parent) {
    var obj = {};
    obj.parent = parent;
    obj._name = 'vpnviewer';
    obj._title = 'VPN Viewer';

    // ===== Backend hook: регистрируем простой роут =====
    // Даст страничку плагина на /plugins/vpnviewer
    obj.hook_setupHttpHandlers = function (app/*express app*/, express) {
      app.get('/plugins/vpnviewer', function (req, res) {
        // базовая защита: пусть страница открывается только авторизованным
        if (!req || !req.session || !req.session.userid) { res.redirect('/'); return; }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`<!doctype html>
<html><head><meta charset="utf-8"><title>${obj._title}</title>
<style>body{font:14px/1.4 system-ui,Segoe UI,Roboto,Arial,sans-serif;background:#111;color:#ddd;margin:0;padding:24px}</style>
</head><body>
<h2 style="margin-top:0">${obj._title}</h2>
<p>Это заглушка страницы плагина. Здесь можно отрендерить ваш VPN-виджет/фрейм/лог.</p>
</body></html>`);
      });
    };

    // ===== Web UI: вставка кнопки в topbar =====
    function ensureStyle() {
      if (document.getElementById('vpnviewer-topbar-style')) return;
      var s = document.createElement('style');
      s.id = 'vpnviewer-topbar-style';
      s.textContent =
        '#vpnviewer-topbar-wrap{position:absolute;right:10px;top:8px;display:flex;gap:8px;align-items:center;z-index:5}' +
        '#vpnviewer-topbar-btn{padding:5px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.2);' +
        'background:#2d2d2d;color:#fff;cursor:pointer;font-size:12px;line-height:1}' +
        '#vpnviewer-topbar-btn:hover{background:#3b3b3b}';
      document.head.appendChild(s);
    }

    function addTopbarButton() {
      try {
        var topbar = document.getElementById('topbar');
        if (!topbar) return;

        // уже добавлена?
        if (document.getElementById('vpnviewer-topbar-btn')) return;

        ensureStyle();

        // контейнер справа
        var wrap = document.getElementById('vpnviewer-topbar-wrap');
        if (!wrap) {
          wrap = document.createElement('div');
          wrap.id = 'vpnviewer-topbar-wrap';
          // topbar в MeshCentral имеет relative; абсолют к правому краю тут ок
          topbar.appendChild(wrap);
        }

        var btn = document.createElement('button');
        btn.id = 'vpnviewer-topbar-btn';
        btn.type = 'button';
        btn.title = obj._title;
        btn.textContent = 'VPN';
        btn.onclick = function (e) {
          e.preventDefault();
          // откроем страницу плагина (можно заменить на внешний URL)
          window.open('/plugins/vpnviewer', '_blank', 'noopener');
        };

        wrap.appendChild(btn);
      } catch (e) {
        // не падаем при смене страниц
        try { console.error('vpnviewer: addTopbarButton error', e); } catch (_) {}
      }
    }

    // Web-UI hooks: вызываются на старте и при смене страниц
    obj.onWebUIStartupEnd = function () { addTopbarButton(); };
    obj.goPageEnd = function () { addTopbarButton(); };
    obj.onDeviceRefreshEnd = function () { addTopbarButton(); };

    // экспортировать наружу из браузера можно доп. функции, если захотите
    obj.exports = [];

    return obj;
  }

  // Экспорт для backend и регистрация в браузере
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = plugin;
  } else if (typeof pluginHandler !== 'undefined') {
    // у разных версий названия могут отличаться — аккуратная регистрация
    try {
      if (typeof pluginHandler.addPlugin === 'function') pluginHandler.addPlugin('vpnviewer', plugin);
      else if (typeof pluginHandler.register === 'function') pluginHandler.register('vpnviewer', plugin);
      else if (typeof pluginHandler.set === 'function') pluginHandler.set('vpnviewer', plugin);
    } catch (e) {
      console.error('vpnviewer: register error', e);
    }
  }
})();
