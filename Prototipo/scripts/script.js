document.addEventListener('DOMContentLoaded', () => {
    actualizarInterfaz();
    setInterval(actualizarInterfaz, 1000);
});

document.getElementById('startBtn').addEventListener('click', () => {
    const taskEl = document.getElementById('taskInput');
    const minsEl = document.getElementById('minutesInput');

    if (!taskEl || !minsEl) return;

    const task = taskEl.value;
    const mins = minsEl.value;

    if (!task) {
        alert("Escribe una meta primero, USUARIO.");
        return;
    }

    chrome.runtime.sendMessage({
        command: "START",
        task: task,
        minutes: parseInt(mins) || 25
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
        const avatar = document.getElementById('avatar');
        const msg = document.getElementById('msg');

        if (response.isRunning) {
            setupArea.classList.add('hidden');
            focusArea.classList.remove('hidden');

            let mins = Math.floor(response.timeLeft / 60);
            let secs = response.timeLeft % 60;
            document.getElementById('timeDisplay').innerText = `${mins}:${secs < 10 ? '0' + secs : secs}`;

            if (response.isPausedByDistraction) {
                avatar.innerText = "🛑";
                msg.innerText = "TIEMPO CONGELADO. Regresa a una página de estudio.";
                msg.style.color = "#e74c3c";
            } else {
                avatar.innerText = "👨‍💻";
                msg.innerText = `Distracciones evitadas: ${response.distractionCount}`;
                msg.style.color = "#7f8c8d";
            }
        } else {
            setupArea.classList.remove('hidden');
            focusArea.classList.add('hidden');
        }
    });
}