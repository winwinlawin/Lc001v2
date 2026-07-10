document.addEventListener("DOMContentLoaded", () => {
  const target = document.querySelector("[mindar-image-target]");
  const video = document.querySelector("#overlayVideo");

  let userHasInteracted = false;

  // Once the user taps/touches anywhere, unmute if we had to fall back to muted playback.
  const enableAudioOnInteraction = () => {
    userHasInteracted = true;
    if (video && video.muted) {
      video.muted = false;
      video.play().catch(() => {});
    }
  };
  document.addEventListener("touchstart", enableAudioOnInteraction, { once: true });
  document.addEventListener("click", enableAudioOnInteraction, { once: true });

  target.addEventListener("targetFound", () => {
    console.log("Target found");
    if (!video) return;

    video.play().catch(() => {
      // Autoplay with sound was blocked by the browser.
      // Fall back to muted playback so the video still plays;
      // it will unmute automatically on the user's next tap.
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
