"use strict";

// имя функции = shortName
function vpnviewer(parent) {
  var obj = {};
  obj.parent = parent;
  obj._version = "0.0.32";

  // Экспортируемые хуки (только то, что реально используем)
  obj.exports = ["onWebUIStartupEnd", "goPageEnd", "onDeviceRefreshEnd"];

  // ---------- Хелперы (ВЫЗЫВАЕМ ТОЛЬКО КАК obj.*) ----------
  obj.addFloatingButton = function () {
    if (typeof document === "undefined") return;
    if (document.getElementById("vpnviewer-fab")) return;

    var btn = document.createElement("button");
    btn.id = "vpnviewer-fab";
    btn.textContent = "VPN Viewer";
    btn.title = "Тестовая кнопка из плагина";
    btn.style.position = "fixed";
    btn.style.bottom = "14px";
    btn.style.right = "14px";
    btn.style.zIndex = 99999;
    btn.style.padding = "8px 12px";
    btn.style.border = "1px solid #888";
    btn.style.borderRadius = "6px";
    btn.style.background = "#fff";
    btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    btn.onclick = function(){ alert("Кнопка работает"); };
    document.body.appendChild(btn);

    try { console.log("[vpnviewer] floating button injected"); } catch(e){}
  };

  obj.findActionBar = function () {
    if (typeof document === "undefined") return null;

    // Сначала известные селекторы
    var known = ["#p10Buttons", "#dp_ActionBar", ".RightButtons", ".devicetoolbar .right"];
    for (var i = 0; i < known.length; i++) {
      var el = document.querySelector(known[i]);
      if (el) return el;
    }

    // Фолбэк: ищем по текстам (учитывая русскую локализацию)
    var texts = ["Run", "Сообщение", "Чат", "Поделиться", "Действия", "Примечания", "Добавить событие"];
    var controls = document.querySelectorAll("input[type=button],button,a");
    for (var j = 0; j < controls.length; j++) {
      var t = (controls[j].value || controls[j].textContent || "").trim();
      if (texts.indexOf(t) !== -1) {
        var p = controls[j].parentElement, depth = 0;
        while (p && depth < 4) {
          var count = 0;
          var kids = p.querySelectorAll("input[type=button],button,a");
          for (var k = 0; k < kids.length; k++) {
            var tt = (kids[k].value || kids[k].textContent || "").trim();
            if (texts.indexOf(tt) !== -1) count++;
          }
          if (count >= 3) return p; // наш контейнер
          p = p.parentElement; depth++;
        }
      }
    }
    return null;
  };

  obj.addActionButton = function () {
    if (typeof document === "undefined") return;
    if (document.getElementById("vpnviewer-btn")) return;

    var host = obj.findActionBar();
    if (!host) { try { console.log("[vpnviewer] action bar not found yet"); } catch(e){}; return; }

    var btn = document.createElement("input");
    btn.type = "button";
    btn.id = "vpnviewer-btn";
    btn.value = "VPN Viewer";
    btn.onclick = function () { alert("VPN Viewer нажата"); };

    host.appendChild(btn);
    try { console.log("[vpnviewer] action button injected"); } catch(e){}
  };

  // ---------- Хуки ----------
  obj.onWebUIStartupEnd = function () {
    if (typeof document === "undefined") return;
    try { console.log("[vpnviewer] onWebUIStartupEnd fired v" + obj._version); } catch(e){}
    try { alert("vpnviewer: hello from plugin v" + obj._version); } catch(e){}

    // ВАЖНО: вызываем через obj.*, а не this.*
    obj.addFloatingButton();
    obj.addActionButton();

    // Немного ретраев на SPA-навигацию
    var n = 0, iv = setInterval(function () {
      obj.addFloatingButton();
      obj.addActionButton();
      if (++n > 40) clearInterval(iv); // ~10 секунд
    }, 250);
  };

  obj.goPageEnd = function () { obj.addFloatingButton(); obj.addActionButton(); };
  obj.onDeviceRefreshEnd = function () { obj.addFloatingButton(); obj.addActionButton(); };

  return obj;
}

module.exports = vpnviewer;
module.exports.vpnviewer = vpnviewer;
