let timer = null;

function saveState(data) {
    chrome.storage.local.set(data);
}

async function getStatus() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['timeLeft', 'isRunning', 'isPausedByDistraction', 'task', 'distractionCount'], resolve);
    });
}

async function reevaluarEstado(tabId) {
    chrome.tabs.get(tabId, async (tab) => {
        if (!tab || !tab.url) return;

        let state = await getStatus();
        if (!state.isRunning) return;

        const blacklist = ["facebook.com", "youtube.com", "tiktok.com", "instagram.com", "x.com"];
        const esProhibido = blacklist.some(site => tab.url.includes(site));
        const esBloqueo = tab.url.includes("bloqueado.html");

        if (esProhibido || esBloqueo) {
            saveState({ isPausedByDistraction: true });

            if (esProhibido) {
                saveState({
                    timeLeft: (state.timeLeft || 0) + 60,
                    distractionCount: (state.distractionCount || 0) + 1
                });
                try { chrome.tabs.update(tabId, { url: chrome.runtime.getURL("bloqueado.html") }); } catch (e) { }
            }
        } else {
            saveState({ isPausedByDistraction: false });
        }
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        reevaluarEstado(tabId);
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    reevaluarEstado(activeInfo.tabId);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "START") {
        const time = (request.minutes || 25) * 60;
        saveState({ timeLeft: time, isRunning: true, isPausedByDistraction: false, task: request.task, distractionCount: 0 });
        startCountdown();
        sendResponse({ status: "started" });
    }
    else if (request.command === "GET_STATUS") {
        getStatus().then(sendResponse);
    }
    else if (request.command === "STOP") {
        saveState({ isRunning: false, timeLeft: 25 * 60, isPausedByDistraction: false });
        clearInterval(timer);
        sendResponse({ status: "stopped" });
    }
    return true;
});

function startCountdown() {
    if (timer) clearInterval(timer);
    timer = setInterval(async () => {
        let state = await getStatus();
        if (state.isRunning && !state.isPausedByDistraction && state.timeLeft > 0) {
            saveState({ timeLeft: state.timeLeft - 1 });
        } else if (state.timeLeft <= 0 && state.isRunning) {
            saveState({ isRunning: false });
            clearInterval(timer);
        }
    }, 1000);
}