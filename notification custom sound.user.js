// ==UserScript==
// @name         Notification custom sound
// @namespace    http://tampermonkey.net/
// @version      2026-05-15
// @description  try to take over the world!
// @author       You
// @match        https://xn--d1ah4a.com/**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=xn--d1ah4a.com
// @grant        GM_xmlhttpRequest
// @connect      *
// @grant        unsafeWindow
// @sandbox      raw
// ==/UserScript==

// URL to your custom notification sound
const soundURL = 'https://cdn.freesound.org/previews/715/715069_13504080-lq.ogg';

(async function() {
    'use strict';
    const audioCtor = unsafeWindow.Audio;
    const sound = await GM.xmlHttpRequest({
        method: 'GET',
        url: soundURL,
        responseType: 'blob'
    }).then(r => r.response).then(blob => URL.createObjectURL(blob))
    unsafeWindow.sound = sound;
    console.log(sound)
    unsafeWindow.Audio = function(...args) {
        if(args.length && args[0] === '/assets/notification.ogg')
            args[0] = sound
        console.log('yay')
        return new audioCtor(...args);
    }
    // Your code here...
})();
