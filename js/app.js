"use strict";

/* --------------------------------------------------------------------------
   EASY CUSTOMIZATION
   Edit text and asset paths here. The rest of the file is application logic.
   All paths stay relative so the site works inside a GitHub Pages subfolder.
   -------------------------------------------------------------------------- */
const CONFIG = {
  coupleName: "Daria & Norbert",
  introSubtitle: "Our little story",
  parchmentTitle: "Este ceva ce vreau să-ți spun…",
  parchmentMessage: [
    "Nu toate poveștile încep cu focuri de artificii. Unele încep cu un zâmbet, cu o privire întâmplătoare sau într-o zi cât se poate de obișnuită.",
    "Apoi, dintr-odată, îți dai seama că alături de cineva chiar și zilele obișnuite devin mai speciale. Tăcerea e mai plăcută, râsetele sunt mai sincere, iar amintirile devin tot mai prețioase.",
    "Îți mulțumesc că faci parte din povestea mea. Sper că ne mai așteaptă încă foarte multe pagini scrise împreună."
  ],
  signature: "— Norbert",
  completionTitle: "Ai descoperit toate amintirile ❤️",
  completionMessage: "Dar cea mai frumoasă poveste abia acum începe…",
  finaleMessage: "Povestea mea preferată suntem noi.",
  photos: [
    { src: "./assets/photos/photo1.jpg", caption: "Primul nostru moment preferat", date: "Amintirea I" },
    { src: "./assets/photos/photo2.jpg", caption: "O zi pe care nu o voi uita", date: "Amintirea II" },
    { src: "./assets/photos/photo3.jpg", caption: "Doar noi doi", date: "Amintirea III" },
    { src: "./assets/photos/photo4.jpg", caption: "Niciodată prea multe zâmbete", date: "Amintirea IV" },
    { src: "./assets/photos/photo5.jpg", caption: "Și încă ne așteaptă atât de multe", date: "Amintirea V" }
  ],
  audio: {
    intro: "./assets/audio/intro.mp3",
    background: "./assets/audio/rares - O viata intreaga cu tine  Lyric Video.mp3",
    chestOpen: "./assets/audio/chest-open.mp3",
    magic: "./assets/audio/magic.mp3",
    glitch: "./assets/audio/glitch.mp3"
  },
  // When true, the background song starts on the first tap and continues through the intro.
  playBackgroundFromStart: true,
  introDuration: 26000,
  storageKey: "norbi-dasa-opened-chests"
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const scenes = $$(".scene");
const state = {
  currentScene: "startScene",
  opened: new Set(),
  galleryIndex: 0,
  started: false,
  muted: false,
  introTimer: null,
  starTimers: [],
  musicFadeTimer: null,
  completionShownThisVisit: false,
  messageTimers: []
};

/* Audio errors are intentionally swallowed: every scene also works silently. */
class AudioSystem {
  constructor(paths) {
    this.volume = 0.34;
    this.enabled = true;
    this.tracks = Object.fromEntries(Object.entries(paths).map(([name, src]) => {
      const audio = new Audio(src);
      audio.preload = "none";
      audio.volume = this.volume;
      audio.addEventListener("error", () => audio.dataset.unavailable = "true");
      if (name === "background") audio.loop = true;
      return [name, audio];
    }));
  }

  async play(name, { restart = true } = {}) {
    const audio = this.tracks[name];
    if (!this.enabled || !audio || audio.dataset.unavailable === "true") return;
    if (restart) audio.currentTime = 0;
    try { await audio.play(); } catch (_) { /* Missing asset or browser policy. */ }
  }

  stop(name) {
    const audio = this.tracks[name];
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }

  fadeTo(name, target, duration = 900) {
    const audio = this.tracks[name];
    if (!audio || audio.paused) return;
    const start = audio.volume;
    const startedAt = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      audio.volume = start + (target - start) * progress;
      if (progress < 1) requestAnimationFrame(tick);
      else if (target === 0) audio.pause();
    };
    requestAnimationFrame(tick);
  }

  setMuted(muted) {
    this.enabled = !muted;
    Object.values(this.tracks).forEach((audio) => { audio.muted = muted; });
    if (!muted && state.started && this.tracks.background.paused && state.currentScene !== "introScene") {
      this.play("background", { restart: false });
    }
  }
}

