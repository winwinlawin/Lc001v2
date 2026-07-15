/* =========================================================
   DIAGNOSTIC TEST SCRIPT — app-test.js

   Purpose: recreate the ORIGINAL LC001 prototype behavior exactly,
   but using the new data-driven entity-building approach (reads
   data/paintings.json, builds <a-entity mindar-image-target>
   dynamically). No Info Card, no Experience button, no fade-in,
   no grace period.

   Flow: Start button -> camera opens -> target found -> video
   plays IMMEDIATELY and loops -> target lost -> video stops
   IMMEDIATELY. That's it.

   If the plane is stable here, the issue is in one of the removed
   features (info card trigger / fade-in / grace period / custom
   playback logic). If it's still unstable here, the issue is in
   MindAR config, the target file, or the rendering setup itself.
   ========================================================= */

(function () {
  "use strict";

  async function loadPaintings() {
    const res = await fetch("data/paintings.json");
    const json = await res.json();
    return json.paintings || [];
  }

  function buildTargetEntities(scene, assetsEl, paintings) {
    const refs = {};

    paintings.forEach((painting) => {
      const videoId = "video-" + painting.id;

      const video = document.createElement("video");
      video.setAttribute("id", videoId);
      video.setAttribute("src", painting.video);
      video.setAttribute("preload", "auto");
      video.setAttribute("loop", "true");
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.setAttribute("crossorigin", "anonymous");
      assetsEl.appendChild(video);

      const entity = document.createElement("a-entity");
      entity.setAttribute("mindar-image-target", "targetIndex: " + painting.targetIndex);

      const plane = document.createElement("a-video");
      plane.setAttribute("src", "#" + videoId);
      plane.setAttribute("position", "0 0 0");
      plane.setAttribute("rotation", "0 0 0");
      plane.setAttribute("width", painting.width || 1.5);
      plane.setAttribute("height", painting.height || 1.0);
      // No material override at all here — plain a-video, exactly
      // like the original prototype.

      entity.appendChild(plane);
      scene.appendChild(entity);

      refs[painting.targetIndex] = { entity, videoEl: video, planeEl: plane };
    });

    return refs;
  }

  window.addEventListener("DOMContentLoaded", async () => {
    const startBtn = document.getElementById("start-btn");
    const arContainer = document.getElementById("ar-container");
    const scene = document.getElementById("ar-scene");
    const assetsEl = document.getElementById("ar-assets");

    const paintings = await loadPaintings();
    const refs = buildTargetEntities(scene, assetsEl, paintings);

    Object.values(refs).forEach((ref) => {
      // Immediate play, no card, no delay, no fade.
      ref.entity.addEventListener("targetFound", () => {
        ref.videoEl.currentTime = 0;
        ref.videoEl.play();
      });
      // Immediate stop, no grace period.
      ref.entity.addEventListener("targetLost", () => {
        ref.videoEl.pause();
        ref.videoEl.currentTime = 0;
      });
    });

    startBtn.addEventListener("click", () => {
      startBtn.style.display = "none";
      arContainer.style.display = "block";
      scene.systems["mindar-image-system"].start();
    });
  });
})();
