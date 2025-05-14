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

      // For iOS, we need to play and immediately pause both audio files
      // This "unlocks" the audio for later playback
      boxingBell.play().catch((e) => console.log("Bell init play failed:", e));
      setTimeout(() => boxingBell.pause(), 50);

      countdownSound
        .play()
        .catch((e) => console.log("Countdown init play failed:", e));
      setTimeout(() => countdownSound.pause(), 50);

      // Also unlock speech synthesis
      const utterance = new SpeechSynthesisUtterance("");
      utterance.volume = 0.01;
      speechSynthesis.speak(utterance);

      audioInitialized = true;
      console.log("Audio initialized for iOS device");
    } catch (e) {
      console.error("Audio initialization failed:", e);
    }
  }

  // Function to play boxing bell
  function playBell() {
    try {
      // Always try to ensure audio is initialized (for iOS)
      if (isIOS && !audioInitialized) {
        initAudio();
      }

      // For iOS, we need to create a new audio instance each time
      if (isIOS) {
        const newBell = new Audio("boxing_bell.mp4");
        newBell.volume = 1.0;
        newBell.play().catch((error) => {
          console.error("Error playing bell:", error);
        });
      } else {
        // For non-iOS devices, reuse the audio element
        boxingBell.currentTime = 0; // Reset to start
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
    // Only start if not already playing
    if (!countdownPlaying) {
      countdownPlaying = true;
      try {
        // Always try to ensure audio is initialized (for iOS)
        if (isIOS && !audioInitialized) {
          initAudio();
        }

        // For iOS, create a new audio instance
        if (isIOS) {
          const newCountdown = new Audio("countdown.mp4");
          newCountdown.volume = 1.0;
          newCountdown
            .play()
            .then(() => {
              console.log("Countdown played successfully");
            })
            .catch((error) => {
              console.error("Error playing countdown:", error);
            })
            .finally(() => {
              countdownPlaying = false;
            });
        } else {
          // For non-iOS, reuse the audio element
          countdownSound.currentTime = 0; // Reset to start
          countdownSound
            .play()
            .then(() => {
              console.log("Countdown played successfully");
            })
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

  // Load and cache voices - with better prioritization for coach-like voices
  function loadVoices() {
    voices = speechSynthesis.getVoices();
    console.log("Loaded voices:", voices.length);

    // Log available voices for debugging
    if (voices.length > 0) {
      voices.forEach((voice) => {
        console.log(
          `Voice: ${voice.name}, Lang: ${voice.lang}, Default: ${voice.default}`
        );
      });
    }
  }

  // Try to load voices immediately
  loadVoices();

  // Also set up the event for when voices change/load
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  // Update interval display when slider changes
  intervalSlider.addEventListener("input", () => {
    intervalValue.textContent =
      parseFloat(intervalSlider.value).toFixed(1) + "s";
  });

  // Update voice speed display when slider changes
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
      // Only allow removal if it's not the last move
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

  // Speech synthesis for moves - with improved voice selection and iOS handling
  function speakMove() {
    const randomIndex = Math.floor(Math.random() * moves.length);
    const move = moves[randomIndex];
    console.log("Speaking move:", move);

    // Always ensure "FIGHT ON!" is showing during rounds
    if (!isBreak && currentMoveDisplay.textContent !== "FIGHT ON!") {
      currentMoveDisplay.textContent = "FIGHT ON!";
    }

    // Only speak during rounds, not during breaks
    if (!isBreak) {
      try {
        // Always try to ensure audio is initialized (for iOS)
        if (isIOS && !audioInitialized) {
          initAudio();
        }

        const utterance = new SpeechSynthesisUtterance(move);

        // Set default voice properties for a good boxing coach voice
        utterance.volume = 1.0; // Maximum volume
        utterance.rate = parseFloat(voiceSpeedSlider.value); // Use slider value for speech rate
        utterance.pitch = 1.0; // Natural pitch

        // Find the best voice options
        // 1. Try to find a good English voice, avoiding the annoying ones
        const preferredVoices = [
          // First look for these specific good voices
          "Daniel",
          "Alex",
          "Nathan",
          "Oliver",
          "Matthew",
          "James",
          "Tom",
          // Then fall back to any decent male voice
          "Male",
          "en-US",
          "en-GB",
          "en-AU",
        ];

        // Try to find one of our preferred voices
        let selectedVoice = null;

        // First attempt: look for specific voice names
        for (const voiceName of preferredVoices) {
          const voice = voices.find(
            (v) => v.name.includes(voiceName) && !v.name.includes("Google")
          );
          if (voice) {
            selectedVoice = voice;
            console.log(`Found preferred voice: ${voice.name}`);
            break;
          }
        }

        // Second attempt: if no preferred voice found, try any reasonable fallback
        if (!selectedVoice) {
          selectedVoice =
            voices.find(
              (v) => v.lang.includes("en-") && !v.name.includes("Google")
            ) || voices.find((v) => v.default === true);
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
          console.log(`Using voice: ${selectedVoice.name}`);
        } else {
          console.log("Using default voice - no suitable voice found");
        }

        // Add error handling
        utterance.onerror = (event) => {
          console.error("Speech synthesis error:", event);
        };

        // Speak the move
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

    // Force browser to recognize the change
    setTimeout(() => {
      console.log("Timer screen should be visible now");

      let countdownTime = 10;
      timerDisplay.textContent = formatTime(countdownTime);
      currentMoveDisplay.textContent = "GET READY!";

      // Play the countdown audio
      playCountdown();

      // Update display every second
      function updateCountdown() {
        if (countdownTime > 0) {
          timerDisplay.textContent = formatTime(countdownTime);
          countdownTime--;
          countdownTimeoutId = setTimeout(updateCountdown, 1000);
        } else {
          // Play bell to signal round start
          playBell();
          // Start the first round
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

    // Update round display
    currentRoundDisplay.textContent = currentRound;

    // Set display to "FIGHT ON!" during the round
    currentMoveDisplay.textContent = "FIGHT ON!";

    // Call speakMove immediately to announce the first move
    speakMove();

    // Set interval for speaking moves
    moveIntervalId = setInterval(speakMove, moveInterval * 1000);

    // Start the timer
    startTimer();
  }

  // Start break timer
  function startBreak() {
    console.log("Starting break - silencing all speaking");
    isBreak = true;
    timeRemaining = breakLength;
    updateTimerDisplay();

    // Play bell to signal round end
    playBell();

    // IMMEDIATELY clear the move interval - no speaking during breaks
    clearInterval(moveIntervalId);

    // Multiple approaches to ensure speech stops completely
    try {
      // Cancel any pending speech
      window.speechSynthesis.cancel();

      // Double check by clearing any ongoing speech
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        console.log("Forced stop of any ongoing speech");
      }
    } catch (e) {
      console.error("Error stopping speech:", e);
    }

    // Set break display
    currentMoveDisplay.textContent = "BREAK";

    // Start the timer
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

      // Play countdown sound in the last 10 seconds of a BREAK
      if (isBreak && timeRemaining === 10) {
        playCountdown();
      }

      // Play bell at the very end of a break (when transitioning to a round)
      if (timeRemaining === 0) {
        if (isBreak) {
          // At end of break, play bell for round start
          playBell();
        } else {
          // At end of round, play bell for round end (break start)
          playBell();
        }
      }

      // End of round/break
      if (timeRemaining <= 0) {
        clearInterval(timer);

        if (isBreak) {
          // End of break, start next round
          currentRound++;

          if (currentRound > totalRounds) {
            // End of workout
            endWorkout();
          } else {
            startRound();
          }
        } else {
          // End of round, start break
          startBreak();
        }
      }
    }, 1000);
  }

  // End the workout
  function endWorkout() {
    console.log("Workout complete!");
    isRunning = false;
    isPaused = false; // Reset the pause state
    currentRound = 1;

    // Play final bell
    playBell();

    // Clear any remaining timers
    clearInterval(timer);
    clearInterval(moveIntervalId);
    clearTimeout(countdownTimeoutId);

    // Reset the UI
    timerScreen.classList.add("hidden");
    timerScreen.style.display = "none";
    setupPanel.classList.remove("hidden");
    currentMoveDisplay.textContent = "";
    pauseBtn.textContent = "PAUSE";

    // Show completion message
    alert("Workout complete! Great job!");
  }

  // Pause the timer
  pauseBtn.addEventListener("click", () => {
    if (isRunning) {
      // Pause the timer
      clearInterval(timer);
      clearInterval(moveIntervalId);
      isRunning = false;
      isPaused = true;
      pauseBtn.textContent = "RESUME";
      console.log("Timer paused");
    } else if (isPaused) {
      // Resume the timer
      console.log("Resuming timer, isBreak:", isBreak);

      // Only restart move announcements if not in a break
      if (!isBreak) {
        moveIntervalId = setInterval(speakMove, moveInterval * 1000);
      }

      // Restart the timer
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

    // Make sure we properly reset the display
    timerScreen.classList.add("hidden");
    timerScreen.style.display = "none";
    setupPanel.classList.remove("hidden");
    currentMoveDisplay.textContent = "";
    pauseBtn.textContent = "PAUSE";
  });

  // Start workout and initialize audio on first user click
  startBtn.addEventListener("click", () => {
    // Initialize audio on first user interaction (important for iOS)
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

    // Validate inputs (ensure we have at least some time)
    if (roundLength <= 0) {
      alert("Please set a round length greater than 0 seconds.");
      return;
    }

    // Start the countdown
    startCountdown();
  });

  // Set up handlers to initialize audio on all types of user interaction
  document.addEventListener("click", initAudio, { once: true });
  document.addEventListener("touchstart", initAudio, { once: true });

  // Initialize
  populateDefaultMoves();
});
