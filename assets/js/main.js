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

  // Highlight the menu entry of the section in view.
  //
  // The current section is the last one whose top has passed a line just below
  // the header. A fixed line (not a share of the window height) works for short
  // sections like Software and Games at any window size, and it matches where a
  // menu click lands: the section top sits right under the header. While the
  // banner is in view nothing is highlighted. On a tall window the last section
  // may never reach the line, so the bottom of the page counts as that section.
  var navAnchors = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
  var header = document.querySelector('.site-header');
  if (navAnchors.length && header) {
    var lastId = navAnchors[navAnchors.length - 1].getAttribute('href').slice(1);
    var highlight = function () {
      var line = header.offsetHeight + 40;
      var id = null;
      navAnchors.forEach(function (a) {
        var s = document.querySelector(a.getAttribute('href'));
        if (s && s.getBoundingClientRect().top <= line) id = s.id;
      });
      var top = window.pageYOffset;
      if (top > 0 && window.innerHeight + top >= document.documentElement.scrollHeight - 4) id = lastId;
      navAnchors.forEach(function (a) {
        a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + id));
      });
    };
    var waiting = false;
    var onScroll = function () {
      if (waiting) return;
      waiting = true;
      requestAnimationFrame(function () { waiting = false; highlight(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('load', highlight);
    highlight();
  }

  // Reveal content as it scrolls into view
  if ('IntersectionObserver' in window) {
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

  // Games: "Play in browser" opens the game in a window on this page. The game page is put in
  // an iframe only when asked for, and the iframe is removed again on close so the game stops.
  var gameDialog = document.getElementById('game-dialog');
  if (gameDialog && typeof gameDialog.showModal === 'function') {
    var gameFrame = gameDialog.querySelector('.game-frame');
    var closeGame = function () {
      gameFrame.textContent = '';
      if (gameDialog.open) gameDialog.close();
    };
    document.querySelectorAll('a[data-game]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        gameFrame.textContent = '';
        var frame = document.createElement('iframe');
        frame.src = link.getAttribute('data-game');
        frame.title = link.getAttribute('data-title') || 'Game';
        frame.allow = 'autoplay; fullscreen';
        gameFrame.appendChild(frame);
        document.getElementById('game-dialog-title').textContent = frame.title;
        document.getElementById('game-dialog-hint').textContent =
          link.getAttribute('data-hint') || 'Click the game to start, then use the keyboard.';
        gameDialog.showModal();
        frame.focus();
      });
    });
    gameDialog.querySelector('.game-close').addEventListener('click', closeGame);
    gameDialog.addEventListener('close', function () { gameFrame.textContent = ''; });
    // Esc is the game's menu key, so it must not close the window
    gameDialog.addEventListener('cancel', function (e) { e.preventDefault(); });
  }

  // Downloads: say what is about to be downloaded and wait for a second click.
  // Without JavaScript the buttons are ordinary links and download directly.
  var dlDialog = document.getElementById('download-dialog');
  if (dlDialog && typeof dlDialog.showModal === 'function') {
    var dlTarget = null;
    document.querySelectorAll('a[data-download]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        dlTarget = link;
        var size = link.getAttribute('data-size');
        // data-from names the source; an empty value leaves it out (files on this site).
        var from = link.hasAttribute('data-from') ? link.getAttribute('data-from') : 'GitHub';
        document.getElementById('download-file').textContent =
          link.getAttribute('data-download') + (size ? ' (' + size + ')' : '') + ' will be downloaded' +
          (from ? ' from ' + from : '') + '.';
        var note = document.getElementById('download-note');
        note.textContent = link.getAttribute('data-note') || '';
        note.hidden = !note.textContent;
        dlDialog.showModal();
      });
    });
    document.getElementById('download-go').addEventListener('click', function () {
      dlDialog.close();
      if (dlTarget) {
        if (dlTarget.hasAttribute('download')) {
          // keep the download attribute, so a PDF is saved rather than opened in the browser
          var a = document.createElement('a');
          a.href = dlTarget.href; a.download = dlTarget.getAttribute('download');
          document.body.appendChild(a); a.click(); a.remove();
        } else {
          window.location.href = dlTarget.href;
        }
      }
      dlTarget = null;
    });
    document.getElementById('download-cancel').addEventListener('click', function () {
      dlTarget = null;
      dlDialog.close();
    });
  }

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
