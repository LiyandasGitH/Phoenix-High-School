(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function initMobileNav() {
    var toggle = document.querySelector("[data-nav-toggle]");
    var nav = document.getElementById("site-nav");
    if (!toggle || !nav) {
      return;
    }

    function setOpen(isOpen) {
      nav.classList.toggle("is-open", isOpen);
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      toggle.setAttribute(
        "aria-label",
        isOpen ? "Close menu" : "Open menu"
      );
      document.body.classList.toggle("nav-open", isOpen);
    }

    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("is-open"));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setOpen(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth >= 768) {
        setOpen(false);
      }
    });
  }

  function initCalendarFilter() {
    var buttons = document.querySelectorAll("[data-calendar-filter]");
    var items = document.querySelectorAll("[data-calendar-item]");
    if (!buttons.length || !items.length) {
      return;
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var filter = button.getAttribute("data-calendar-filter");

        buttons.forEach(function (item) {
          var active = item === button;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", active ? "true" : "false");
        });

        items.forEach(function (item) {
          var category = item.getAttribute("data-calendar-item");
          var show = filter === "all" || category === filter;
          item.hidden = !show;
        });
      });
    });
  }

  function initDirectionsForm() {
    var form = document.querySelector("[data-directions-form]");
    var map = document.querySelector(".map-frame iframe");
    var status = document.querySelector("[data-directions-status]");
    if (!form || !map || !status) {
      return;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var origin = new FormData(form).get("origin");
      if (typeof origin !== "string" || !origin.trim()) {
        status.textContent = "Enter a starting address to see directions.";
        return;
      }

      var directionsUrl = new URL("https://maps.google.com/maps");
      directionsUrl.search = new URLSearchParams({
        saddr: origin.trim(),
        daddr: "Phoenix Secondary School, Silverstream Road, Manenberg, Cape Town, South Africa",
        output: "embed"
      }).toString();

      map.src = directionsUrl.toString();
      map.title = "Directions from " + origin.trim() + " to Phoenix Secondary School in Manenberg";
      status.textContent = "Showing directions from " + origin.trim() + " to Phoenix Secondary School.";
    });
  }

  function initWhatsAppChat() {
    var link = document.createElement("a");
    link.className = "whatsapp-float";
    link.href = "https://wa.me/27216384577?text=Hello%20Phoenix%20Secondary%20School";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "Chat with Phoenix Secondary School on WhatsApp");
    link.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M12 2a9.8 9.8 0 0 0-8.5 14.7L2 22l5.5-1.4A10 10 0 1 0 12 2Zm0 17.9a8 8 0 0 1-4.1-1.1l-.4-.2-3.2.8.9-3.1-.3-.5A8 8 0 1 1 12 19.9Z"/>' +
      '<path d="M16.4 13.7c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.6.1-.6.8-.8.9-.3.2-.5.1a6.6 6.6 0 0 1-1.9-1.2 7.3 7.3 0 0 1-1.3-1.6c-.1-.2 0-.3.1-.4l.4-.5.2-.4v-.4c-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 3.8 3.5.5.2.9.4 1.2.5.5.2 1 .2 1.3.1.4-.1 1.4-.6 1.6-1.1.2-.5.2-.9.1-1-.1-.1-.3-.2-.5-.3Z"/>' +
      "</svg><span>WhatsApp</span>";
    document.body.appendChild(link);
  }

  ready(function () {
    initMobileNav();
    initCalendarFilter();
    initDirectionsForm();
    initWhatsAppChat();
  });
})();
