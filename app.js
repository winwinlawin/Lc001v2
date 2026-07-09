document.addEventListener("DOMContentLoaded", () => {
  const target = document.querySelector("[mindar-image-target]");

  target.addEventListener("targetFound", () => {
    console.log("Target found");
  });

  target.addEventListener("targetLost", () => {
    console.log("Target lost");
  });
});
