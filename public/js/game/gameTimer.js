const socket = io();
const timeInfo = document.getElementById('time-info');

function updateTimerDisplay(timeLeft) {
    timeInfo.textContent = `${timeLeft || 0}s`;
}

socket.on('timer', ({ timeLeft }) => {
    updateTimerDisplay(timeLeft);
});

socket.on('timerDone', () => {
    updateTimerDisplay(0);
    endRound();
});

socket.on('timerReset', () => {
    console.log("Timer reset");
});

socket.on('timerStopped', () => {
    console.log("Timer stopped");
    updateTimerDisplay(0);
});

function startTimer(length) {
    if (length == 5) {
        setTimePanelActive(false);
        return;
    } else {
        setTimePanelActive(true);
    }

    socket.emit('startTimer', length);
    updateTimerDisplay(length);
}

function resetTimer() {
    socket.emit('resetTimer');
}

function stopTimer() {
    socket.emit('stopTimer');
}