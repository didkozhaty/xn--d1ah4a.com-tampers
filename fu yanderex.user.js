// ==UserScript==
// @name         Fuck you, yanderex
// @namespace    http://tampermonkey.net/
// @version      2026-07-21
// @description  Script forbidding yandex to get everything they want from ur use of xn--d1ah4a
// @author       You
// @match        https://xn--d1ah4a.com/**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=xn--d1ah4a.com
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    const origSocket = WebSocket;
    window.WebSocket = function(...args) {
        debugger
        if(args[0] === 'wss://mc.yandex.ru/solid.ws') // This ws is used to send every user input on a page
            throw new TypeError('Fuck you, yanderex') // TypeErrors are the same as errors gettion on adblock or no internet connection
        return new origSocket(...args)
    }
    // Your code here...
})();