const audio = new AudioSystem(CONFIG.audio);

function showScene(id) {
  scenes.forEach((scene) => {
    const active = scene.id === id;
    scene.classList.toggle("scene--active", active);
    scene.setAttribute("aria-hidden", String(!active));
  });
  state.currentScene = id;
  if (id !== "messageScene") clearMessageAnimation();
}

function applyConfig() {
  document.title = CONFIG.coupleName;
  $("#introTitle").textContent = CONFIG.coupleName;
  const [firstName = "Daria", secondName = "Norbert"] = CONFIG.coupleName.split("&").map((name) => name.trim());
  ["#introFirstName", "#introFirstNameGlow"].forEach((selector) => { $(selector).textContent = firstName; });
  ["#introSecondName", "#introSecondNameGlow"].forEach((selector) => { $(selector).textContent = secondName; });
  $("#introSubtitle").textContent = CONFIG.introSubtitle;
  $("#messageHeading").textContent = CONFIG.parchmentTitle;
  $("#messageSignature").textContent = CONFIG.signature;
  $("#completionHeading").textContent = CONFIG.completionTitle;
  $("#completionMessage").textContent = CONFIG.completionMessage;
  $("#finaleMessage").textContent = CONFIG.finaleMessage;
}

function escapeHtml(text) {
  const element = document.createElement("span");
  element.textContent = text;
  return element.innerHTML;
}

function loadOpenedState() {
  try {
    const stored = JSON.parse(localStorage.getItem(CONFIG.storageKey) || "[]");
    if (Array.isArray(stored)) stored.forEach((name) => state.opened.add(name));
  } catch (_) { /* Storage may be disabled. */ }
  updateChestState();
}

function saveOpenedState() {
  try { localStorage.setItem(CONFIG.storageKey, JSON.stringify([...state.opened])); } catch (_) { /* Non-critical. */ }
}

function updateChestState() {
  $$(".chest-card").forEach((card) => {
    const isOpened = state.opened.has(card.dataset.chest);
    card.classList.toggle("is-opened", isOpened);
    $(".chest-card__status", card).textContent = isOpened ? "Deschis" : "Deschide";
  });
  $("#progressLabel").textContent = `${state.opened.size} / 3 secrete descoperite`;
}

function startExperience() {
  if (state.started) return;
  state.started = true;
  if (CONFIG.playBackgroundFromStart) audio.play("background");
  else audio.play("intro");
  showScene("introScene");
  const duration = reducedMotion ? 1200 : CONFIG.introDuration;
  if (!reducedMotion) {
    state.starTimers = [
      window.setTimeout(() => $("#introArcMotion")?.beginElement?.(), 14000),
      window.setTimeout(() => $("#introDiveMotion")?.beginElement?.(), 16950),
      window.setTimeout(() => $("#introTitleMotion")?.beginElement?.(), 17400)
    ];
    if (CONFIG.playBackgroundFromStart) {
      state.musicFadeTimer = window.setTimeout(() => audio.fadeTo("background", 0.22, 850), 24900);
    }
  }
  state.introTimer = window.setTimeout(finishIntro, duration);
}

function finishIntro() {
  window.clearTimeout(state.introTimer);
  state.starTimers.forEach(window.clearTimeout);
  state.starTimers = [];
  window.clearTimeout(state.musicFadeTimer);
  if (!CONFIG.playBackgroundFromStart) {
    audio.fadeTo("intro", 0, 700);
    audio.tracks.background.volume = 0;
    audio.play("background");
    audio.fadeTo("background", audio.volume, 1300);
  } else {
    audio.fadeTo("background", audio.volume, 1100);
  }
  showScene("chestScene");
}

