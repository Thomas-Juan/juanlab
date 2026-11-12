// Juan Lab — small progressive enhancements. The page works without this file.
(function () {
  'use strict';

  // Mobile navigation
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      links.classList.toggle('is-open', !open);
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        toggle.setAttribute('aria-expanded', 'false');
        links.classList.remove('is-open');
      }
    });
  }

  // Team member contact card
  var dialog = document.getElementById('member-dialog');
  if (dialog && typeof dialog.showModal === 'function') {
    var $ = function (id) { return document.getElementById(id); };
    document.querySelectorAll('.member').forEach(function (m) {
      m.addEventListener('click', function (e) {
        e.preventDefault();
        var d = m.dataset;
        var profile = m.getAttribute('href');
        $('dialog-name').textContent = d.name;
        $('dialog-role').textContent = d.role;
        $('dialog-avatar').src = d.avatar;
        $('dialog-email-row').hidden = !d.email;
        if (d.email) {
          $('dialog-email').href = 'mailto:' + d.email;
          $('dialog-email').textContent = d.email;
        }
        $('dialog-profile-row').hidden = !profile;
        if (profile) $('dialog-profile').href = profile;
        $('dialog-orcid-row').hidden = !d.orcid;
        if (d.orcid) $('dialog-orcid').href = d.orcid;
        $('dialog-scholar-row').hidden = !d.scholar;
        if (d.scholar) $('dialog-scholar').href = d.scholar;
        dialog.showModal();
      });
    });
    dialog.querySelector('.dialog-close').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
  }

  // Software section: a cosmetic password gate.
  // The check runs in the browser and the page source is public, so this
  // only keeps the section out of the way — it is not security.
  var gate = document.getElementById('software-gate');
  var gated = document.getElementById('software-content');
  if (gate && gated) {
    var input = document.getElementById('gate-input');
    var error = document.getElementById('gate-error');

    var open = function () {
      gated.hidden = false;
      gate.hidden = true;
      try { sessionStorage.setItem('juanlab-software', '1'); } catch (e) {}
    };

    try {
      if (sessionStorage.getItem('juanlab-software') === '1') open();
    } catch (e) {}

    var digest = function (text) {
      if (!window.crypto || !crypto.subtle) return Promise.reject();
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return b.toString(16).padStart(2, '0');
        }).join('');
      });
    };

    gate.addEventListener('submit', function (e) {
      e.preventDefault();
      digest(input.value).then(function (hash) {
        if (hash === gate.dataset.hash) {
          open();
        } else {
          error.hidden = false;
          gate.classList.add('is-wrong');
          input.select();
        }
      }).catch(function () {
        error.textContent = 'This section cannot be opened in this browser.';
        error.hidden = false;
      });
    });

    input.addEventListener('input', function () {
      error.hidden = true;
      gate.classList.remove('is-wrong');
    });
  }

  // Highlight the section in view, and reveal content on scroll
  if ('IntersectionObserver' in window) {
    var navAnchors = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navAnchors.forEach(function (a) {
          a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + entry.target.id));
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navAnchors.forEach(function (a) {
      var s = document.querySelector(a.getAttribute('href'));
      if (s) spy.observe(s);
    });

    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          reveal.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    document.querySelectorAll('.reveal').forEach(function (el) { reveal.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
