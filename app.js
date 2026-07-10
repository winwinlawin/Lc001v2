document.addEventListener("DOMContentLoaded", () => {
  const welcomeScreen = document.querySelector("#welcome-screen");
  const arContainer = document.querySelector("#ar-container");
  const beginButton = document.querySelector("#begin-button");
  const sceneEl = document.querySelector("a-scene");
  const target = document.querySelector("[mindar-image-target]");
  const video = document.querySelector("#overlayVideo");

  // ---- Welcome screen -> start AR experience ----
  beginButton.addEventListener("click", () => {
    welcomeScreen.style.display = "none";
    arContainer.style.display = "block";

    const startAR = () => {
      const arSystem = sceneEl.systems["mindar-image-system"];
      if (arSystem) {
        arSystem.start();
      } else {
        // System not ready yet, try again shortly.
        setTimeout(startAR, 100);
      }
    };
    startAR();
  });

  // ---- Video audio autoplay handling ----
  const enableAudioOnInteraction = () => {
    if (video && video.muted) {
      video.muted = false;
      video.play().catch(() => {});
    }
  };
  document.addEventListener("touchstart", enableAudioOnInteraction, { once: true });
  document.addEventListener("click", enableAudioOnInteraction, { once: true });

  // ---- AR target tracking ----
  target.addEventListener("targetFound", () => {
    console.log("Target found");
    if (!video) return;

    video.play().catch(() => {
      // Autoplay with sound was blocked by the browser.
      // Fall back to muted playback; it will unmute on the user's next tap.
      video.muted = true;
      video.play().catch(() => {});
    });
  });

  target.addEventListener("targetLost", () => {
    console.log("Target lost");
    if (video) {
      video.pause();
    }
  });
});