function openChest(card) {
  if (card.classList.contains("is-opening")) return;
  const name = card.dataset.chest;
  card.classList.add("is-opening");
  audio.play("chestOpen");
  burstFromElement(card, 28, ["#f5cf78", "#fff2bb", "#ef7898"]);
  window.setTimeout(() => {
    state.opened.add(name);
    saveOpenedState();
    updateChestState();
    card.classList.remove("is-opening");
    const sceneMap = { memories: "memoriesScene", message: "messageScene", secret: "secretScene" };
    showScene(sceneMap[name]);
    if (name === "message") animateMessage();
  }, reducedMotion ? 120 : 850);
}

function returnToChests() {
  showScene("chestScene");
  window.setTimeout(checkCompletion, reducedMotion ? 100 : 650);
}

function checkCompletion() {
  if (state.opened.size === 3 && !state.completionShownThisVisit) {
    state.completionShownThisVisit = true;
    audio.play("magic");
    burstAt(window.innerWidth / 2, window.innerHeight / 2, 72, ["#f5cf78", "#ef7898", "#b5c9ff"]);
    showScene("completionScene");
  }
}

function renderGallery() {
  const track = $("#photoTrack");
  const dots = $("#galleryDots");
  track.innerHTML = "";
  dots.innerHTML = "";

  CONFIG.photos.forEach((photo, index) => {
    const button = document.createElement("button");
    button.className = "polaroid";
    button.type = "button";
    button.dataset.index = index;
    button.setAttribute("aria-label", `Mărește fotografia: ${photo.caption}`);
    button.innerHTML = `
      <span class="photo-media">
        <span class="media-placeholder"><span>✦</span><small>${escapeHtml(photo.date || "Amintire")}</small></span>
        <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.caption)}" loading="lazy">
      </span>
      <span class="polaroid__caption">${escapeHtml(photo.caption)}</span>`;
    const image = $("img", button);
    image.addEventListener("error", () => { image.hidden = true; });
    image.addEventListener("load", () => { image.hidden = false; });
    button.addEventListener("click", () => openLightbox(index));
    track.appendChild(button);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `Fotografia ${index + 1}`);
    dot.addEventListener("click", () => scrollToPhoto(index));
    dots.appendChild(dot);
  });
  updateGalleryUI(0);
}

function scrollToPhoto(index) {
  const cards = $$(".polaroid");
  if (!cards.length) return;
  const safeIndex = (index + cards.length) % cards.length;
  cards[safeIndex].scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest", inline: "center" });
  updateGalleryUI(safeIndex);
}

function updateGalleryUI(index) {
  state.galleryIndex = index;
  $$(".polaroid").forEach((card, i) => card.classList.toggle("is-current", i === index));
  $$("#galleryDots button").forEach((dot, i) => dot.classList.toggle("is-current", i === index));
}

function observeGallery() {
  const track = $("#photoTrack");
  let raf = null;
  track.addEventListener("scroll", () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const center = track.scrollLeft + track.clientWidth / 2;
      let closest = 0;
      let distance = Infinity;
      $$(".polaroid").forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const currentDistance = Math.abs(center - cardCenter);
        if (currentDistance < distance) { distance = currentDistance; closest = index; }
      });
      updateGalleryUI(closest);
    });
  }, { passive: true });
  track.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") scrollToPhoto(state.galleryIndex + 1);
    if (event.key === "ArrowLeft") scrollToPhoto(state.galleryIndex - 1);
  });
}

