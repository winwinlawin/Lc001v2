/* =========================================================
   LAWIN CANVAS — AR ENGINE (app.js)

   This file is the "engine." It is intentionally generic:
   it never mentions LC001 by name. Everything painting-specific
   lives in data/paintings.json. Adding LC002, LC003... should
   never require touching this file.

   Structure of this file:
     1. DataStore   — loads paintings.json
     2. UI          — controls the 4 screens (welcome, instruction,
                      info card, ar video) — no AR knowledge at all
     3. ARController— builds MindAR target entities from data,
                      listens for targetFound/targetLost
     4. App         — wires everything together (the only place
                      that knows about the full flow/state machine)
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. DATA STORE
     --------------------------------------------------------- */
  const DataStore = {
    paintings: [],

    async load() {
      const res = await fetch("data/paintings.json");
      if (!res.ok) {
        throw new Error("Could not load data/paintings.json (" + res.status + ")");
      }
      const json = await res.json();
      this.paintings = json.paintings || [];
      return this.paintings;
    },

    getByTargetIndex(index) {
      return this.paintings.find((p) => p.targetIndex === index);
    },
  };

  /* ---------------------------------------------------------
     2. UI — pure DOM control, knows nothing about MindAR
     --------------------------------------------------------- */
  const UI = {
    els: {},

    init() {
      this.els.welcome = document.getElementById("welcome-screen");
      this.els.beginBtn = document.getElementById("begin-button");
      this.els.instruction = document.getElementById("instruction-overlay");
      this.els.arContainer = document.getElementById("ar-container");
      this.els.infoCard = document.getElementById("info-card");
      this.els.experienceBtn = document.getElementById("experience-button");

      this.els.icEyebrow = document.getElementById("ic-eyebrow");
      this.els.icTitle = document.getElementById("ic-title");
      this.els.icSubtitle = document.getElementById("ic-subtitle");
      this.els.icStory = document.getElementById("ic-story");
      this.els.icMeta = document.getElementById("ic-meta");
    },

    onBeginPressed(handler) {
      this.els.beginBtn.addEventListener("click", handler);
    },

    onExperiencePressed(handler) {
      this.els.experienceBtn.addEventListener("click", handler);
    },

    showAR() {
      this.els.welcome.classList.add("hidden");
      this.els.arContainer.classList.remove("hidden");
    },

    showInstruction() {
      this.els.instruction.classList.remove("hidden");
    },

    hideInstruction() {
      this.els.instruction.classList.add("hidden");
    },

    showInfoCard(painting) {
      this.els.icEyebrow.textContent = painting.eyebrow || "";
      this.els.icTitle.textContent = painting.title || "";
      this.els.icSubtitle.textContent = painting.subtitle || "";
      this.els.icStory.textContent = painting.story || "";
      this.els.icMeta.textContent = painting.meta || "";
      this.els.infoCard.classList.remove("hidden");
    },

    hideInfoCard() {
      this.els.infoCard.classList.add("hidden");
    },
  };

  /* ---------------------------------------------------------
     3. AR CONTROLLER — builds entities from data, exposes
        callbacks for found/lost, controls video playback
     --------------------------------------------------------- */
  const ARController = {
    scene: null,
    assetsEl: null,
    entitiesByIndex: {},

    init() {
      this.scene = document.getElementById("ar-scene");
      this.assetsEl = document.getElementById("ar-assets");
    },

    // Builds one <a-video> asset + one <a-entity mindar-image-target>
    // per painting in paintings.json. This is what makes adding a
    // new painting a pure data change: one new JSON entry produces
    // one new target entity automatically.
    buildTargetEntities(paintings) {
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
        this.assetsEl.appendChild(video);

        const entity = document.createElement("a-entity");
        entity.setAttribute("mindar-image-target", "targetIndex: " + painting.targetIndex);

        const plane = document.createElement("a-video");
        plane.setAttribute("src", "#" + videoId);
        plane.setAttribute("position", "0 0 0");
        plane.setAttribute("rotation", "0 0 0");
        plane.setAttribute("width", painting.width || 1.5);
        plane.setAttribute("height", painting.height || 1.0);
        plane.setAttribute("visible", "false");
        // Starts fully transparent — playVideo() will fade this in,
        // stopVideo() will reset it back to 0 for the next awakening.
        plane.setAttribute("material", "shader: flat; transparent: true; opacity: 0");

        entity.appendChild(plane);
        this.scene.appendChild(entity);

        this.entitiesByIndex[painting.targetIndex] = {
          entity,
          videoEl: video,
          planeEl: plane,
          painting,
        };
      });
    },

    // Wires targetFound/targetLost for every entity we built.
    // onFound/onLost receive the painting data object.
    bindEvents(onFound, onLost) {
      Object.values(this.entitiesByIndex).forEach((ref) => {
        ref.entity.addEventListener("targetFound", () => onFound(ref));
        ref.entity.addEventListener("targetLost", () => onLost(ref));
      });
    },

    start() {
      this.scene.systems["mindar-image-system"].start();
    },

    playVideo(ref) {
      ref.planeEl.setAttribute("visible", "true");
      ref.videoEl.currentTime = 0;
      ref.videoEl.play();

      // "Awakening" effect: fade the painting's motion in from fully
      // transparent to fully opaque over ~1s, using A-Frame's built-in
      // animation component (no manual rAF loop needed).
      ref.planeEl.setAttribute("material", "opacity", 0);
      ref.planeEl.setAttribute("animation__awaken", {
        property: "material.opacity",
        from: 0,
        to: 1,
        dur: 1000,
        easing: "easeInOutQuad",
      });
    },

    stopVideo(ref) {
      ref.videoEl.pause();
      ref.videoEl.currentTime = 0;
      ref.planeEl.removeAttribute("animation__awaken");
      ref.planeEl.setAttribute("material", "opacity", 0);
      ref.planeEl.setAttribute("visible", "false");
    },
  };

  /* ---------------------------------------------------------
     4. APP — the state machine. This is the only place that
        knows the full step-by-step flow.
     --------------------------------------------------------- */
  const App = {
    currentRef: null, // the painting currently found/playing

    // --- Tracking grace period ---
    // MindAR briefly reports targetLost on ordinary hand shake or a person
    // walking through frame. Instead of ending the experience instantly,
    // we wait GRACE_PERIOD_MS before treating it as a real loss. If the
    // same painting is found again inside that window, we simply cancel
    // the timer and touch nothing else — the video was never paused, so
    // it keeps playing/looping the whole time and the reunion feels seamless.
    GRACE_PERIOD_MS: 3000,
    lossTimer: null,
    lossTimerRef: null,

    async init() {
      UI.init();
      ARController.init();

      const paintings = await DataStore.load();
      ARController.buildTargetEntities(paintings);
      ARController.bindEvents(this.onTargetFound.bind(this), this.onTargetLost.bind(this));

      UI.onBeginPressed(this.onBeginPressed.bind(this));
      UI.onExperiencePressed(this.onExperiencePressed.bind(this));
    },

    // Step 2 -> 3: camera opens, instruction shown, tracking starts
    onBeginPressed() {
      UI.showAR();
      UI.showInstruction();
      ARController.start();
    },

    // Step 4: a registered painting is detected
    onTargetFound(ref) {
      // Case A: a grace countdown is running for a DIFFERENT painting —
      // that painting is truly gone (a new one just appeared), so close
      // it out immediately before greeting the new one.
      if (this.lossTimer && this.lossTimerRef !== ref) {
        clearTimeout(this.lossTimer);
        this.finalizeLoss(this.lossTimerRef);
      }

      // Case B: a grace countdown is running for THIS SAME painting —
      // it was only a brief flicker. Cancel the countdown and change
      // nothing else: card stays visible, video was never paused.
      if (this.lossTimer && this.lossTimerRef === ref) {
        clearTimeout(this.lossTimer);
        this.lossTimer = null;
        this.lossTimerRef = null;
        this.currentRef = ref;
        return;
      }

      // Case C: a genuinely fresh detection.
      this.currentRef = ref;
      UI.hideInstruction();
      UI.showInfoCard(ref.painting);
    },

    // Step 5: user presses "Experience the Painting"
    onExperiencePressed() {
      if (!this.currentRef) return;
      UI.hideInfoCard();
      ARController.playVideo(this.currentRef);
    },

    // Step 7: tracking lost -> start (or let run) a grace countdown
    // instead of ending the experience immediately.
    onTargetLost(ref) {
      if (this.currentRef !== ref) return; // not the active painting, ignore

      this.lossTimerRef = ref;
      this.lossTimer = setTimeout(() => {
        this.finalizeLoss(ref);
      }, this.GRACE_PERIOD_MS);
    },

    // Called only once the grace period fully expires with no re-detection.
    finalizeLoss(ref) {
      ARController.stopVideo(ref);
      UI.hideInfoCard();
      UI.showInstruction();
      if (this.currentRef === ref) {
        this.currentRef = null;
      }
      this.lossTimer = null;
      this.lossTimerRef = null;
    },
  };

  window.addEventListener("DOMContentLoaded", () => {
    App.init();
  });
})();
