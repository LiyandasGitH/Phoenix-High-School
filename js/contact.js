(function () {
  "use strict";

  var form = document.querySelector("[data-contact-form]");
  var formStatus = document.querySelector("[data-form-status]");
  var fallbackLink = document.querySelector("[data-form-fallback]");
  var submitButton = form && form.querySelector('button[type="submit"]');
  var submitLabel = form && form.querySelector("[data-submit-label]");

  function getField(name) {
    return form ? form.elements.namedItem(name) : null;
  }

  function setError(field, message) {
    var error = document.getElementById(field.id + "-error");
    field.setAttribute("aria-invalid", message ? "true" : "false");

    if (error) {
      error.textContent = message || "";
      error.hidden = !message;
    }

    return !message;
  }

  function validateField(field) {
    if (!field) return true;

    var value = field.value.trim();
    var message = "";

    if (field.name === "name") {
      if (!value) {
        message = "Enter your name so the school knows who is contacting them.";
      } else if (value.length < 2) {
        message = "Enter at least 2 characters for your name.";
      }
    }

    if (field.name === "email") {
      if (!value) {
        message = "Enter an email address so the school can reply.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        message = "Enter a valid email address, for example name@example.com.";
      }
    }

    if (
      field.name === "phone" &&
      value &&
      !/^\+?[0-9\s().-]{7,25}$/.test(value)
    ) {
      message = "Enter a valid phone number or leave this field empty.";
    }

    if (field.name === "topic" && !value) {
      message = "Choose the topic that best matches your enquiry.";
    }

    if (field.name === "message") {
      if (!value) {
        message = "Write a short message for the school.";
      } else if (value.length < 15) {
        message = "Please provide a little more detail (at least 15 characters).";
      }
    }

    return setError(field, message);
  }

  function validateForm() {
    var names = ["name", "email", "phone", "topic", "message"];
    var firstInvalid = null;
    var valid = true;

    names.forEach(function (name) {
      var field = getField(name);

      if (!validateField(field)) {
        valid = false;
        if (!firstInvalid) firstInvalid = field;
      }
    });

    if (firstInvalid) firstInvalid.focus();

    return valid;
  }

  function setStatus(message, isError) {
    if (!formStatus) return;

    formStatus.textContent = message;
    formStatus.hidden = false;
    formStatus.classList.toggle("is-error", Boolean(isError));
  }

  if (form) {
    ["name", "email", "phone", "topic", "message"].forEach(function (name) {
      var field = getField(name);

      if (!field) return;

      field.addEventListener("blur", function () {
        validateField(field);
      });

      field.addEventListener("input", function () {
        if (field.getAttribute("aria-invalid") === "true") {
          validateField(field);
        }

        if (formStatus && !formStatus.hidden) {
          formStatus.hidden = true;
        }
      });

      field.addEventListener("change", function () {
        if (field.getAttribute("aria-invalid") === "true") {
          validateField(field);
        }
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (formStatus) formStatus.hidden = true;
      if (fallbackLink) fallbackLink.hidden = true;

      if (!validateForm()) {
        setStatus(
          "Please check the highlighted fields and try again.",
          true
        );
        return;
      }

      var name = getField("name").value.trim();
      var email = getField("email").value.trim();
      var phone = getField("phone").value.trim();
      var topic = getField("topic").value;
      var message = getField("message").value.trim();

      var subject =
        "Website enquiry | Phoenix Secondary School | " + topic;

      var body = [
        "Hello Phoenix Secondary School,",
        "",
        "I would like to make an enquiry.",
        "",
        "Name: " + name,
        "Email: " + email,
        "Phone: " + (phone || "Not provided"),
        "Topic: " + topic,
        "",
        "Message:",
        message,
        "",
        "Kind regards,",
        name
      ].join("\n");

      var mailto =
        "mailto:phoenixsecondaryschool@gmail.com?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);

      if (fallbackLink) {
        var fallbackAnchor = fallbackLink.querySelector("a");

        if (fallbackAnchor) {
          fallbackAnchor.href = mailto;
        }

        fallbackLink.hidden = false;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add("is-submitting");
      }

      if (submitLabel) {
        submitLabel.textContent = "Opening email app";
      }

      setStatus(
        "Your email application should open with your enquiry prepared. Review the details and send the email there. The school has not received your message until you send it.",
        false
      );

      window.location.href = mailto;

      window.setTimeout(function () {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.classList.remove("is-submitting");
        }

        if (submitLabel) {
          submitLabel.textContent = "Prepare email";
        }
      }, 1400);
    });
  }

  var directionsForm = document.querySelector("[data-directions-form]");
  var directionsStatus = document.querySelector("[data-directions-status]");
  var map = document.querySelector(".map-frame iframe");

  if (directionsForm && directionsStatus && map) {
    directionsForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var originField = directionsForm.elements.namedItem("origin");
      var origin = originField && originField.value.trim();

      if (!origin) {
        directionsStatus.textContent =
          "Enter a starting address to see directions.";

        if (originField) originField.focus();

        return;
      }

      var destination =
        "Phoenix Secondary School, Silverstream Road, Manenberg, Cape Town, South Africa";

      var directionsUrl = new URL("https://maps.google.com/maps");

      directionsUrl.search = new URLSearchParams({
        saddr: origin,
        daddr: destination,
        output: "embed"
      }).toString();

      map.src = directionsUrl.toString();

      map.title =
        "Directions from " +
        origin +
        " to Phoenix Secondary School on Silverstream Road, Manenberg";

      directionsStatus.textContent =
        "The map is showing directions from " +
        origin +
        " to Phoenix Secondary School.";
    });
  }

  var year = document.querySelector("[data-current-year]");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
})();
