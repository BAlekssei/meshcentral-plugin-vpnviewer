"use strict";

// имя функции = shortName из config.json
function vpnviewer(parent) {
  var obj = {};
  obj.parent = parent;

  // экспортируем только один веб-хук
  obj.exports = [ "goPageEnd" ];

  // вызывается при завершении рендера любой страницы
  obj.goPageEnd = function () {
    if (typeof document === "undefined") return; // выполняем только в браузере

    // пробуем найти контейнер панели действий на странице устройства
    var host =
      document.getElementById("p10Buttons") ||     // классическая тема
      document.querySelector("#dp_ActionBar") ||   // иногда так
      document.querySelector(".RightButtons");     // запасной вариант

    if (!host) return;                             // мы не на странице устройства
    if (document.getElementById("vpnviewer-btn")) return; // кнопку уже добавили

    // создаём саму кнопку
    var btn = document.createElement("input");
    btn.type = "button";
    btn.id = "vpnviewer-btn";
    btn.value = "VPN Viewer";
    btn.onclick = function () { alert("Кнопка работает"); };

    host.appendChild(btn);
    try { console.log("[vpnviewer] button injected"); } catch (e) {}
  };

  return obj;
}

// экспорт совместим с загрузчиком MeshCentral
module.exports = vpnviewer;
module.exports.vpnviewer = vpnviewer;
