"use strict"

var Toast = {
  show: function (message) {
    var el = document.createElement("div")
    el.textContent = message
    el.className = "dict-search-toast"
    ;(document.body || document.documentElement).appendChild(el)
    setTimeout(function () {
      el.classList.add("out")
      setTimeout(function () { el.remove() }, 250)
    }, 1600)
  },
}