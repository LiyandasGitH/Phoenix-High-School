(function () {
  "use strict";

  var slider = document.querySelector("[data-hero-slider]");
  if (!slider) return;

  var slides = Array.from(slider.querySelectorAll("[data-slide]"));
  var indicators = Array.from(slider.querySelectorAll("[data-hero-indicator]"));
  var status = slider.querySelector("[data-hero-status]");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var current = 0;
  var transitioning = false;
  var pendingIndex = null;
  var timer = 0;
  var transitionFrame = 0;
  var dueAt = 0;
  var remaining = 6000;
  var pauseReasons = new Set();
  var pointer = {};
  var header = document.querySelector(".home-header");

  if (header) {
    function updateHeaderBackground() {
      header.classList.toggle(
        "is-scrolled",
        slider.getBoundingClientRect().bottom <= header.offsetHeight
      );
    }

    window.addEventListener("scroll", updateHeaderBackground, { passive: true });
    window.addEventListener("resize", updateHeaderBackground);
    updateHeaderBackground();
  }

  function wrapWords() {
    slides.forEach(function (slide) {
      var heading = slide.querySelector(".hero-title");
      if (!heading || heading.dataset.wordsReady) return;
      heading.dataset.wordsReady = "true";
      Array.from(heading.childNodes).forEach(function (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          var fragment = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              fragment.appendChild(document.createTextNode(part));
            } else {
              var word = document.createElement("span");
              word.className = "word";
              word.style.setProperty("--word-index", String(heading.querySelectorAll(".word").length));
              word.textContent = part;
              fragment.appendChild(word);
            }
          });
          node.replaceWith(fragment);
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "EM") {
          var word = document.createElement("span");
          word.className = "word";
          word.style.setProperty("--word-index", String(heading.querySelectorAll(".word").length));
          word.appendChild(node.cloneNode(true));
          node.replaceWith(word);
        }
      });
    });
  }

  function setActiveSlide(index) {
    current = index;
    slider.dataset.currentSlide = String(index);

    slides.forEach(function (slide, i) {
      var active = i === index;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
      slide.inert = !active;
    });

    indicators.forEach(function (indicator, i) {
      var active = i === index;
      indicator.classList.toggle("is-active", active);
      indicator.classList.remove("is-paused");
      indicator.setAttribute("aria-current", active ? "true" : "false");
    });

    var count = slider.querySelector("[data-hero-count]");
    if (count) {
      count.innerHTML = "0" + (index + 1) + " <i>/</i> " +
        String(slides.length).padStart(2, "0");
    }

    if (status) {
      var heading = slides[index].querySelector(".hero-title");
      status.textContent = "Slide " + (index + 1) + " of " + slides.length +
        ": " + (heading ? heading.textContent.trim() : "Phoenix Secondary School");
    }
  }

  function updateProgress() {
    indicators.forEach(function (indicator) {
      indicator.classList.toggle("is-paused", pauseReasons.size > 0);
    });
  }

  function clearAutoplay() {
    window.clearTimeout(timer);
    timer = 0;
  }

  function scheduleAutoplay(delay) {
    clearAutoplay();
    if (reducedMotion.matches || pauseReasons.size || transitioning) return;

    remaining = delay;
    dueAt = performance.now() + delay;
    timer = window.setTimeout(function () {
      beginTransition((current + 1) % slides.length);
    }, delay);
  }

  function pause(reason) {
    if (pauseReasons.has(reason)) return;
    if (!pauseReasons.size && timer) {
      remaining = Math.max(0, dueAt - performance.now());
      clearAutoplay();
    }
    pauseReasons.add(reason);
    updateProgress();
  }

  function resume(reason) {
    if (!pauseReasons.delete(reason)) return;
    updateProgress();
    if (!pauseReasons.size && !transitioning && !reducedMotion.matches) {
      scheduleAutoplay(remaining || 6000);
    }
  }

  function beginTransition(target) {
    if (target === current && !transitioning) return;
    if (transitioning) {
      pendingIndex = target;
      return;
    }

    clearAutoplay();
    transitioning = true;
    pendingIndex = null;
    slider.classList.add("is-transitioning");

    var from = current;
    var duration = reducedMotion.matches ? 1 : 850;
    var startedAt = performance.now();
    var outgoing = false;
    var incoming = false;

    function tick(now) {
      var progress = Math.min(1, (now - startedAt) / duration);

      if (!outgoing && progress >= 0.25) {
        outgoing = true;
        slides[from].classList.add("is-leaving");
        slides[from].setAttribute("aria-hidden", "true");
      }

      if (!incoming && progress >= 0.5) {
        incoming = true;
        setActiveSlide(target);
      }

      if (progress < 1) {
        transitionFrame = window.requestAnimationFrame(tick);
        return;
      }

      if (!incoming) setActiveSlide(target);
      slides.forEach(function (slide) { slide.classList.remove("is-leaving"); });
      slider.classList.remove("is-transitioning");
      transitioning = false;
      remaining = 6000;
      updateProgress();

      if (pendingIndex !== null && pendingIndex !== current) {
        var queued = pendingIndex;
        pendingIndex = null;
        beginTransition(queued);
      } else {
        pendingIndex = null;
        scheduleAutoplay(6000);
      }
    }

    transitionFrame = window.requestAnimationFrame(tick);
  }

  function onReducedMotionChange() {
    clearAutoplay();
    if (reducedMotion.matches) {
      slider.classList.add("is-reduced");
      pauseReasons.add("reduced-motion");
      if (transitioning) {
        window.cancelAnimationFrame(transitionFrame);
        slides.forEach(function (slide) { slide.classList.remove("is-leaving"); });
        setActiveSlide(pendingIndex === null ? current : pendingIndex);
        pendingIndex = null;
        transitioning = false;
        slider.classList.remove("is-transitioning");
      }
    } else {
      slider.classList.remove("is-reduced");
      pauseReasons.delete("reduced-motion");
      if (!pauseReasons.size && !transitioning) scheduleAutoplay(6000);
    }
    updateProgress();
  }

  function bindControls() {
    slider.addEventListener("scroll", function () {
      if (slider.scrollLeft !== 0) slider.scrollLeft = 0;
    }, { passive: true });

    slider.querySelector("[data-hero-prev]").addEventListener("click", function () {
      beginTransition((current + slides.length - 1) % slides.length);
    });
    slider.querySelector("[data-hero-next]").addEventListener("click", function () {
      beginTransition((current + 1) % slides.length);
    });
    indicators.forEach(function (button) {
      button.addEventListener("click", function () {
        beginTransition(Number(button.dataset.heroIndicator));
      });
    });

    slider.addEventListener("keydown", function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        beginTransition((current + 1) % slides.length);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        beginTransition((current + slides.length - 1) % slides.length);
      }
    });

    slider.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" || event.target.closest("button, a")) return;
      pointer.startX = event.clientX;
      pointer.startY = event.clientY;
    });
    slider.addEventListener("pointerup", function (event) {
      if (pointer.startX === undefined) return;
      var deltaX = event.clientX - pointer.startX;
      var deltaY = event.clientY - pointer.startY;
      pointer.startX = undefined;
      if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      beginTransition((current + (deltaX < 0 ? 1 : slides.length - 1)) % slides.length);
    });
    slider.addEventListener("pointercancel", function () {
      pointer.startX = undefined;
    });

    slider.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "mouse" || event.pointerType === "pen") pause("hover");
    });
    slider.addEventListener("pointerleave", function (event) {
      if (event.pointerType === "mouse" || event.pointerType === "pen") resume("hover");
    });
    slider.addEventListener("focusin", function () { pause("focus"); });
    slider.addEventListener("focusout", function (event) {
      if (!slider.contains(event.relatedTarget)) resume("focus");
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause("hidden");
      else resume("hidden");
    });
    reducedMotion.addEventListener("change", onReducedMotionChange);
  }

  wrapWords();
  setActiveSlide(0);
  if (reducedMotion.matches) {
    slider.classList.add("is-reduced");
    pauseReasons.add("reduced-motion");
  }
  bindControls();
  updateProgress();
  if (!reducedMotion.matches) scheduleAutoplay(6000);
})();
