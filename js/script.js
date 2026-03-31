const startInput = document.getElementById("startDate");
const endInput = document.getElementById("endDate");
const btn = document.querySelector(".filters button");
const gallery = document.getElementById("gallery");

// Holds preloaded Image objects — must stay in scope to prevent garbage collection
const preloadCache = [];

setupDateInputs(startInput, endInput);

const spaceFacts = [
  "A day on Venus is longer than a year on Venus.",
  "Neutron stars can spin at up to 600 rotations per second.",
  "The Sun makes up 99.86% of the total mass of our solar system.",
  "There are more stars in the universe than grains of sand on all of Earth's beaches.",
  "One million Earths could fit inside the Sun.",
  "Apollo astronaut footprints on the Moon will last millions of years.",
  "Saturn's rings are mostly ice and rock, yet only ~30 feet thick.",
  "Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.",
  "The Milky Way is roughly 100,000 light-years wide.",
  "Olympus Mons on Mars is nearly 3× taller than Mount Everest.",
];

// Pick a random fact and inject it above the gallery
function showRandomFact() {
  const old = document.getElementById("space-fact");
  if (old) old.remove();

  const fact = spaceFacts[Math.floor(Math.random() * spaceFacts.length)];
  const box = document.createElement("div");
  box.id = "space-fact";
  box.innerHTML = `<strong>🌌 Did You Know?</strong> ${fact}`;
  document.querySelector(".container").insertBefore(box, gallery);
}

showRandomFact();

// Silently preload HD images into the browser cache after the gallery renders
function preloadImages(items) {
  // Clear previous cache when a new date range is fetched
  preloadCache.length = 0;

  items.forEach((item) => {
    // Only preload image entries, videos don't benefit from this
    if (item.media_type !== "image") return;

    const img = new Image();
    img.src = item.hdurl || item.url;
    // Keep the reference alive so the browser doesn't garbage collect it
    preloadCache.push(img);
  });
}

// Extract a YouTube video ID from any common YouTube URL format
function getYouTubeId(url) {
  const match = url.match(
    /(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
  );
  return match ? match[1] : null;
}

// Returns true if the URL is a YouTube link
function isYouTube(url) {
  return /youtube\.com|youtu\.be/.test(url);
}

// Returns true if the URL points directly to an mp4 file
function isMP4(url) {
  return url.toLowerCase().endsWith(".mp4");
}

function showLoading() {
  gallery.innerHTML = `
    <div class="loading">
      <div class="loading-icon">🔄</div>
      <p>Loading space photos…</p>
    </div>
  `;
}

function showError(msg) {
  gallery.innerHTML = `
    <div class="placeholder">
      <div class="placeholder-icon">⚠️</div>
      <p>${msg}</p>
    </div>
  `;
}

// Build the thumbnail/preview area for a video card
function buildCardMedia(url) {
  if (isYouTube(url)) {
    const id = getYouTubeId(url);
    const thumb = id
      ? `<img src="https://img.youtube.com/vi/${id}/hqdefault.jpg" alt="Video thumbnail" />`
      : `<div class="video-placeholder">🎬</div>`;
    return `
      <div class="video-thumb-wrapper">
        ${thumb}
        <span class="video-badge">▶ YouTube</span>
      </div>
    `;
  }

  if (isMP4(url)) {
    return `
      <div class="video-thumb-wrapper">
        <div class="video-placeholder">🎬</div>
        <span class="video-badge">▶ MP4</span>
      </div>
    `;
  }

  return `
    <div class="video-thumb-wrapper">
      <div class="video-placeholder">🎬</div>
      <span class="video-badge">▶ Video</span>
    </div>
  `;
}

// Build the media section shown inside the modal
function buildModalMedia(url, title) {
  // Generic watch button shown for all video types
  const watchBtn = `
    <a href="${url}" target="_blank" rel="noopener" class="video-link">
      🎬 Watch Video
    </a>
  `;

  if (isYouTube(url)) {
    const id = getYouTubeId(url);
    const embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`;
    return `
      <div class="modal-video-wrapper">
        <iframe
          src="${embedUrl}"
          title="${title}"
          frameborder="0"
          allow="autoplay; encrypted-media; fullscreen"
          allowfullscreen
        ></iframe>
      </div>
      ${watchBtn}
    `;
  }

  if (isMP4(url)) {
    return `
      <video class="modal-video-player" controls autoplay muted>
        <source src="${url}" type="video/mp4" />
        Your browser does not support embedded video.
      </video>
      ${watchBtn}
    `;
  }

  return `
    <div class="modal-generic-video">
      <p>🎬 This entry contains a video.</p>
      ${watchBtn}
    </div>
  `;
}

// Build a single gallery card for one APOD item
function createCard(item) {
  const card = document.createElement("div");
  card.className = "gallery-item";

  if (item.media_type === "video") {
    card.innerHTML = `
      ${buildCardMedia(item.url)}
      <h3>${item.title}</h3>
      <p class="item-date">${item.date}</p>
    `;
  } else {
    card.innerHTML = `
      <img src="${item.url}" alt="${item.title}" />
      <h3>${item.title}</h3>
      <p class="item-date">${item.date}</p>
    `;
  }

  card.addEventListener("click", () => openModal(item));
  return card;
}

// Populate the gallery with an array of APOD items
function renderGallery(items) {
  gallery.innerHTML = "";

  if (!items || items.length === 0) {
    showError("No images found for that date range.");
    return;
  }

  items.forEach((item) => gallery.appendChild(createCard(item)));

  // Kick off background preloading after cards are painted
  preloadImages(items);
}

// Fetch APOD data from NASA for the chosen date range
async function fetchAPOD(startDate, endDate) {
  const API_KEY = CONFIG.NASA_KEY;
  const url =
    `https://api.nasa.gov/planetary/apod` +
    `?api_key=${API_KEY}&start_date=${startDate}&end_date=${endDate}`;

  showLoading();

  try {
    const res = await fetch(url);

    if (!res.ok) throw new Error(`API error ${res.status}`);

    const data = await res.json();
    // Single-day requests return an object; ranges return an array
    renderGallery(Array.isArray(data) ? data : [data]);
  } catch (err) {
    console.error(err);
    showError("Failed to load space photos. Please try again.");
  }
}

btn.addEventListener("click", () => {
  const startDate = startInput.value;
  const endDate = endInput.value;

  if (!startDate || !endDate) {
    alert("Please select both a start and end date.");
    return;
  }

  fetchAPOD(startDate, endDate);
});

// Open the detail modal for a given APOD item
function openModal(item) {
  const old = document.getElementById("apod-modal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.id = "apod-modal";
  modal.className = "modal-overlay";

  const media =
    item.media_type === "video"
      ? buildModalMedia(item.url, item.title)
      : `<img src="${item.hdurl || item.url}" alt="${item.title}" class="modal-image" />`;

  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" aria-label="Close">✕</button>
      ${media}
      <div class="modal-info">
        <h2>${item.title}</h2>
        <p class="modal-date">${item.date}</p>
        <p class="modal-explanation">${item.explanation}</p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.classList.add("modal-open");

  modal.querySelector(".modal-close").addEventListener("click", closeModal);

  // Close when clicking the dark backdrop
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", handleEsc);
}

function closeModal() {
  const modal = document.getElementById("apod-modal");
  if (modal) modal.remove();
  document.body.classList.remove("modal-open");
  document.removeEventListener("keydown", handleEsc);
}

function handleEsc(e) {
  if (e.key === "Escape") closeModal();
}
