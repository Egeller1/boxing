document.addEventListener("DOMContentLoaded", () => {
  // Hide timer screen immediately on page load
  document.getElementById("timer-screen").classList.add("hidden");
  document.getElementById("setup-panel").classList.remove("hidden");

  // DOM Elements
  const setupPanel = document.getElementById("setup-panel");
  const timerScreen = document.getElementById("timer-screen");
  const startBtn = document.getElementById("start-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const resetBtn = document.getElementById("reset-btn");
  const timerDisplay = document.getElementById("timer");
  const moveList = document.getElementById("move-list");
  const addMoveInput = document.getElementById("add-move");
  const addMoveBtn = document.getElementById("add-move-btn");
  const intervalSlider = document.getElementById("interval");
  const intervalValue = document.getElementById("interval-value");
  const voiceSpeedSlider = document.getElementById("voice-speed");
  const voiceSpeedValue = document.getElementById("voice-speed-value");
  const currentRoundDisplay = document.getElementById("current-round");
  const totalRoundsDisplay = document.getElementById("total-rounds");
  const currentMoveDisplay = document.getElementById("current-move");

  // Flag to track if audio has been initialized by user interaction
  let audioInitialized = false;

  // Default boxing moves
  const defaultMoves = [
    "Jab",
    "Cross",
    "Hook",
    "Uppercut",
    "Body shot",
    "Slip",
    "Duck",
    "Double jab",
    "Jab cross",
    "Hook cross",
    "Pivot",
    "Defensive block",
    "One-two combo",
    "Triple jab",
    "Roll",
  ];

  // Audio elements for bell and countdown
  const boxingBell = new Audio("boxing_bell.mp4");
  boxingBell.volume = 1.0;
  boxingBell.preload = "auto";

  const countdownSound = new Audio("countdown.mp4");
  countdownSound.volume = 1.0;
  countdownSound.preload = "auto";

  // Flag to track when countdown is playing
  let countdownPlaying = false;

  // Check if device is iOS
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  console.log("Is iOS device:", isIOS);

  // Initialize audio (for iOS devices which require user interaction)
  function initAudio() {
    if (audioInitialized) return;

    try {
      // Create a silent audio context for iOS
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();

      // Unlock bell & countdown
      boxingBell.play().catch(() => {});
      setTimeout(() => boxingBell.pause(), 50);
      countdownSound.play().catch(() => {});
      setTimeout(() => countdownSound.pause(), 50);

      // Unlock speech synthesis: use a non-empty utterance
      const unlockUtter = new SpeechSynthesisUtterance("Start");
      unlockUtter.volume = 0;
      window.speechSynthesis.speak(unlockUtter);

      audioInitialized = true;
      console.log("Audio initialized for iOS device");
    } catch (e) {
      console.error("Audio initialization failed:", e);
    }
  }

  // Function to play boxing bell
  function playBell() {
    try {
      if (isIOS && !audioInitialized) initAudio();

      if (isIOS) {
        const newBell = new Audio("boxing_bell.mp4");
        newBell.volume = 1.0;
        newBell.play().catch((error) => {
          console.error("Error playing bell:", error);
        });
      } else {
        boxingBell.currentTime = 0;
        boxingBell.play().catch((error) => {
          console.error("Error playing bell:", error);
        });
      }
    } catch (error) {
      console.error("Error with bell playback:", error);
    }
  }

  // Function to play countdown
  function playCountdown() {
    if (!countdownPlaying) {
      countdownPlaying = true;
      try {
        if (isIOS && !audioInitialized) initAudio();

        if (isIOS) {
          const newCountdown = new Audio("countdown.mp4");
          newCountdown.volume = 1.0;
          newCountdown
            .play()
            .catch((error) => {
              console.error("Error playing countdown:", error);
            })
            .finally(() => {
              countdownPlaying = false;
            });
        } else {
          countdownSound.currentTime = 0;
          countdownSound
            .play()
            .catch((error) => {
              console.error("Error playing countdown:", error);
            })
            .finally(() => {
              countdownPlaying = false;
            });
        }
      } catch (error) {
        console.error("Error with countdown playback:", error);
        countdownPlaying = false;
      }
    }
  }

  // Timer variables
  let timer;
  let isRunning = false;
  let isPaused = false;
  let roundLength;
  let breakLength;
  let totalRounds;
  let currentRound = 1;
  let isBreak = false;
  let timeRemaining;
  let moveInterval;
  let moveIntervalId;
  let moves = [...defaultMoves];
  let countdownTimeoutId;

  // Speech synthesis voices
  let voices = [];

  // Load and cache voices
  function loadVoices() {
    voices = speechSynthesis.getVoices();
    console.log("Loaded voices:", voices.length);
  }
  loadVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  // Update interval display
  intervalSlider.addEventListener("input", () => {
    intervalValue.textContent =
      parseFloat(intervalSlider.value).toFixed(1) + "s";
  });

  // Update voice speed display
  voiceSpeedSlider.addEventListener("input", () => {
    voiceSpeedValue.textContent =
      parseFloat(voiceSpeedSlider.value).toFixed(1) + "x";
  });

  // Populate default moves
  function populateDefaultMoves() {
    moveList.innerHTML = "";
    moves.forEach((move) => {
      addMoveToList(move);
    });
  }

  // Add move to list
  function addMoveToList(move) {
    const li = document.createElement("li");
    li.textContent = move;

    const removeBtn = document.createElement("span");
    removeBtn.classList.add("remove-move");
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      if (moves.length > 1) {
        moveList.removeChild(li);
        moves = moves.filter((m) => m !== move);
      }
    });

    li.appendChild(removeBtn);
    moveList.appendChild(li);
  }

  // Add custom move
  addMoveBtn.addEventListener("click", () => {
    const newMove = addMoveInput.value.trim();
    if (newMove && !moves.includes(newMove)) {
      moves.push(newMove);
      addMoveToList(newMove);
      addMoveInput.value = "";
    }
  });

  // Format time for display (MM:SS)
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  // Speech synthesis for moves
  function speakMove() {
    const randomIndex = Math.floor(Math.random() * moves.length);
    const move = moves[randomIndex];
    console.log("Speaking move:", move);

    if (!isBreak && currentMoveDisplay.textContent !== "FIGHT ON!") {
      currentMoveDisplay.textContent = "FIGHT ON!";
    }

    if (!isBreak) {
      try {
        if (isIOS && !audioInitialized) initAudio();

        const utterance = new SpeechSynthesisUtterance(move);
        utterance.volume = 1.0;
        utterance.rate = parseFloat(voiceSpeedSlider.value);
        utterance.pitch = 1.0;

        // pick a good English voice
        let selectedVoice =
          voices.find((v) => v.name.includes("Alex")) ||
          voices.find((v) => v.lang.includes("en-")) ||
          voices.find((v) => v.default);

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        speechSynthesis.speak(utterance);
      } catch (error) {
        console.error("Speech synthesis failed:", error);
      }
    }
  }

  // Countdown function for starting the timer
  function startCountdown() {
    console.log("Starting countdown...");
    setupPanel.classList.add("hidden");
    timerScreen.classList.remove("hidden");
    timerScreen.style.display = "flex";

    setTimeout(() => {
      let countdownTime = 10;
      timerDisplay.textContent = formatTime(countdownTime);
      currentMoveDisplay.textContent = "GET READY!";
      playCountdown();

      function updateCountdown() {
        if (countdownTime > 0) {
          timerDisplay.textContent = formatTime(countdownTime);
          countdownTime--;
          countdownTimeoutId = setTimeout(updateCountdown, 1000);
        } else {
          playBell();
          startRound();
        }
      }
      updateCountdown();
    }, 100);
  }

  // Start round timer
  function startRound() {
    isBreak = false;
    timeRemaining = roundLength;
    updateTimerDisplay();
    currentRoundDisplay.textContent = currentRound;
    currentMoveDisplay.textContent = "FIGHT ON!";
    speakMove();
    moveIntervalId = setInterval(speakMove, moveInterval * 1000);
    startTimer();
  }

  // Start break timer
  function startBreak() {
    console.log("Starting break - silencing all speaking");
    isBreak = true;
    timeRemaining = breakLength;
    updateTimerDisplay();
    playBell();
    clearInterval(moveIntervalId);
    window.speechSynthesis.cancel();
    currentMoveDisplay.textContent = "BREAK";
    startTimer();
  }

  // Update timer display
  function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(timeRemaining);
  }

  // Start the timer
  function startTimer() {
    isRunning = true;
    timer = setInterval(() => {
      timeRemaining--;
      updateTimerDisplay();

      if (isBreak && timeRemaining === 10) {
        playCountdown();
      }

      if (timeRemaining === 0) {
        playBell();
      }

      if (timeRemaining <= 0) {
        clearInterval(timer);

        if (isBreak) {
          currentRound++;
          if (currentRound > totalRounds) {
            endWorkout();
          } else {
            startRound();
          }
        } else {
          startBreak();
        }
      }
    }, 1000);
  }

  // End the workout
  function endWorkout() {
    console.log("Workout complete!");
    isRunning = false;
    isPaused = false;
    currentRound = 1;
    playBell();
    clearInterval(timer);
    clearInterval(moveIntervalId);
    clearTimeout(countdownTimeoutId);
    timerScreen.classList.add("hidden");
    timerScreen.style.display = "none";
    setupPanel.classList.remove("hidden");
    currentMoveDisplay.textContent = "";
    pauseBtn.textContent = "PAUSE";
    alert("Workout complete! Great job!");
  }

  // Pause the timer
  pauseBtn.addEventListener("click", () => {
    if (isRunning) {
      clearInterval(timer);
      clearInterval(moveIntervalId);
      isRunning = false;
      isPaused = true;
      pauseBtn.textContent = "RESUME";
      console.log("Timer paused");
    } else if (isPaused) {
      if (!isBreak) {
        moveIntervalId = setInterval(speakMove, moveInterval * 1000);
      }
      startTimer();
      pauseBtn.textContent = "PAUSE";
      isPaused = false;
    }
  });

  // Reset workout
  resetBtn.addEventListener("click", () => {
    console.log("Resetting workout...");
    clearInterval(timer);
    clearInterval(moveIntervalId);
    clearTimeout(countdownTimeoutId);
    isRunning = false;
    isPaused = false;
    currentRound = 1;
    timerScreen.classList.add("hidden");
    timerScreen.style.display = "none";
    setupPanel.classList.remove("hidden");
    currentMoveDisplay.textContent = "";
    pauseBtn.textContent = "PAUSE";
  });

  // Start workout: prime & initialize audio, then grab inputs
  startBtn.addEventListener("click", () => {
    // Prime audio & TTS on first tap
    boxingBell
      .play()
      .then(() => {
        boxingBell.pause();
        boxingBell.currentTime = 0;
      })
      .catch(() => {});
    countdownSound
      .play()
      .then(() => {
        countdownSound.pause();
        countdownSound.currentTime = 0;
      })
      .catch(() => {});
    const primeUt = new SpeechSynthesisUtterance("Ready");
    primeUt.volume = 0;
    window.speechSynthesis.speak(primeUt);

    initAudio();

    // Get round length
    const roundMins =
      parseInt(document.getElementById("round-minutes").value) || 0;
    const roundSecs =
      parseInt(document.getElementById("round-seconds").value) || 0;
    roundLength = roundMins * 60 + roundSecs;

    // Get break length
    const breakMins =
      parseInt(document.getElementById("break-minutes").value) || 0;
    const breakSecs =
      parseInt(document.getElementById("break-seconds").value) || 0;
    breakLength = breakMins * 60 + breakSecs;

    // Get number of rounds
    totalRounds = parseInt(document.getElementById("rounds").value) || 1;

    // Get move interval
    moveInterval = parseFloat(intervalSlider.value);
    if (isNaN(moveInterval) || moveInterval < 0.1) {
      moveInterval = 3; // Default to 3 seconds if invalid
    }

    console.log("Move interval set to:", moveInterval, "seconds");
    console.log("Voice speed set to:", parseFloat(voiceSpeedSlider.value), "x");

    // Update total rounds display
    totalRoundsDisplay.textContent = totalRounds;

    if (roundLength <= 0) {
      alert("Please set a round length greater than 0 seconds.");
      return;
    }

    // Start the countdown
    startCountdown();
  });

  // Also prime audio on any user interaction (fallback)
  document.addEventListener("click", initAudio, { once: true });
  document.addEventListener("touchstart", initAudio, { once: true });

  // Initialize move list UI
  populateDefaultMoves();
});
