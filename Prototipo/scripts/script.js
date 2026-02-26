document.addEventListener('DOMContentLoaded', () => {
    actualizarInterfaz();
    setInterval(actualizarInterfaz, 1000);
});

document.getElementById('startBtn').addEventListener('click', () => {
    const taskEl = document.getElementById('taskInput');
    const minsEl = document.getElementById('minutesInput');

    if (!taskEl || !minsEl) return;

    if (!taskEl.value) {
        alert("Escribe una meta primero, USUARIO.");
        return;
    }

    chrome.runtime.sendMessage({
        command: "START",
        task: taskEl.value,
        minutes: parseInt(minsEl.value) || 25
    });
});

document.getElementById('stopBtn').addEventListener('click', () => {
    if (confirm("¿Seguro que quieres rendirte?")) {
        chrome.runtime.sendMessage({ command: "STOP" });
    }
});

function actualizarInterfaz() {
    chrome.runtime.sendMessage({ command: "GET_STATUS" }, (response) => {
        if (!response) return;

        const setupArea = document.getElementById('setup-area');
        const focusArea = document.getElementById('focus-area');
        const timeDisplay = document.getElementById('timeDisplay');
        const currentTask = document.getElementById('current-task');
        const avatar = document.getElementById('avatar');
        const msg = document.getElementById('msg');

        if (response.isRunning) {
            setupArea.classList.add('hidden');
            focusArea.classList.remove('hidden');
            currentTask.innerText = response.task;

            let mins = Math.floor(response.timeLeft / 60);
            let secs = response.timeLeft % 60;
            timeDisplay.innerText = `${mins}:${secs < 10 ? '0' + secs : secs}`;

            if (response.isPausedByDistraction) {
                avatar.innerText = "🛑";
                msg.innerText = "TIEMPO CONGELADO. Regresa a estudiar.";
            } else {
                avatar.innerText = "👨‍💻";
                msg.innerText = `Distracciones bloqueadas: ${response.distractionCount || 0}`;
            }
        } else {
            setupArea.classList.remove('hidden');
            focusArea.classList.add('hidden');
            avatar.innerText = "👤";
            msg.innerText = "Listo para empezar.";
        }
    });
}