function openLightbox(index) {
  const photo = CONFIG.photos[index];
  const image = $("#lightboxImage");
  image.hidden = false;
  image.src = photo.src;
  image.alt = photo.caption;
  image.onerror = () => { image.hidden = true; };
  $("#lightboxCaption").textContent = photo.caption;
  const dialog = $("#lightbox");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeLightbox() {
  const dialog = $("#lightbox");
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function animateMessage() {
  clearMessageAnimation();
  const container = $("#messageCopy");
  container.innerHTML = "";
  CONFIG.parchmentMessage.forEach((line, index) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = line;
    container.appendChild(paragraph);
    const timer = window.setTimeout(() => paragraph.classList.add("is-visible"), reducedMotion ? 0 : 1050 + index * 650);
    state.messageTimers.push(timer);
  });
}

function clearMessageAnimation() {
  state.messageTimers.forEach(window.clearTimeout);
  state.messageTimers = [];
}

function runFakeShutdown() {
  audio.play("glitch");
  showScene("shutdownScene");
  const shutdown = $("#shutdownScene");
  shutdown.className = "scene shutdown-scene scene--active is-glitching";
  $("#shutdownStatus").textContent = "Se închide site-ul…";
  window.setTimeout(() => {
    shutdown.classList.remove("is-glitching");
    shutdown.classList.add("is-game-over");
    $("#shutdownStatus").textContent = "Conexiune pierdută.";
  }, reducedMotion ? 100 : 900);
  window.setTimeout(() => shutdown.classList.add("is-joking"), reducedMotion ? 300 : 2450);
}

function resetShutdown() {
  const shutdown = $("#shutdownScene");
  shutdown.className = "scene shutdown-scene";
  returnToChests();
}

function burstFromElement(element, amount, colors) {
  const rect = element.getBoundingClientRect();
  burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, amount, colors);
}

function burstAt(x, y, amount, colors) {
  const layer = $("#particleLayer");
  if (reducedMotion) amount = Math.min(amount, 12);
  for (let i = 0; i < amount; i += 1) {
    const particle = document.createElement("i");
    const angle = Math.random() * Math.PI * 2;
    const distance = 45 + Math.random() * Math.min(window.innerWidth * .45, 360);
    particle.className = "particle";
    particle.style.setProperty("--x", `${x}px`);
    particle.style.setProperty("--y", `${y}px`);
    particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty("--size", `${2 + Math.random() * 5}px`);
    particle.style.setProperty("--duration", `${.7 + Math.random() * 1.1}s`);
    particle.style.setProperty("--color", colors[Math.floor(Math.random() * colors.length)]);
    particle.addEventListener("animationend", () => particle.remove());
    layer.appendChild(particle);
  }
}

function toggleSound() {
  state.muted = !state.muted;
  audio.setMuted(state.muted);
  const button = $("#soundToggle");
  button.classList.toggle("is-muted", state.muted);
  button.setAttribute("aria-pressed", String(state.muted));
  button.setAttribute("aria-label", state.muted ? "Activează sunetul" : "Dezactivează sunetul");
}

function bindEvents() {
  $("#startButton").addEventListener("click", startExperience);
  $("#skipIntro").addEventListener("click", finishIntro);
  $("#soundToggle").addEventListener("click", toggleSound);
  $$(".chest-card").forEach((card) => card.addEventListener("click", () => openChest(card)));
  $$('[data-back]').forEach((button) => button.addEventListener("click", returnToChests));
  $("#galleryPrev").addEventListener("click", () => scrollToPhoto(state.galleryIndex - 1));
  $("#galleryNext").addEventListener("click", () => scrollToPhoto(state.galleryIndex + 1));
  $("#lightboxClose").addEventListener("click", closeLightbox);
  $("#lightbox").addEventListener("click", (event) => { if (event.target === event.currentTarget) closeLightbox(); });
  $("#trollTrigger").addEventListener("click", runFakeShutdown);
  $("#shutdownBack").addEventListener("click", resetShutdown);
  $("#heartButton").addEventListener("click", () => {
    audio.play("magic");
    burstAt(window.innerWidth / 2, window.innerHeight / 2, 80, ["#f5cf78", "#ef7898", "#ffffff"]);
    showScene("finaleScene");
  });
  const trollImage = $("#trollImage");
  trollImage.addEventListener("error", () => { trollImage.hidden = true; });
  trollImage.addEventListener("load", () => { trollImage.hidden = false; });
}

function init() {
  applyConfig();
  loadOpenedState();
  renderGallery();
  observeGallery();
  bindEvents();
}

init();
