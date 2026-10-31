const SUPABASE_URL = "https://shgitavnpjxldlkyuvqz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_bM7-tKDOLfeDG5z-SyY6Sg_da4g2I0I";
if (!window.supabase) {
  console.error(
    "Supabase library did not load. Check the CDN script in index.html."
  );
  alert(
    "Nocturne could not load Supabase. Check your internet connection and refresh."
  );
  throw new Error("Supabase library is unavailable");
}
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
const gallery = document.querySelector("#art-gallery");
const artCount = document.querySelector("#art-count");
const terminalForm = document.querySelector("#terminal-form");
const terminalInput = document.querySelector("#terminal-input");
const terminalOutput = document.querySelector("#terminal-output");
const loginForm = document.querySelector("#owner-login-form");
const loginMessage = document.querySelector("#login-message");
const uploadPanel = document.querySelector("#owner-upload-panel");
const uploadForm = document.querySelector("#upload-form");
const uploadMessage = document.querySelector("#upload-message");
const logoutButton = document.querySelector("#owner-logout");
const navOwnerLogin = document.querySelector("#nav-owner-login");
const ownerModal = document.querySelector("#upload-window");
const closeOwnerWindow = document.querySelector("#close-owner-window");
const navAddArt = document.querySelector("#nav-add-art");
let currentSession = null;
async function wireLikeButton(button, artworkId, likeCount) {
  button.disabled = true;
  try {
    const stats = await getNocturneStats(artworkId);
    button.textContent = stats.liked ? "♥" : "♡";
    button.classList.toggle("liked", Boolean(stats.liked));
    button.setAttribute("aria-pressed", String(Boolean(stats.liked)));
    likeCount.textContent = String(stats.likes ?? 0);
    button.addEventListener("click", async () => {
      if (button.disabled || button.classList.contains("liked")) return;
      button.disabled = true;
      try {
        const result = await likeNocturneArtwork(artworkId);
        button.textContent = result.liked ? "♥" : "♡";
        button.classList.toggle("liked", Boolean(result.liked));
        button.setAttribute("aria-pressed", String(Boolean(result.liked)));
        likeCount.textContent = String(result.likes ?? 0);
      } catch (error) {
        console.error("Could not save like:", error);
      } finally {
        button.disabled = false;
      }
    });
  } catch (error) {
    console.error("Could not load artwork stats:", error);
    likeCount.textContent = "—";
  } finally {
    button.disabled = false;
  }
}
function printTerminalLine(text, type = "output") {
  if (!terminalOutput) return;
  const line = document.createElement("p");
  line.className = `output ${type}`;
  line.textContent = text;
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}
const terminalCommands = {
  help() {
    printTerminalLine("AVAILABLE COMMANDS:");
    printTerminalLine("help    - Show available commands");
    printTerminalLine("gallery - Open the art gallery");
    printTerminalLine("about   - Learn about Nocturne");
    printTerminalLine("upload  - Open the owner panel");
    printTerminalLine("date    - Show today's date");
    printTerminalLine("whoami  - Identify the visitor");
    printTerminalLine("clear   - Clear the terminal");
  },
  gallery() {
    window.location.href = "./gallery.html";
  },
  about() {
    window.location.href = "./about.html";
  },
  upload() {
    window.location.href = "./index.html#owner-panel";
  },
  date() {
    printTerminalLine(new Date().toLocaleDateString());
  },
  whoami() {
    printTerminalLine("You are visiting the Nocturne archive.");
  },
  clear() {
    if (terminalOutput) terminalOutput.replaceChildren();
  }
};
terminalForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const command = terminalInput.value.trim().toLowerCase();
  if (!command) return;
  printTerminalLine(`visitor@nocturne:~$ ${command}`);
  if (Object.prototype.hasOwnProperty.call(terminalCommands, command)) {
    terminalCommands[command]();
  } else {
    printTerminalLine(
      `Command not found: ${command}. Type "help" to see commands.`,
      "error"
    );
  }
  terminalInput.value = "";
  terminalInput.focus();
});
function showOwnerSession(session) {
  currentSession = session;
  const signedIn = Boolean(session);
  const loginArea = document.querySelector("#owner-login-area");
  if (loginArea) loginArea.hidden = signedIn;
  if (loginForm) loginForm.hidden = signedIn;
  if (uploadPanel) uploadPanel.hidden = !signedIn;
  if (navOwnerLogin) {
    navOwnerLogin.textContent = signedIn ? "Owner Panel" : "Owner Panel";
  }
  document.querySelectorAll(".delete-art-button").forEach((button) => {
    button.hidden = !signedIn;
  });
}
function openOwnerWindow() {
  if (!ownerModal) return;
  ownerModal.hidden = false;
  document.body.classList.add("owner-modal-open");
  const firstField = currentSession
    ? document.querySelector("#art-title")
    : document.querySelector("#owner-email");
  firstField?.focus();
}
function closeOwnerWindowHandler() {
  if (!ownerModal) return;
  ownerModal.hidden = true;
  document.body.classList.remove("owner-modal-open");
}
navOwnerLogin?.addEventListener("click", (event) => {
  event.preventDefault();
  openOwnerWindow();
});
navAddArt?.addEventListener("click", () => {
  openOwnerWindow();
});
closeOwnerWindow?.addEventListener("click", closeOwnerWindowHandler);
document.querySelector("#owner-modal-backdrop")?.addEventListener(
  "click",
  closeOwnerWindowHandler
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && ownerModal && !ownerModal.hidden) {
    closeOwnerWindowHandler();
  }
});
async function restoreOwnerSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error("Session error:", error);
    if (loginMessage) {
      loginMessage.textContent = "Could not check the login session.";
    }
    return;
  }
  showOwnerSession(data.session);
}
loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "Signing in...";
  try {
    const email = document
      .querySelector("#owner-email")
      .value.trim();
    const password = document
      .querySelector("#owner-password")
      .value;
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
    if (error) throw error;
    showOwnerSession(data.session);
    loginMessage.textContent = "Signed in successfully!";
    await loadUploadedArtworks();
  } catch (error) {
    console.error("Nocturne sign-in error:", error);
    loginMessage.textContent =
      error.message || "Sign-in failed.";
  }
});
logoutButton?.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    if (uploadMessage) {
      uploadMessage.textContent =
        "Could not sign out. Please try again.";
    }
    console.error("Sign-out error:", error);
    return;
  }
  if (uploadMessage) uploadMessage.textContent = "";
  showOwnerSession(null);
});
function makeArtworkCard(artwork) {
  const card = document.createElement("article");
  card.className = "art-card";
  card.dataset.artworkId = artwork.id;
  card.dataset.category = artwork.category || "other";
  const image = document.createElement("img");
  image.src = artwork.image_url;
  image.alt = artwork.title || "Artwork";
  image.loading = "lazy";
  image.classList.add("artwork-preview-trigger");
  image.style.cursor = "zoom-in";
  const viewCount = document.createElement("span");
  viewCount.className = "art-view-count";
  viewCount.textContent = "◉ Loading views...";
  viewCount.setAttribute("aria-label", "Artwork views");
  async function updateViewCount() {
    try {
      const result = await recordNocturneView(artwork.id);
      viewCount.textContent = `◉ ${result.views}`;
    } catch (error) {
      console.error("Could not record artwork view:", error);
      viewCount.textContent = "◉ —";
    }
  }
  image.addEventListener("load", updateViewCount, { once: true });
  if (image.complete && image.naturalWidth > 0) {
    updateViewCount();
  }
  const info = document.createElement("div");
  info.className = "art-info";
  const details = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = artwork.title || "Untitled";
  const category = document.createElement("p");
  const categories = {
    digital: "Digital art",
    traditional: "Traditional art",
    sketch: "Sketch"
  };
  category.textContent =
    categories[artwork.category] ||
    artwork.category ||
    "Artwork";
  details.append(title, category);
  const description = document.createElement("p");
  description.className = "art-description";
  description.textContent =
    artwork.description || "No description yet.";
  const downloadButton = document.createElement("button");
  downloadButton.className = "download-art-button";
  downloadButton.type = "button";
  downloadButton.textContent = "↓ DOWNLOAD";
  downloadButton.setAttribute(
    "aria-label",
    `Download ${artwork.title || "artwork"}`
  );
  downloadButton.addEventListener("click", async () => {
    const originalText = downloadButton.textContent;
    downloadButton.disabled = true;
    downloadButton.textContent = "PREPARING...";
    try {
      const response = await fetch(artwork.image_url);
      if (!response.ok) {
        throw new Error("Image download failed.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeTitle = (artwork.title || "nocturne-artwork")
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 70) || "nocturne-artwork";
      const extensionByType = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/avif": "avif"
      };
      const extension =
        extensionByType[blob.type.split(";")[0].toLowerCase()] || "png";
      link.href = objectUrl;
      link.download = `${safeTitle}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      downloadButton.textContent = "✓ DOWNLOADED";
    } catch (error) {
      console.error("Nocturne download error:", error);
      downloadButton.textContent = "OPEN IMAGE ↗";
      const link = document.createElement("a");
      link.href = artwork.image_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    } finally {
      downloadButton.disabled = false;
      setTimeout(() => {
        downloadButton.textContent = originalText;
      }, 1800);
    }
  });
  const like = document.createElement("button");
like.className = "like-button";
like.type = "button";
like.setAttribute(
  "aria-label",
  `Like ${artwork.title || "artwork"}`
);
like.setAttribute("aria-pressed", "false");
like.textContent = "♡";
const likeWrapper = document.createElement("div");
likeWrapper.className = "art-like-wrapper";
const likeCount = document.createElement("span");
likeCount.className = "art-like-count";
likeCount.textContent = "…";
likeCount.setAttribute("aria-label", "Artwork likes");
likeWrapper.append(like, likeCount);
wireLikeButton(like, artwork.id, likeCount);
const ownerControls = document.createElement("div");
ownerControls.className = "art-owner-controls";
const editDescriptionButton = document.createElement("button");
editDescriptionButton.className = "owner-icon-button edit-description-button";
editDescriptionButton.type = "button";
editDescriptionButton.textContent = "✎";
editDescriptionButton.title = "Edit description";
editDescriptionButton.setAttribute("aria-label", "Edit artwork description");
editDescriptionButton.hidden = !currentSession;
editDescriptionButton.addEventListener("click", (event) => {
  event.stopPropagation();
  editArtworkDescription(artwork, description, editDescriptionButton);
});
const deleteButton = document.createElement("button");
deleteButton.className = "owner-icon-button delete-art-button";
deleteButton.type = "button";
deleteButton.textContent = "×";
deleteButton.title = "Delete drawing";
deleteButton.setAttribute("aria-label", "Delete artwork");
deleteButton.hidden = !currentSession;
deleteButton.addEventListener("click", (event) => {
  event.stopPropagation();
  deleteArtwork(artwork, card, deleteButton);
});
ownerControls.append(editDescriptionButton, deleteButton);
  info.append(details, likeWrapper);
  card.append(
  image,
  ownerControls,
  info,
  description,
  viewCount,
  downloadButton
);
  return card; 
}
function getNocturneVisitorId() {
  const cookieName = "nocturne_visitor";
  const existing = document.cookie
    .split("; ")
    .find((item) => item.startsWith(cookieName + "="));
  if (existing) {
    return decodeURIComponent(existing.split("=").slice(1).join("="));
  }
  const visitorId = crypto.randomUUID() + crypto.randomUUID();
  document.cookie =
    `${cookieName}=${encodeURIComponent(visitorId)}; ` +
    "max-age=31536000; path=/; SameSite=Lax" +
    (location.protocol === "https:" ? "; Secure" : "");
  return visitorId;
}
async function getNocturneStats(artworkId) {
  const { data, error } = await supabaseClient.rpc(
    "get_artwork_stats",
    {
      p_artwork_id: artworkId,
      p_visitor_id: getNocturneVisitorId()
    }
  );
  if (error) throw error;
  return data;
}
async function recordNocturneView(artworkId) {
  const { data, error } = await supabaseClient.rpc(
    "record_artwork_view",
    {
      p_artwork_id: artworkId,
      p_visitor_id: getNocturneVisitorId()
    }
  );
  if (error) throw error;
  return data;
}
async function likeNocturneArtwork(artworkId) {
  const { data, error } = await supabaseClient.rpc(
    "like_artwork",
    {
      p_artwork_id: artworkId,
      p_visitor_id: getNocturneVisitorId()
    }
  );
  if (error) throw error;
  return data;
}
async function loadUploadedArtworks() {
  if (!gallery) return;
  try {
    const { data, error } = await supabaseClient
      .from("artworks")
      .select("id, title, category, image_url, description, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    gallery.querySelectorAll("[data-artwork-id]").forEach((card) => {
      card.remove();
    });
    const isHomePage =
  window.location.pathname.endsWith("/index.html") ||
  window.location.pathname.endsWith("/");
const artworksToDisplay = isHomePage
  ? (data || []).slice(0, 5)
  : (data || []);
for (const artwork of [...artworksToDisplay].reverse()) {
  gallery.prepend(makeArtworkCard(artwork));
}
const recentCount = document.querySelector("#recent-art-count");
if (recentCount && isHomePage) {
  recentCount.textContent =
    `${artworksToDisplay.length} LATEST ARTWORKS`;
}
    if (artCount) {
      const count = gallery.querySelectorAll(".art-card").length;
      artCount.textContent =
        `${count} artwork${count === 1 ? "" : "s"}`;
    }
  } catch (error) {
    console.error("Nocturne gallery loading error:", error);
    if (gallery) {
      const message = document.createElement("p");
      message.className = "gallery-error";
      message.textContent =
        `Could not load artworks: ${error.message || "Unknown error"}`;
      gallery.append(message);
    }
  }
}
async function deleteArtwork(artwork, card, button) {
  if (!currentSession) {
    alert("Please sign in as the owner to delete artwork.");
    return;
  }
  const confirmed = window.confirm(
    `Delete "${artwork.title}" permanently? This cannot be undone.`
  );
  if (!confirmed) return;
  button.disabled = true;
  button.textContent = "…";
  try {
    const { error: databaseError } = await supabaseClient
      .from("artworks")
      .delete()
      .eq("id", artwork.id);
    if (databaseError) throw databaseError;
    let storageWarning = "";
    try {
      const imageUrl = new URL(artwork.image_url);
      const marker = "/storage/v1/object/public/artworks/";
      const markerIndex = imageUrl.pathname.indexOf(marker);
      if (markerIndex !== -1) {
        const path = decodeURIComponent(
          imageUrl.pathname.slice(markerIndex + marker.length)
        );
        const { error: storageError } = await supabaseClient
          .storage
          .from("artworks")
          .remove([path]);
        if (storageError) throw storageError;
      }
    } catch (storageError) {
      console.error(
        "Database record deleted, but image cleanup failed:",
        storageError
      );
      storageWarning =
        " The database record was deleted, but the stored image may need manual cleanup.";
    }
    card.remove();
    if (artCount) {
      const count = gallery.querySelectorAll(".art-card").length;
      artCount.textContent =
        `${count} artwork${count === 1 ? "" : "s"}`;
    }
    if (uploadMessage) {
      uploadMessage.textContent =
        `Artwork deleted.${storageWarning}`;
    }
  } catch (error) {
    console.error("Nocturne delete error:", error);
    if (uploadMessage) {
      uploadMessage.textContent =
        error.message ||
        "Could not delete this artwork. Check your database DELETE policy.";
    }
    button.disabled = false;
    button.textContent = "×";
  }
}
async function editArtworkDescription(artwork, descriptionElement, button) {
  if (!currentSession) {
    alert("Please sign in as the owner to edit artwork.");
    return;
  }
  const newDescription = window.prompt(
    "Edit artwork description:",
    artwork.description || ""
  );
  if (newDescription === null) return;
  const updatedDescription = newDescription.trim();
  button.disabled = true;
  button.textContent = "…";
  try {
    const { data, error } = await supabaseClient
      .from("artworks")
      .update({ description: updatedDescription })
      .eq("id", artwork.id)
      .select("id, description")
      .single();
    if (error) throw error;
    artwork.description = data.description || "";
    descriptionElement.textContent =
      artwork.description || "No description yet.";
    if (uploadMessage) {
      uploadMessage.textContent =
        "Artwork description saved successfully.";
    }
  } catch (error) {
    console.error("Nocturne description update error:", error);
    if (uploadMessage) {
      uploadMessage.textContent =
        error.message || "Could not save the description.";
    } else {
      alert(error.message || "Could not save the description.");
    }
  } finally {
    button.disabled = false;
    button.textContent = "✎";
  }
}
uploadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = document.querySelector("#upload-submit");
  const title = document.querySelector("#art-title").value.trim();
  const description = document
    .querySelector("#art-description")
    .value.trim();
  const category = document.querySelector("#art-category").value;
  const file = document.querySelector("#art-file").files[0];
  if (!title || !file) {
    uploadMessage.textContent =
      "Enter a title and choose an image.";
    return;
  }
  if (!file.type.startsWith("image/")) {
    uploadMessage.textContent =
      "Please choose an image file.";
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    uploadMessage.textContent =
      "Images must be 10 MB or smaller.";
    return;
  }
  submitButton.disabled = true;
  uploadMessage.textContent = "Uploading to the archive...";
  let uploadedFilePath = null;
  try {
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) {
      throw new Error(
        "Please sign in again before uploading."
      );
    }
    const extension = file.name.split(".").pop().toLowerCase();
    const safeExtension = /^[a-z0-9]+$/.test(extension)
      ? extension
      : "img";
    const filePath = `${crypto.randomUUID()}.${safeExtension}`;
    const { error: storageError } = await supabaseClient
      .storage
      .from("artworks")
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type
      });
    if (storageError) throw storageError;
    uploadedFilePath = filePath;
    const { data: urlData } = supabaseClient
      .storage
      .from("artworks")
      .getPublicUrl(filePath);
    const { error: databaseError } = await supabaseClient
      .from("artworks")
      .insert({
        title,
        category,
        description,
        image_url: urlData.publicUrl
      });
    if (databaseError) throw databaseError;
    uploadMessage.textContent =
      "Artwork uploaded successfully!";
    uploadForm.reset();
    await loadUploadedArtworks();
  } catch (error) {
    console.error("Nocturne upload error:", error);
    if (uploadedFilePath) {
      const { error: cleanupError } = await supabaseClient
        .storage
        .from("artworks")
        .remove([uploadedFilePath]);
      if (cleanupError) {
        console.error(
          "Could not clean up failed upload:",
          cleanupError
        );
      }
    }
    uploadMessage.textContent =
      error.message ||
      "Upload failed. Check your Supabase policies and table columns.";
  } finally {
    submitButton.disabled = false;
  }
});
supabaseClient.auth.onAuthStateChange((_event, session) => {
  showOwnerSession(session);
});
loadUploadedArtworks();
restoreOwnerSession();
const artFileInput = document.querySelector("#art-file");
const fileUploadName = document.querySelector("#file-upload-name");
artFileInput?.addEventListener("change", () => {
  const file = artFileInput.files?.[0];
  if (fileUploadName) {
    fileUploadName.textContent = file
      ? file.name
      : "PNG, JPG, WEBP · Select an image";
  }
});
(() => {
  const gallery = document.querySelector("#art-gallery");
  const searchInput = document.querySelector("#gallery-search");
  const filterButtons = document.querySelectorAll(".filter-button");
  if (!gallery) return;
  let activeCategory = "all";
  let searchTerm = "";
  function filterArtworks() {
    const cards = gallery.querySelectorAll(".art-card");
    cards.forEach((card) => {
      const title = card.querySelector("h3")?.textContent || "";
      const description =
        card.querySelector(".art-description")?.textContent || "";
      const category =
        card.dataset.category ||
        card.querySelector(".art-info > div > p")?.textContent ||
        "";
      const matchesSearch =
        `${title} ${description}`.toLowerCase().includes(searchTerm);
      const matchesCategory =
        activeCategory === "all" ||
        category.toLowerCase().includes(activeCategory);
      card.hidden = !(matchesSearch && matchesCategory);
    });
  }
  searchInput?.addEventListener("input", () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    filterArtworks();
  });
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category || "all";
      filterButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      filterArtworks();
    });
  });
  const observer = new MutationObserver(() => filterArtworks());
  observer.observe(gallery, { childList: true });
  filterArtworks();
})();
function createArtworkPreview() {
  if (document.querySelector("#artwork-preview")) return;
  const overlay = document.createElement("div");
  overlay.id = "artwork-preview";
  overlay.className = "artwork-preview-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div
      class="artwork-preview-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <button
        class="artwork-preview-close"
        type="button"
        aria-label="Close artwork preview"
      >×</button>
      <div class="artwork-preview-image-area">
        <img class="artwork-preview-image" alt="">
      </div>
      <div class="artwork-preview-details">
        <p class="preview-eyebrow">NOCTURNE://ARTWORK_VIEWER</p>
        <h2 id="preview-title"></h2>
        <p class="preview-category"></p>
        <p class="preview-description"></p>
        <div class="preview-stats"></div>
      </div>
    </div>
  `;
  document.body.append(overlay);
  const closeButton = overlay.querySelector(".artwork-preview-close");
  function closePreview() {
    overlay.hidden = true;
    document.body.classList.remove("preview-open");
  }
  closeButton.addEventListener("click", closePreview);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closePreview();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) {
      closePreview();
    }
  });
  document.addEventListener("click", (event) => {
    const image = event.target.closest(".artwork-preview-trigger");
    if (!image) return;
    const card = image.closest(".art-card");
    if (!card) return;
    const previewImage = overlay.querySelector(".artwork-preview-image");
    const title = card.querySelector(".art-info h3");
    const category = card.querySelector(".art-info p");
    const description = card.querySelector(".art-description");
    const views = card.querySelector(".art-view-count");
    const likes = card.querySelector(".art-like-count");
    previewImage.src = image.currentSrc || image.src;
    previewImage.alt = image.alt;
    overlay.querySelector("#preview-title").textContent =
      title?.textContent || "Untitled";
    overlay.querySelector(".preview-category").textContent =
      category?.textContent || "Artwork";
    overlay.querySelector(".preview-description").textContent =
      description?.textContent || "No description yet.";
    const stats = overlay.querySelector(".preview-stats");
    stats.replaceChildren();
    if (views) {
      const viewText = document.createElement("span");
      viewText.textContent = views.textContent;
      viewText.setAttribute("aria-label", "Artwork views");
      stats.append(viewText);
    }
    if (likes) {
      const likeText = document.createElement("span");
      likeText.textContent = `♡ ${likes.textContent}`;
      likeText.setAttribute("aria-label", "Artwork likes");
      stats.append(likeText);
    }
    overlay.hidden = false;
    document.body.classList.add("preview-open");
    closeButton.focus();
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", createArtworkPreview, {
    once: true
  });
} else {
  createArtworkPreview();
}
(() => {
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const homeHero = document.querySelector(".hero-terminal-layout");
  if (!homeHero) return;
  const particleLayer = homeHero.querySelector(".nocturne-particles");
  if (particleLayer && !reducedMotion) {
    const particleCount = 12;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("span");
      particle.className = "nocturne-particle";
      particle.style.left = `${5 + Math.random() * 90}%`;
      particle.style.animationDelay = `${Math.random() * -9}s`;
      particle.style.animationDuration = `${8 + Math.random() * 4}s`;
      fragment.appendChild(particle);
    }
    particleLayer.appendChild(fragment);
  }
  const artworkGrid = document.querySelector(
    ".recent-artworks-grid"
  );
  if (!artworkGrid) return;
  const artworkCards = artworkGrid.querySelectorAll(".art-card");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    artworkCards.forEach((card) => {
      card.classList.remove("art-reveal-pending");
      card.classList.add("art-revealed");
    });
    return;
  }
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        card.classList.remove("art-reveal-pending");
        card.classList.add("art-revealed");
        observer.unobserve(card);
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -30px 0px"
    }
  );
  function observeArtworkCards() {
    artworkGrid.querySelectorAll(".art-card").forEach((card) => {
      if (card.classList.contains("art-revealed")) return;
      if (card.dataset.revealObserved === "true") return;
      card.dataset.revealObserved = "true";
      card.classList.add("art-reveal-pending");
      revealObserver.observe(card);
    });
  }
  observeArtworkCards();
  const artworkMutationObserver = new MutationObserver(() => {
    observeArtworkCards();
  });
  artworkMutationObserver.observe(artworkGrid, {
    childList: true
  });
})();
(() => {
  const page = document.querySelector(".nocturne-about-page");
  if (!page || page.dataset.aboutInitialized === "true") return;
  page.dataset.aboutInitialized = "true";
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const revealItems = page.querySelectorAll(".about-reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach(item => {
      item.classList.remove("about-reveal-pending");
      item.classList.add("about-revealed");
    });
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove("about-reveal-pending");
        entry.target.classList.add("about-revealed");
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.08,
      rootMargin: "0px 0px -24px 0px"
    });
    revealItems.forEach(item => {
      item.classList.add("about-reveal-pending");
      revealObserver.observe(item);
    });
  }
  const form = page.querySelector("#about-terminal-form");
  const input = page.querySelector("#about-terminal-input");
  const output = page.querySelector("#about-terminal-output");
  if (!form || !input || !output) return;
  const commands = {
    help: [
      "AVAILABLE COMMANDS",
      "help     — show this list",
      "whoami   — artist profile",
      "archive  — open the gallery",
      "sigil    — inspect the Nocturne symbol",
      "clear    — clear terminal output"
    ],
    whoami: [
      "IDENTITY: Alee0x64",
      "ROLE: ARTIST / ARCHIVE KEEPER",
      "PERSONAL DATA: PRIVATE",
      "STATUS: STILL CREATING"
    ],
    sigil: [
      "SYMBOL: N",
      "DESIGNATION: THE UNKNOWN",
      "MEANING: LEFT OPEN TO INTERPRETATION"
    ],
    archive: [
      "ARCHIVE CONNECTION READY.",
      "Opening the public gallery..."
    ]
  };
  function addTerminalLine(text, className = "") {
    const line = document.createElement("p");
    if (className) line.className = className;
    line.textContent = text;
    output.appendChild(line);
  }
  form.addEventListener("submit", event => {
    event.preventDefault();
    const command = input.value.trim().toLowerCase();
    if (!command) return;
    addTerminalLine(`visitor@nocturne:~$ ${command}`);
    if (command === "clear") {
      output.replaceChildren();
      input.value = "";
      input.focus();
      return;
    }
    const response = commands[command];
    if (!response) {
      addTerminalLine(
        `Command not found: ${command}. Type "help" for commands.`,
        "about-term-muted"
      );
    } else {
      response.forEach((line, index) => {
        addTerminalLine(
          line,
          index === 0 ? "about-term-muted" : ""
        );
      });
      if (command === "archive") {
        const link = document.createElement("a");
        link.href = "./gallery.html";
        link.textContent = "[ OPEN GALLERY ]";
        link.style.color = "#ff466c";
        link.style.display = "inline-block";
        link.style.marginTop = "6px";
        output.appendChild(link);
      }
    }
    output.scrollTop = output.scrollHeight;
    input.value = "";
  });
})();
