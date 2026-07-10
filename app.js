document.addEventListener("DOMContentLoaded", () => {
  const target = document.querySelector("[mindar-image-target]");
  const video = document.querySelector("#overlayVideo");

  target.addEventListener("targetFound", () => {
    console.log("Target found");
    if (video) {
      video.play();
    }
  });

  target.addEventListener("targetLost", () => {
    console.log("Target lost");
    if (video) {
      video.pause();
    }
  });
});
