// REELITY — Cinematic Photo-to-Scene MVP

const state = {
  file: null,
  imageURL: null,
  genre: "Action"
};

const uploadZone = document.getElementById("uploadZone");
const fileInput = document.getElementById("fileInput");
const previewImage = document.getElementById("previewImage");
const uploadPlaceholder = document.getElementById("uploadPlaceholder");
const removeImage = document.getElementById("removeImage");
const genreButtons = document.querySelectorAll(".genre");
const generateBtn = document.getElementById("generateBtn");

const studioSection = document.getElementById("studio");
const loadingSection = document.getElementById("loading");
const resultSection = document.getElementById("result");

const progressBar = document.getElementById("progressBar");
const loadingText = document.getElementById("loadingText");

const resultImage = document.getElementById("resultImage");
const resultGenre = document.getElementById("resultGenre");
const resultTitle = document.getElementById("resultTitle");
const resultDescription = document.getElementById("resultDescription");

const stories = {
  Action: {
    title: "ONE LAST RUN",
    description:
      "The city is running out of time. You have one chance to make it across before everything changes. The camera follows as the night explodes into motion.",
    color: "#ff3b30"
  },

  Horror: {
    title: "DON'T LOOK BACK",
    description:
      "The street is completely silent. Too silent. You hear footsteps behind you, but when you turn around... there's nobody there.",
    color: "#8d0000"
  },

  Bollywood: {
    title: "THE LAST SCENE",
    description:
      "A familiar face. A forgotten promise. One unexpected night brings two lives together in a moment that feels straight out of a movie.",
    color: "#ff9f1c"
  },

  Thriller: {
    title: "11:47 PM",
    description:
      "At exactly 11:47 PM, everything stopped. The lights. The traffic. The people. Only you were still moving.",
    color: "#00b8d9"
  },

  Comedy: {
    title: "THIS WAS A BAD IDEA",
    description:
      "It started as a completely normal day. Then one terrible decision turned into another... and somehow you're now running for your life.",
    color: "#ffd60a"
  },

  "Sci-Fi": {
    title: "SIGNAL LOST",
    description:
      "A strange transmission appears on your phone. It contains an image of you... taken tomorrow.",
    color: "#7c3aed"
  }
};


// --------------------------------------------------
// UPLOAD
// --------------------------------------------------

function openFilePicker() {
  fileInput.click();
}

uploadZone.addEventListener("click", function (event) {
  if (
    event.target.closest("#removeImage") ||
    event.target.closest("button")
  ) {
    return;
  }

  openFilePicker();
});

fileInput.addEventListener("change", function (event) {
  const file = event.target.files[0];

  if (file) {
    handleFile(file);
  }
});


// Drag & Drop

uploadZone.addEventListener("dragover", function (event) {
  event.preventDefault();
  uploadZone.classList.add("dragging");
});

uploadZone.addEventListener("dragleave", function () {
  uploadZone.classList.remove("dragging");
});

uploadZone.addEventListener("drop", function (event) {
  event.preventDefault();

  uploadZone.classList.remove("dragging");

  const file = event.dataTransfer.files[0];

  if (file) {
    handleFile(file);
  }
});


// Handle uploaded image

function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    alert("Bhai, sirf image upload kar 😭");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("Image 10MB se chhoti honi chahiye.");
    return;
  }

  state.file = file;

  if (state.imageURL) {
    URL.revokeObjectURL(state.imageURL);
  }

  state.imageURL = URL.createObjectURL(file);

  previewImage.src = state.imageURL;

  previewImage.style.display = "block";
  uploadPlaceholder.style.display = "none";

  if (removeImage) {
    removeImage.style.display = "flex";
  }

  uploadZone.classList.add("has-image");

  updateGenerateButton();
}


// Remove image

if (removeImage) {
  removeImage.addEventListener("click", function (event) {
    event.stopPropagation();

    state.file = null;

    if (state.imageURL) {
      URL.revokeObjectURL(state.imageURL);
      state.imageURL = null;
    }

    previewImage.src = "";
    previewImage.style.display = "none";

    uploadPlaceholder.style.display = "flex";

    removeImage.style.display = "none";

    uploadZone.classList.remove("has-image");

    fileInput.value = "";

    updateGenerateButton();
  });
}


// --------------------------------------------------
// GENRE
// --------------------------------------------------

genreButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    genreButtons.forEach(function (btn) {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    state.genre =
      button.dataset.genre ||
      button.textContent.trim();

    updateGenerateButton();
  });
});


// --------------------------------------------------
// GENERATE BUTTON
// --------------------------------------------------

function updateGenerateButton() {
  if (!generateBtn) return;

  if (state.file) {
    generateBtn.disabled = false;
    generateBtn.classList.add("ready");
  } else {
    generateBtn.disabled = true;
    generateBtn.classList.remove("ready");
  }
}

