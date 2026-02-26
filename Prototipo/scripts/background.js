let timer = null;

// Función auxiliar para guardar estado en local storage
function saveState(data) {
    chrome.storage.local.set(data);
}

// Función auxiliar para obtener estado
async function getStatus() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['timeLeft', 'isRunning', 'isPausedByDistraction', 'task', 'distractionCount'], resolve);
    });
}

// Lógica de "Juez" que revisa si el sitio es prohibido
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
                // Penalización: sumamos tiempo y contamos la distracción
                saveState({
                    timeLeft: (state.timeLeft || 0) + 60,
                    distractionCount: (state.distractionCount || 0) + 1
                });
                // Redirigimos al bloqueado
                try { chrome.tabs.update(tabId, { url: chrome.runtime.getURL("bloqueado.html") }); } catch (e) { }
            }
        } else {
            // El usuario está en sitio seguro, reanudamos el cronómetro
            saveState({ isPausedByDistraction: false });
        }
    });
}

// Listeners que cubren todas las formas de navegación
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        reevaluarEstado(tabId);
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    reevaluarEstado(activeInfo.tabId);
});

// Mensajería entre el Popup (script.js) y el background
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