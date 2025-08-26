"use strict";

// имя функции = shortName
function vpnviewer(parent) {
  var obj = {};
  obj.parent = parent;

  // экспортируем только то, что реально используем
  obj.exports = ["onWebUIStartupEnd", "goPageEnd"];

  // ВАЖНО: хелперы как методы объекта (а не свободные функции)
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

  obj.onWebUIStartupEnd = function () {
    if (typeof document === "undefined") return;
    try { console.log("[vpnviewer] onWebUIStartupEnd fired"); } catch(e){}
    try { alert("vpnviewer: hello from plugin"); } catch(e){}

    // ВЫЗЫВАЕМ ЧЕРЕЗ this.* (важно!)
    this.addFloatingButton();

    // и подстрахуемся на SPA-навигацию
    var n = 0;
    var iv = setInterval(() => {
      this.addFloatingButton();
      if (++n > 40) clearInterval(iv);
    }, 250);
  };

  obj.goPageEnd = function () {
    this.addFloatingButton();
  };

  return obj;
}

module.exports = vpnviewer;
module.exports.vpnviewer = vpnviewer;
