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

  // Software section.
  //
  // The content is not in this page. It is encrypted with AES-GCM in
  // assets/locked/software.json; the key comes from the password through
  // PBKDF2. A wrong password fails the cipher's own integrity check, so there
  // is nothing to compare against and nothing to read in the page source.
  // The password is asked for on every page load; nothing is remembered.
  var gate = document.getElementById('software-gate');
  var gated = document.getElementById('software-content');
  if (gate && gated) {
    var form = document.getElementById('gate-form');
    var opener = document.getElementById('gate-open');
    var input = document.getElementById('gate-input');
    var submit = document.getElementById('gate-submit');
    var error = document.getElementById('gate-error');
    var payload = null;

    var fail = function (message) {
      error.textContent = message;
      error.hidden = false;
      gate.classList.add('is-wrong');
    };

    opener.addEventListener('click', function () {
      form.hidden = false;
      opener.hidden = true;
      opener.setAttribute('aria-expanded', 'true');
      input.focus();
      // fetch the ciphertext now so unlocking feels immediate
      fetch(gate.dataset.payload, { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (p) { payload = p; })
        .catch(function () { payload = null; });
    });

    var bytes = function (b64) {
      var bin = atob(b64), out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    };

    var decrypt = function (password, p) {
      var enc = new TextEncoder();
      return crypto.subtle
        .importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
        .then(function (material) {
          return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: bytes(p.salt), iterations: p.iterations, hash: 'SHA-256' },
            material,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
          );
        })
        .then(function (key) {
          return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(p.iv) }, key, bytes(p.data));
        })
        .then(function (plain) {
          return new TextDecoder().decode(plain);
        });
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!window.crypto || !crypto.subtle) {
        return fail('This browser cannot open the section. Try a current browser over https.');
      }

      var attempt = payload
        ? Promise.resolve(payload)
        : fetch(gate.dataset.payload, { cache: 'no-store' }).then(function (r) { return r.json(); });

      submit.disabled = true;
      submit.textContent = 'Opening…';

      attempt
        .then(function (p) { payload = p; return decrypt(input.value, p); })
        .then(function (htmlText) {
          gated.innerHTML = htmlText;
          gated.hidden = false;
          gate.hidden = true;
        })
        .catch(function () {
          // AES-GCM rejects a wrong key, so this is the wrong-password path
          fail('That password is not correct.');
          input.select();
        })
        .then(function () {
          submit.disabled = false;
          submit.textContent = 'Unlock';
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
    var crossing = null;   // id of the section crossing the line
    var atEnd = false;     // scrolled to the very bottom of the page
    var lastId = navAnchors.length ? navAnchors[navAnchors.length - 1].getAttribute('href').slice(1) : null;
    var paint = function () {
      var id = atEnd ? lastId : crossing;
      navAnchors.forEach(function (a) {
        a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + id));
      });
    };
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        crossing = entry.target.id;
        paint();
      });
    // a thin line near the top of the window: the section crossing it is
    // current. Near the top so that the short Software band is caught too.
    }, { rootMargin: '-20% 0px -75% 0px' });
    navAnchors.forEach(function (a) {
      var s = document.querySelector(a.getAttribute('href'));
      if (s) spy.observe(s);
    });
    // the banner has no menu entry, so nothing is highlighted while it is in view
    var hero = document.getElementById('top');
    if (hero) spy.observe(hero);
    // On a tall window the last section cannot reach the line before the page
    // ends, so the bottom of the page counts as the last section.
    var checkEnd = function () {
      var top = window.pageYOffset;
      var end = top > 0 && window.innerHeight + top >= document.documentElement.scrollHeight - 4;
      if (end !== atEnd) { atEnd = end; paint(); }
    };
    window.addEventListener('scroll', checkEnd, { passive: true });
    window.addEventListener('resize', checkEnd, { passive: true });
    checkEnd();

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
