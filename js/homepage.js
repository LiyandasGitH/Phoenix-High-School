(function () {
  "use strict";

  var reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  function initNavigation() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var nav = document.getElementById("site-nav");

    if (!toggle || !nav) return;

    var links = Array.from(nav.querySelectorAll("a"));

    function setOpen(open) {
      nav.classList.toggle("is-open", open);

      toggle.setAttribute("aria-expanded", String(open));

      toggle.setAttribute(
        "aria-label",
        open ? "Close main menu" : "Open main menu"
      );

      document.body.classList.toggle("nav-open", open);

      if (open && links.length) {
        links[0].focus({ preventScroll: true });
      }

      if (!open) {
        toggle.focus({ preventScroll: true });
      }
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    links.forEach(function (link) {
      link.addEventListener("click", function () {
        if (nav.classList.contains("is-open")) {
          setOpen(false);
        }
      });
    });

    document.addEventListener("keydown", function (event) {
      if (
        event.key === "Escape" &&
        nav.classList.contains("is-open")
      ) {
        setOpen(false);
      }

      if (
        event.key === "Tab" &&
        nav.classList.contains("is-open") &&
        links.length
      ) {
        var first = links[0];
        var last = links[links.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    window.addEventListener("resize", function () {
      if (
        window.innerWidth > 980 &&
        nav.classList.contains("is-open")
      ) {
        nav.classList.remove("is-open");

        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open main menu");

        document.body.classList.remove("nav-open");
      }
    });
  }

  function initHeroSlider() {
    var element = document.querySelector(".hero-swiper");

    if (!element || typeof window.Swiper !== "function") return;

    var status = document.querySelector("[data-slider-status]");
    var slideNumber = document.querySelector("[data-slide-number]");
    var pauseButton = document.querySelector("[data-slider-toggle]");
    var mediaRegion = document.querySelector(".hero-media");

    var autoplayAllowed = !reducedMotion.matches;

    var slider = new window.Swiper(element, {
      effect: "creative",

      creativeEffect: {
        limitProgress: 2,
        perspective: true,

        prev: {
          translate: ["-10%", 0, -320],
          rotate: [0, 7, 0],
          scale: 0.9,
          opacity: 0.64,
          shadow: true
        },

        next: {
          translate: ["10%", 0, -320],
          rotate: [0, -7, 0],
          scale: 0.9,
          opacity: 0.64,
          shadow: true
        }
      },

      grabCursor: true,
      centeredSlides: true,
      slidesPerView: 1,
      loop: true,

      speed: reducedMotion.matches ? 0 : 850,

      watchSlidesProgress: true,

      keyboard: {
        enabled: true,
        onlyInViewport: true
      },

      navigation: {
        prevEl: "[data-slider-prev]",
        nextEl: "[data-slider-next]"
      },

      pagination: {
        el: "[data-slider-pagination]",
        clickable: true,
        bulletClass: "swiper-pagination-bullet",
        bulletActiveClass: "swiper-pagination-bullet-active"
      },

      autoplay: autoplayAllowed
        ? {
            delay: 5600,
            disableOnInteraction: false,
            pauseOnMouseEnter: true
          }
        : false,

      a11y: {
        enabled: true,
        prevSlideMessage: "Previous school photograph",
        nextSlideMessage: "Next school photograph",
        firstSlideMessage: "This is the first school photograph",
        lastSlideMessage: "This is the last school photograph",
        paginationBulletMessage: "Show photograph {{index}}"
      },

      on: {
        init: function (swiper) {
          updateStatus(swiper);

          if (pauseButton) {
            pauseButton.disabled = reducedMotion.matches;

            pauseButton.textContent = reducedMotion.matches
              ? "Motion reduced"
              : "Pause";

            pauseButton.setAttribute(
              "aria-label",
              reducedMotion.matches
                ? "Automatic movement disabled by reduced motion preference"
                : "Pause automatic slide changes"
            );
          }
        },

        realIndexChange: function (swiper) {
          updateStatus(swiper);
        }
      }
    });

    function updateStatus(swiper) {
      if (!status || !swiper.slides || !swiper.slides.length) {
        return;
      }

      var slide = swiper.slides[swiper.activeIndex];

      var title = slide &&
        slide.querySelector(".photo-caption strong");

      var current = String(swiper.realIndex + 1).padStart(2, "0");

      status.textContent =
        "Photograph " +
        current +
        " of 04: " +
        (title
          ? title.textContent
          : "Phoenix Secondary School");

      if (slideNumber) {
        slideNumber.textContent = current;
      }
    }

    var userPaused = false;

    if (mediaRegion) {
      mediaRegion.addEventListener("focusin", function () {
        if (
          !userPaused &&
          slider.autoplay &&
          !reducedMotion.matches
        ) {
          slider.autoplay.pause();
        }
      });

      mediaRegion.addEventListener("focusout", function (event) {
        if (
          !userPaused &&
          !mediaRegion.contains(event.relatedTarget) &&
          slider.autoplay &&
          !reducedMotion.matches
        ) {
          slider.autoplay.resume();
        }
      });

      mediaRegion.addEventListener("mouseenter", function () {
        if (
          !userPaused &&
          slider.autoplay &&
          !reducedMotion.matches
        ) {
          slider.autoplay.pause();
        }
      });

      mediaRegion.addEventListener("mouseleave", function () {
        if (
          !userPaused &&
          slider.autoplay &&
          !reducedMotion.matches
        ) {
          slider.autoplay.resume();
        }
      });
    }

    if (pauseButton) {
      pauseButton.addEventListener("click", function () {
        if (!slider.autoplay) return;

        var isPaused =
          pauseButton.getAttribute("aria-pressed") === "true";

        if (isPaused) {
          userPaused = false;

          slider.autoplay.start();

          pauseButton.setAttribute("aria-pressed", "false");
          pauseButton.setAttribute(
            "aria-label",
            "Pause automatic slide changes"
          );

          pauseButton.textContent = "Pause";
        } else {
          userPaused = true;

          slider.autoplay.stop();

          pauseButton.setAttribute("aria-pressed", "true");
          pauseButton.setAttribute(
            "aria-label",
            "Play automatic slide changes"
          );

          pauseButton.textContent = "Play";
        }
      });
    }

    reducedMotion.addEventListener("change", function (event) {
      if (!slider || slider.destroyed) return;

      if (event.matches) {
        userPaused = true;

        if (slider.autoplay) {
          slider.autoplay.stop();
        }

        slider.params.speed = 0;

        if (pauseButton) {
          pauseButton.disabled = true;
          pauseButton.textContent = "Motion reduced";

          pauseButton.setAttribute("aria-pressed", "true");
          pauseButton.setAttribute(
            "aria-label",
            "Automatic movement disabled by reduced motion preference"
          );
        }
      } else {
        userPaused = false;

        slider.params.speed = 850;

        if (pauseButton) {
          pauseButton.disabled = false;
          pauseButton.textContent = "Pause";

          pauseButton.setAttribute("aria-pressed", "false");
          pauseButton.setAttribute(
            "aria-label",
            "Pause automatic slide changes"
          );
        }

        if (slider.autoplay) {
          slider.autoplay.start();
        }
      }
    });
  }

  function initReveal() {
    var targets = document.querySelectorAll("[data-reveal]");

    if (
      !targets.length ||
      reducedMotion.matches ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    document.documentElement.classList.add("reveal-enabled");

    var observer = new IntersectionObserver(
      function (entries, currentObserver) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");

            currentObserver.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.08
      }
    );

    targets.forEach(function (target) {
      observer.observe(target);
    });
  }

  function initFooterYear() {
    var year = document.querySelector("[data-current-year]");

    if (year) {
      year.textContent = String(new Date().getFullYear());
    }
  }

  function init() {
    initNavigation();
    initHeroSlider();
    initReveal();
    initFooterYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }
})();
