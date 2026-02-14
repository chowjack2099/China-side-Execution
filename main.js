(function () {
  const toggle = document.querySelector(".navToggle");
  const mobileNav = document.getElementById("mobileNav");

  if (toggle && mobileNav) {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      mobileNav.setAttribute("aria-hidden", String(expanded));
    });

    mobileNav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        toggle.setAttribute("aria-expanded", "false");
        mobileNav.setAttribute("aria-hidden", "true");
      });
    });
  }

  // Formspree submit -> redirect to thank-you
  const form = document.getElementById("leadForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const btn = form.querySelector('button[type="submit"]');
      const oldText = btn ? btn.textContent : "";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Submitting...";
      }

      try {
        const payload = new URLSearchParams(new FormData(form));
        const res = await fetch(form.action, {
          method: "POST",
          body: payload,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          },
        });

        if (res.ok) {
          window.location.href = "/thank-you.html";
          return;
        }

        let msg = "Submission failed. Please try again or contact us directly.";
        try {
          const data = await res.json();
          if (data && data.errors && data.errors.length) {
            msg = data.errors.map((x) => x.message).join(" ");
          }
        } catch (_) {}

        alert(msg);
      } catch (err) {
        alert("Network error. Please try again or contact us directly.");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = oldText;
        }
      }
    });
  }
})();
