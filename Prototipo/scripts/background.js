let timeLeft = 25 * 60;
let isRunning = false;
let isPausedByDistraction = false;
let currentTask = "";
let timer = null;
let distractionCount = 0;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "START") {
        isRunning = true;
        isPausedByDistraction = false;
        timeLeft = (request.minutes || 25) * 60;
        currentTask = request.task;
        distractionCount = 0;
        startCountdown();
        sendResponse({ status: "started" });
    }
    else if (request.command === "GET_STATUS") {
        sendResponse({ timeLeft, isRunning, isPausedByDistraction, task: currentTask, distractionCount });
    }
    else if (request.command === "STOP") {
        resetTimer();
        sendResponse({ status: "stopped" });
    }
    return true;
});

function startCountdown() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
        if (isRunning && !isPausedByDistraction && timeLeft > 0) {
            timeLeft--;
        } else if (timeLeft <= 0) {
            resetTimer();
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.jpg',
                title: '¡TIEMPO TERMINADO!',
                message: 'Excelente trabajo, Beto.'
            });
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    isPausedByDistraction = false;
}

function verificarUrl(url) {
    if (!isRunning) return;

    const blacklist = ["facebook.com", "youtube.com", "tiktok.com", "instagram.com", "x.com"];
    const esProhibido = blacklist.some(site => url.includes(site));
    const esPaginaBloqueo = url.includes("bloqueado.html");

    if (esProhibido || esPaginaBloqueo) {
        isPausedByDistraction = true;
        if (esProhibido) {
            timeLeft += 60;
            distractionCount++;
            chrome.tabs.update({ url: chrome.runtime.getURL("bloqueado.html") });
        }
    } else {
        isPausedByDistraction = false;
    }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) verificarUrl(changeInfo.url);
});

chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url) verificarUrl(tab.url);
    });
});