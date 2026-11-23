// REELITY — Working Cinematic Photo-to-Scene Engine

document.addEventListener("DOMContentLoaded", () => {

  // ================================
  // ELEMENTS
  // ================================

  const fileInput = document.getElementById("fileInput");
  const dropZone = document.getElementById("dropZone");
  const chooseBtn = document.getElementById("chooseBtn");

  const uploadEmpty = document.getElementById("uploadEmpty");
  const previewWrap = document.getElementById("previewWrap");
  const preview = document.getElementById("preview");
  const removeBtn = document.getElementById("removeBtn");

  const genres = document.querySelectorAll("#genres button");
  const generateBtn = document.getElementById("generateBtn");

  const studio = document.getElementById("studio");
  const loading = document.getElementById("loading");
  const result = document.getElementById("result");

  const loadingText = document.getElementById("loadingText");
  const progressBar = document.getElementById("bar");

  const movieTitle = document.getElementById("movieTitle");
  const resultGenre = document.getElementById("resultGenre");
  const resultImage = document.getElementById("resultImage");
  const sceneText = document.getElementById("sceneText");

  const againBtn = document.getElementById("againBtn");
  const shareBtn = document.getElementById("shareBtn");


  // ================================
  // STATE
  // ================================

  let selectedFile = null;
  let imageURL = null;
  let selectedGenre = "Action";


  // ================================
  // STORIES
  // ================================

  const stories = {

    Action: {
      title: "ONE LAST RUN",
      text:
        "The city is running out of time. You have one chance to make it across before everything changes. The camera follows as the night explodes into motion.",
      color: "#ff3b30"
    },

    Horror: {
      title: "DON'T LOOK BACK",
      text:
        "The street is completely silent. Too silent. You hear footsteps behind you, but when you turn around... there's nobody there.",
      color: "#8d0000"
    },

    Bollywood: {
      title: "THE LAST SCENE",
      text:
        "A familiar face. A forgotten promise. One unexpected night brings two lives together in a moment that feels straight out of a movie.",
      color: "#ff9f1c"
    },

    Thriller: {
      title: "11:47 PM",
      text:
        "At exactly 11:47 PM, everything stopped. The lights. The traffic. The people. Only you were still moving.",
      color: "#00b8d9"
    },

    Comedy: {
      title: "THIS WAS A BAD IDEA",
      text:
        "It started as a completely normal day. Then one terrible decision turned into another... and somehow you're now running for your life.",
      color: "#ffd60a"
    },

    "Sci-Fi": {
      title: "SIGNAL LOST",
      text:
        "A strange transmission appears on your phone. It contains an image of you... taken tomorrow.",
      color: "#7c3aed"
    }

  };


  // ================================
  // OPEN FILE PICKER
  // ================================

  function openPicker() {
    fileInput.click();
  }

  chooseBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPicker();
  });


  // ================================
  // CLICK UPLOAD AREA
  // ================================

  dropZone.addEventListener("click", (e) => {

    if (
      e.target.closest("#chooseBtn") ||
      e.target.closest("#removeBtn")
    ) {
      return;
    }

    if (!selectedFile) {
      openPicker();
    }

  });


  // ================================
  // FILE SELECT
  // ================================

  fileInput.addEventListener("change", (e) => {

    const file = e.target.files[0];

    if (file) {
      handleFile(file);
    }

  });


  // ================================
  // HANDLE FILE
  // ================================

  function handleFile(file) {

    if (!file.type.startsWith("image/")) {

      alert("Please upload an image file.");

      return;
    }

    if (file.size > 10 * 1024 * 1024) {

      alert("Image must be smaller than 10MB.");

      return;
    }


    selectedFile = file;


    // Remove previous object URL
    if (imageURL) {
      URL.revokeObjectURL(imageURL);
    }


    imageURL = URL.createObjectURL(file);


    // Show preview
    preview.src = imageURL;

    uploadEmpty.classList.add("hidden");

    previewWrap.classList.remove("hidden");


    // Enable button
    generateBtn.disabled = false;

    generateBtn.classList.add("ready");


    // Change upload area
    dropZone.classList.add("has-image");

  }


  // ================================
  // REMOVE IMAGE
  // ================================

  removeBtn.addEventListener("click", (e) => {

    e.preventDefault();
    e.stopPropagation();


    selectedFile = null;


    if (imageURL) {

      URL.revokeObjectURL(imageURL);

      imageURL = null;

    }


    preview.src = "";

    previewWrap.classList.add("hidden");

    uploadEmpty.classList.remove("hidden");


    generateBtn.disabled = true;

    generateBtn.classList.remove("ready");


    dropZone.classList.remove("has-image");


    fileInput.value = "";

  });


  // ================================
  // DRAG OVER
  // ================================

  dropZone.addEventListener("dragover", (e) => {

    e.preventDefault();

    dropZone.classList.add("dragging");

  });


  // ================================
  // DRAG LEAVE
  // ================================

  dropZone.addEventListener("dragleave", () => {

    dropZone.classList.remove("dragging");

  });


  // ================================
  // DROP
  // ================================

  dropZone.addEventListener("drop", (e) => {

    e.preventDefault();

    dropZone.classList.remove("dragging");


    const file = e.dataTransfer.files[0];

    if (file) {

      handleFile(file);

    }

  });


  // ================================
  // GENRE SELECTION
  // ================================

  genres.forEach((button) => {

    button.addEventListener("click", () => {

      genres.forEach((btn) => {
        btn.classList.remove("active");
      });


      button.classList.add("active");


      selectedGenre =
        button.dataset.genre ||
        button.textContent.trim();


    });

  });


  // Make Action selected initially

  const defaultGenre = document.querySelector(
    '#genres button[data-genre="Action"]'
  );

  if (defaultGenre) {
    defaultGenre.classList.add("active");
  }


  // ================================
  // GENERATE
  // ================================

  generateBtn.addEventListener("click", async () => {

    if (!selectedFile) {

      alert("Pehle photo upload kar bhai.");

      return;
    }


    const story =
      stories[selectedGenre] ||
      stories.Action;


    // Hide studio
    studio.classList.add("hidden");


    // Show loading
    loading.classList.remove("hidden");


    progressBar.style.width = "0%";


    const steps = [

      ["Reading the scene...", 18],

      ["Finding the story...", 38],

      ["Directing the shot...", 57],

      ["Adding cinematic atmosphere...", 76],

      ["Final cut...", 94]

    ];


    for (const step of steps) {

      loadingText.textContent = step[0];

      progressBar.style.width =
        step[1] + "%";


      await wait(700);

    }


    progressBar.style.width = "100%";


    await wait(500);


    showResult(story);

  });


  // ================================
  // SHOW RESULT
  // ================================

  function showResult(story) {

    loading.classList.add("hidden");

    result.classList.remove("hidden");


    movieTitle.textContent =
      story.title;


    resultGenre.textContent =
      selectedGenre.toUpperCase();


    sceneText.textContent =
      story.text;


    resultImage.src =
      imageURL;


    document.documentElement.style.setProperty(
      "--genre-color",
      story.color
    );


    result.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }


  // ================================
  // MAKE ANOTHER
  // ================================

  againBtn.addEventListener("click", () => {

    result.classList.add("hidden");

    loading.classList.add("hidden");

    studio.classList.remove("hidden");


    window.scrollTo({
      top: studio.offsetTop - 30,
      behavior: "smooth"
    });

  });


  // ================================
  // SHARE
  // ================================

  shareBtn.addEventListener("click", async () => {

    const story =
      stories[selectedGenre] ||
      stories.Action;


    const text =
      `I just turned my photo into a movie scene with REELITY.\n\n` +
      `"${story.title}" — ${selectedGenre}\n\n` +
      `Your life. One scene at a time.`;


    try {

      if (navigator.share) {

        await navigator.share({

          title: "My REELITY Scene",

          text: text

        });

      } else {

        await navigator.clipboard.writeText(text);

        const oldText =
          shareBtn.textContent;


        shareBtn.textContent =
          "COPIED ✓";


        setTimeout(() => {

          shareBtn.textContent =
            oldText;

        }, 2000);

      }

    } catch (error) {

      console.log("Share cancelled.");

    }

  });


  // ================================
  // SMOOTH LINKS
  // ================================

  document
    .querySelectorAll('a[href^="#"]')
    .forEach((link) => {

      link.addEventListener("click", (e) => {

        const target =
          document.querySelector(
            link.getAttribute("href")
          );


        if (!target) return;


        e.preventDefault();


        target.scrollIntoView({
          behavior: "smooth"
        });

      });

    });


  // ================================
  // HELPER
  // ================================

  function wait(ms) {

    return new Promise((resolve) => {

      setTimeout(resolve, ms);

    });

  }


  // ================================
  // KEYBOARD SHORTCUT
  // ================================

  document.addEventListener("keydown", (e) => {

    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "u"
    ) {

      e.preventDefault();

      openPicker();

    }

  });


  console.log(
    "REELITY Cinema Engine — READY"
  );

});
