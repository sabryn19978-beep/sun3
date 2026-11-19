/* ============================================================
   Sun Nail — Shared JavaScript
   Bilingual switch (localStorage) + mobile menu + lightbox + FAQ
   ============================================================ */

(function () {
  "use strict";

  var STORAGE_KEY = "sun-nail-language";
  var DEFAULT_LANG = "ar";

  function currentLang() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : DEFAULT_LANG;
    } catch (e) {
      return DEFAULT_LANG;
    }
  }

  function attrFor(el, base, lang) {
    var attr = lang === "en" ? "data-en-" + base : "data-ar-" + base;
    return el.getAttribute(attr);
  }

  function applyLanguage(lang) {
    var isArabic = lang === "ar";

    document.documentElement.lang = lang;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";

    // Translatable text
    document.querySelectorAll("[data-ar]").forEach(function (el) {
      var value = el.getAttribute(isArabic ? "data-ar" : "data-en");
      if (value === null) return;
      if (el.hasAttribute("data-translate-html")) {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }
    });

    // Translatable ARIA labels (for icon-only buttons)
    document.querySelectorAll("[data-ar-label]").forEach(function (el) {
      var value = attrFor(el, "label", lang);
      if (value !== null) el.setAttribute("aria-label", value);
    });

    // Translatable image alternative text
    document.querySelectorAll("[data-ar-alt]").forEach(function (el) {
      var value = attrFor(el, "alt", lang);
      if (value !== null) el.setAttribute("alt", value);
    });

    // WhatsApp links with a service-specific message
    document.querySelectorAll("[data-wa-ar]").forEach(function (el) {
      var message = el.getAttribute(isArabic ? "data-wa-ar" : "data-wa-en");
      el.href = "https://wa.me/966571828519?text=" + encodeURIComponent(message || "");
    });

    // Toggle button states
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* Storage may be unavailable (private mode) — ignore. */
    }

    // Let other components refresh captions if needed.
    document.dispatchEvent(new CustomEvent("sunnail:languagechange", { detail: { lang: lang } }));
  }

  function initLanguage() {
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var lang = btn.getAttribute("data-lang") === "en" ? "en" : "ar";
        applyLanguage(lang);
      });
    });
    applyLanguage(currentLang());
  }

  /* ---------------- Mobile dropdown menu ---------------- */

  function initMobileMenu() {
    var toggle = document.getElementById("menuToggle");
    var nav = document.getElementById("mainNav");
    if (!toggle || !nav) return;

    function setMenu(open) {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "×" : "☰";
      toggle.setAttribute(
        "aria-label",
        open
          ? (currentLang() === "en" ? "Close menu" : "إغلاق القائمة")
          : (currentLang() === "en" ? "Open menu" : "فتح القائمة")
      );
    }

    toggle.addEventListener("click", function () {
      setMenu(!nav.classList.contains("open"));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setMenu(false); });
    });

    document.addEventListener("click", function (event) {
      if (!nav.classList.contains("open")) return;
      if (!nav.contains(event.target) && !toggle.contains(event.target)) setMenu(false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth >= 768) setMenu(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("open")) {
        setMenu(false);
        toggle.focus();
      }
    });

    document.addEventListener("sunnail:languagechange", function () {
      var open = nav.classList.contains("open");
      setMenu(open);
    });
  }

  /* ---------------- Lightbox ---------------- */

  function initLightbox() {
    var images = Array.prototype.slice.call(document.querySelectorAll(".gallery-item img"));
    var box = document.getElementById("lightbox");
    if (!images.length || !box) return;

    var largeImage = box.querySelector(".lightbox-img");
    var caption = box.querySelector(".lightbox-caption");
    var index = 0;
    var lastFocused = null;

    function captionFor(img) {
      var isArabic = currentLang() === "ar";
      var value = img.getAttribute(isArabic ? "data-ar-alt" : "data-en-alt");
      return value || img.alt || "";
    }

    function show(position) {
      index = (position + images.length) % images.length;
      var img = images[index];
      largeImage.src = img.currentSrc || img.src;
      largeImage.alt = img.alt;
      if (caption) caption.textContent = captionFor(img);
    }

    function open(position) {
      lastFocused = document.activeElement;
      show(position);
      box.classList.add("open");
      document.body.classList.add("lightbox-active");
      box.querySelector(".lightbox-close").focus();
    }

    function close() {
      box.classList.remove("open");
      document.body.classList.remove("lightbox-active");
      largeImage.removeAttribute("src");
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    images.forEach(function (img, i) {
      img.closest(".gallery-item").addEventListener("click", function () { open(i); });
    });

    box.querySelector(".lightbox-close").addEventListener("click", close);
    box.querySelector(".lightbox-prev").addEventListener("click", function () { show(index - 1); });
    box.querySelector(".lightbox-next").addEventListener("click", function () { show(index + 1); });

    box.addEventListener("click", function (event) {
      if (event.target === box) close();
    });

    document.addEventListener("keydown", function (event) {
      if (!box.classList.contains("open")) return;
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") show(index + (currentLang() === "ar" ? 1 : -1));
      if (event.key === "ArrowRight") show(index + (currentLang() === "ar" ? -1 : 1));
    });

    document.addEventListener("sunnail:languagechange", function () {
      if (box.classList.contains("open")) show(index);
    });
  }

  /* ---------------- FAQ accordion (one open at a time) ---------------- */

  function initFaq() {
    var items = Array.prototype.slice.call(document.querySelectorAll(".faq-item"));
    items.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (!item.open) return;
        items.forEach(function (other) {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  /* ---------------- Boot ---------------- */

  function boot() {
    initLanguage();
    initMobileMenu();
    initLightbox();
    initFaq();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
