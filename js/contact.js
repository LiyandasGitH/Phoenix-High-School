(function () {
  "use strict";

  var form = document.querySelector("[data-contact-form]");
  if (form) {
    var submitButton = form.querySelector('button[type="submit"]');
    var originalButtonText = submitButton ? submitButton.textContent : "";

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!form.reportValidity() || form.dataset.submitting === "true") return;

      form.dataset.submitting = "true";
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }

      try {
        var response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" }
        });
        var responseText = await response.text();
        var result;

        try {
          result = JSON.parse(responseText);
        } catch (error) {
          throw new Error(
            "The email service returned an invalid response (HTTP " + response.status + "). " +
            "Check that send-email.php is deployed and PHP is enabled on the website host. " +
            "You can email phoenixsecondaryschool@gmail.com directly."
          );
        }

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Your message could not be sent. Please try again.");
        }

        form.reset();
        window.alert(result.message || "Thank you. Your message has been sent to Phoenix Secondary School.");
      } catch (error) {
        window.alert(error instanceof Error
          ? error.message
          : "We could not send your message. Please try again or email the school directly.");
      } finally {
        form.dataset.submitting = "false";
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
        }
      }
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
        directionsStatus.textContent = "Enter a starting address to see directions.";
        if (originField) originField.focus();
        return;
      }

      var destination = "Phoenix Secondary School, Silverstream Road, Manenberg, Cape Town, South Africa";
      var directionsUrl = new URL("https://maps.google.com/maps");
      directionsUrl.search = new URLSearchParams({
        saddr: origin,
        daddr: destination,
        output: "embed"
      }).toString();
      map.src = directionsUrl.toString();
      map.title = "Directions from " + origin + " to Phoenix Secondary School on Silverstream Road, Manenberg";
      directionsStatus.textContent = "The map is showing directions from " + origin + " to Phoenix Secondary School.";
    });
  }

  var year = document.querySelector("[data-current-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