updateGenerateButton();


// --------------------------------------------------
// GENERATE SCENE
// --------------------------------------------------

if (generateBtn) {
  generateBtn.addEventListener("click", generateScene);
}

async function generateScene() {
  if (!state.file) {
    alert("Pehle ek photo upload kar bhai.");
    return;
  }

  const story = stories[state.genre] || stories.Action;

  // Hide studio
  studioSection.style.display = "none";

  // Show loading
  loadingSection.style.display = "block";

  // Reset progress
  if (progressBar) {
    progressBar.style.width = "0%";
  }

  const loadingSteps = [
    {
      text: "Reading the scene...",
      progress: 18
    },
    {
      text: "Finding the story...",
      progress: 38
    },
    {
      text: "Directing the shot...",
      progress: 57
    },
    {
      text: "Adding cinematic atmosphere...",
      progress: 76
    },
    {
      text: "Final cut...",
      progress: 94
    }
  ];

  for (const step of loadingSteps) {
    if (loadingText) {
      loadingText.textContent = step.text;
    }

    if (progressBar) {
      progressBar.style.width = step.progress + "%";
    }

    await wait(700);
  }

  if (progressBar) {
    progressBar.style.width = "100%";
  }

  await wait(500);

  showResult(story);
}


// --------------------------------------------------
// SHOW RESULT
// --------------------------------------------------

function showResult(story) {
  loadingSection.style.display = "none";
  resultSection.style.display = "block";

  if (resultImage) {
    resultImage.src = state.imageURL;
  }

  if (resultGenre) {
    resultGenre.textContent = state.genre.toUpperCase();
  }

  if (resultTitle) {
    resultTitle.textContent = story.title;
  }

  if (resultDescription) {
    resultDescription.textContent = story.description;
  }

  // Apply genre accent
  document.documentElement.style.setProperty(
    "--genre-color",
    story.color
  );

  window.scrollTo({
    top: resultSection.offsetTop - 40,
    behavior: "smooth"
  });
}


// --------------------------------------------------
// MAKE ANOTHER
// --------------------------------------------------

const makeAnotherBtn = document.getElementById("makeAnother");

if (makeAnotherBtn) {
  makeAnotherBtn.addEventListener("click", function () {
    resultSection.style.display = "none";
    loadingSection.style.display = "none";
    studioSection.style.display = "block";

    window.scrollTo({
      top: studioSection.offsetTop - 40,
      behavior: "smooth"
    });
  });
}


// --------------------------------------------------
// SHARE
// --------------------------------------------------

const shareBtn = document.getElementById("shareScene");

if (shareBtn) {
  shareBtn.addEventListener("click", async function () {
    const story = stories[state.genre] || stories.Action;

    const shareText =
      "I just turned my photo into a movie scene with REELITY.\n\n" +
      `"${story.title}" — ${state.genre}\n\n` +
      "Your life. One scene at a time.";

    try {
      if (navigator.share) {
        await navigator.share({
          title: "My REELITY Scene",
          text: shareText
        });
      } else {
        await navigator.clipboard.writeText(shareText);

        shareBtn.textContent = "COPIED ✓";

        setTimeout(function () {
          shareBtn.textContent = "SHARE SCENE";
        }, 2000);
      }
    } catch (error) {
      console.log("Share cancelled.");
    }
  });
}


// --------------------------------------------------
// SMOOTH SCROLL
// --------------------------------------------------

document.querySelectorAll('a[href^="#"]').forEach(function (link) {
  link.addEventListener("click", function (event) {
    const target = document.querySelector(
      link.getAttribute("href")
    );

    if (!target) return;

    event.preventDefault();

    target.scrollIntoView({
      behavior: "smooth"
    });
  });
});


// --------------------------------------------------
// HELPER
// --------------------------------------------------

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}


// --------------------------------------------------
// IMAGE ERROR HANDLING
// --------------------------------------------------

if (previewImage) {
  previewImage.addEventListener("error", function () {
    previewImage.style.display = "none";
    uploadPlaceholder.style.display = "flex";

    alert("Image load nahi ho payi. Dusri image try kar.");
  });
}


// --------------------------------------------------
// KEYBOARD SHORTCUT
// --------------------------------------------------

document.addEventListener("keydown", function (event) {
  // Ctrl/Cmd + U → upload
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "u"
  ) {
    event.preventDefault();
    openFilePicker();
  }

  // Enter → generate
  if (
    event.key === "Enter" &&
    state.file &&
    document.activeElement !== fileInput
  ) {
    if (
      studioSection &&
      studioSection.style.display !== "none"
    ) {
      generateScene();
    }
  }
});

console.log("REELITY Cinema Engine loaded 🎬");
