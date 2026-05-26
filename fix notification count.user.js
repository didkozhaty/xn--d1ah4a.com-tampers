// ==UserScript==
// @name         Notification update fix
// @namespace    http://tampermonkey.net/
// @version      2026-05-18
// @description  try to take over the world!
// @author       You
// @match        https://xn--d1ah4a.com/**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=xn--d1ah4a.com
// @grant        none
// @run-at       document-start
// ==/UserScript==
const decoder = new TextDecoder();
const encoder = new TextEncoder();
const patchFuncResult = (obj, name, func) => {
    const target = obj[name].bind(obj);
    obj[name] = (...args) => func(target(...args), ...args)
    return obj;
}
const patchFunc = (obj, name, func) => {
    const target = obj[name].bind(obj);
    obj[name] = (...args) => func(target, ...args)
    return obj;
}
const authFetch = (...args) => {
    args[1] = args[1] ?? {};
    args[1].headers = {...(args[1].headers ?? {}), authorization: auth };
    return originalFetch(...args)
        .then(response => response.status === 401 ? refresh().then(() => authFetch(...args)) : response)
}
let readPromise;
let resolveMessage;
let messages = [];
let messageResolve;
const addMessage = (msg) => {
    const msgFormatted = typeof msg === "object" && 'done' in msg ? msg : {value: typeof msg === "string" ? encoder.encode(msg) : msg, done: false}
    if(messageResolve)
        return messageResolve(msgFormatted);
    messages.push(msgFormatted)
}
const getMessage = (readFunc) => new Promise(resolve => {
    if(messages.length)
        return resolve(message.shift())
    messageResolve = (msg) => {messageResolve = null; if(msg.read) {delete msg.read; readPromise = null}; resolve(msg)}
    (readPromise ?? (readPromise = readFunc().then(result => {result.read = true; return result}))).then(msg => messageResolve && messageResolve(msg))
})
const patchStream = (response) => {
    if(!response.body)
        return response;
    console.log("cherry cherry lady")
    patchFuncResult(response.body, "getReader", reader => patchFunc(reader, "read", async read => getMessage(read).then(data => {
        const {done, value} = data;
        const decoded = decoder.decode(value)
        console.log({done, value: decoded});
        notificationHandler(decoded);
        return data
    })))
    return response;
}
const headerLength = 26 // `event: notification\ndata: `.length
let root;
const notificationContainerGetObserver = new MutationObserver(muts => {
    const mut = muts.find(mut => mut.addedNodes.length);
    notifContainer = mut.addedNodes[0];
    notificationContainerGetObserver.disconnect();
    notificationContainerObserver.observe(notifContainer.firstChild, {childList:true})
})
const notificationContainerObserver = new MutationObserver(muts => {
    muts.forEach(mut => mut.addedNodes.forEach(node => {
        node.setAttribute('notif-id', notifications.shift())
        node.addEventListener('click', () => authFetch(`\/api\/notifications\/${node.getAttribute('notif-id')}/read`, {
            method: "POST"
        }))
    }))
})
let notifContainer;
const notifications = [];
const notificationHandler = (notif) => {
    if(!notif.startsWith('event: notification\n'))
        return;
    setNotifCount(count+1)
    const notification = JSON.parse(notif.substring(26))
    notifications.push(notification.id)
    if(notifContainer && notifContainer.parentNode)
        return;
    notificationContainerGetObserver.observe()
}
let count;
const patchNotifCount = (response) => {
    notifCreateObserver.observe(document.querySelector('a[href="/notifications"]'), {childList: true, subtree: true})
    return patchFuncResult(response, "json", result => result.then(json => {
        count = json.count;
        json.count = 99;
        return json;
    }))
}
const originalFetch = fetch;
let auth;
const patchRefresh = (response) => {
    return patchFuncResult(response, "json", result => result.then(json => {
        auth = `Bearer ${json.accessToken}`;
        return json;
    }))
};
const refresh = () => fetch("/api/v1/auth/refresh", {
  "method": "POST"
});
let counter;
let sideContainer;
let readAll;
const markAllReaden = () => authFetch("/api/notifications/read-all", {
    "method": "POST",
})
const preventDeletion = (element) => {
    const parent = element.parentNode
    const remover = parent.removeChild.bind(element.parentNode)
    parent.removeChild = (...args) => {
        console.log('try')
        const target = args.filter(el => el !== element)
        if(target.length === 0)
            return counter;
        return remover(...target)
    }
}
const resizeObserver = new MutationObserver(muts => {
    const container = document.querySelector('a[href="/notifications"]');
    counter = container.querySelector('svg + span');
    preventDeletion(counter);
    setNotifCount(count)
})
const notifCreateObserver = new MutationObserver(muts => {
    root = document.getElementById('root');
    counter = muts[0].addedNodes[0];
    preventDeletion(counter);
    notifCreateObserver.disconnect();
    sideContainer = document.querySelector('div:has(>:nth-child(2))');
    resizeObserver.observe(sideContainer, {childList: true})
    console.log(sideContainer)
    if(location.pathname === "/notifications")
        notifPageObserver.observe(sideContainer.lastChild, {childList: true, subtree: true});
    setNotifCount(count)
})
const notifPageObserver = new MutationObserver(muts => {
    if(!muts.some(mut => mut.addedNodes.length))
        return;
    patchNotifPage()
    notifPageObserver.disconnect()
})
function patchNotifPage() {
    const originalReadAll = document.querySelector('h1+button')
    readAll = originalReadAll.cloneNode();
    originalReadAll.parentNode.append(readAll);
    readAll.textContent = originalReadAll.textContent
    originalReadAll.remove()
    count === 0 && (readAll.style.display = 'none');
    readAll.addEventListener('click', e => {
        e.preventDefault();
        e.stopImmediatePropagation()
        console.log(readAll.parentElement)
        readAll.style.display = 'none'
        setNotifCount(0)
        markAllReaden()
    })
}
const setNotifCount = newCount => {
    counter.textContent = newCount > 99 ? '+99' : newCount;
    if(newCount === 0) {
        counter.style.display = 'none'
        readAll && (readAll.style.display = 'none');
    }
    else if(count === 0) {// e.g. it's display is none
        counter.style.display = ''
        readAll && (readAll.style.display = '');
    }
    count = newCount;
}
const patchRead = response => patchFuncResult(response, "json", result => result.then(json => {
    if(json.success)
        setNotifCount(count-1)
    return json;
}))
const patchReadBatch = response => patchFuncResult(response, "json", result => result.then(json => {
    if(json.success)
        setNotifCount(count-json.count)
    return json;
}))
const readUrl = /\/api\/notifications\/[0-9A-z-]+\/read/
const patchers = {
    "/api/notifications/stream": patchStream,
    "/api/notifications/count": patchNotifCount,
    "/api/v1/auth/refresh": patchRefresh,
    "/api/notifications/read-batch": patchReadBatch
};
const getPatcher = (url) => patchers[url] ?? (readUrl.test(url) ? patchRead : null);
(function() {
    'use strict';
    fetch = async (...args) =>  {
        auth && args.length >= 2 && args[1] && args[1].headers && args[1].headers.authorization && (args[1].headers.authorization = auth)
        const response = await originalFetch(...args);
        const patcher = getPatcher(args[0])
        return patcher ? patcher(response) : response
    }
    patchFuncResult(history, "pushState", (result, _1, _2, url) => {
        if(url === "/notifications")
            notifPageObserver.observe(sideContainer.lastChild, {childList: true});
        return result;
    })
    window.setNotifCount = setNotifCount;
    window.addFakeMessage = (msg) => addMessage(encoder.encode(msg));
})();
