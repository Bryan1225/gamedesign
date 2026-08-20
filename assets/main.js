
  (function(){
    var nav = document.getElementById('siteNav');
    var threshold = 120;
    function onScroll(){
      if(window.scrollY > threshold){ nav.classList.add('scrolled'); }
      else{ nav.classList.remove('scrolled'); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  // SCROLL REVEAL — each .reveal element starts invisible, 35px below its normal spot, and
  // animates to full opacity/normal position over 0.6s (cubic-bezier(0.16,1,0.3,1), so it
  // decelerates smoothly). Plays once: once an element is marked revealed it's never hidden
  // again, so scrolling back up and down doesn't replay it. Elements that share a parent
  // (e.g. the attachment cards in one .attachment-grid) stagger 80ms apart via --reveal-delay,
  // set once at setup based on each element's position among its own siblings -- not a single
  // page-wide counter, so unrelated reveals elsewhere on the page don't drift out of sync.
  // Reduced motion: skip entirely, mark everything revealed immediately so nothing is ever
  // hidden (the CSS also independently disables the transition, this just avoids relying on
  // scroll position to ever show the content at all).
  (function(){
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if(!items.length) return;

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduceMotion){
      items.forEach(function(el){ el.classList.add('in'); });
      return;
    }

    var groupCounts = new Map();
    items.forEach(function(el){
      var parent = el.parentElement;
      var idx = groupCounts.get(parent) || 0;
      el.style.setProperty('--reveal-delay', (idx * 0.08) + 's');
      groupCounts.set(parent, idx + 1);
    });

    var revealed = new WeakSet();
    function revealOne(el){
      if(revealed.has(el)) return;
      revealed.add(el);
      el.classList.add('in');
    }

    // Checks actual current position rather than watching for a "crossing" event —
    // this can't skip an element even if the scroll jumps in one big move (fast fling,
    // dragging the scrollbar, etc.), which IntersectionObserver's transition-based
    // model can miss.
    function checkReveal(){
      var vh = window.innerHeight || document.documentElement.clientHeight;
      items.forEach(function(el){
        if(revealed.has(el)) return;
        var rect = el.getBoundingClientRect();
        if(rect.top < vh * 0.92){ revealOne(el); }
      });
    }

    var ticking = false;
    function queueCheck(){
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(function(){ checkReveal(); ticking = false; });
    }

    window.addEventListener('scroll', queueCheck, { passive: true });
    window.addEventListener('resize', queueCheck);
    // capture:true also catches scroll events bubbling from a nested scroll container,
    // in case the page itself isn't the scrolling element in the current host environment
    document.addEventListener('scroll', queueCheck, { passive: true, capture: true });

    checkReveal();
    window.addEventListener('load', checkReveal);
    setTimeout(checkReveal, 400);
    setTimeout(checkReveal, 1200);

    // hard safety net: never leave content permanently invisible if scrolling somehow
    // never fires a usable event in a given environment
    setTimeout(function(){ items.forEach(revealOne); }, 3000);
  })();

  // Click-to-play: the iframe is only created the moment the user clicks, never while the
  // case-study panel is collapsed. Loading YouTube's player inside a zero-height/hidden
  // container is a plausible reason a live embed can misbehave; building it fresh at a
  // guaranteed-visible moment avoids that entirely. Falls back to opening YouTube in a new
  // tab if JS doesn't run, since the element is a real <a href> underneath.
  document.querySelectorAll('.video-embed[data-video-id]').forEach(function(el){
    el.addEventListener('click', function(e){
      if(el.dataset.loaded) return;
      e.preventDefault();
      el.dataset.loaded = 'true';
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + el.dataset.videoId + '?autoplay=1&rel=0';
      iframe.title = el.getAttribute('aria-label') || 'YouTube video player';
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      iframe.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; border:0;';
      el.innerHTML = '';
      el.appendChild(iframe);
      el.removeAttribute('href');
      el.style.cursor = 'default';
    });
  });

  // PROJECT ATTACHMENT MODAL — opens on button click, closes via the × button,
  // backdrop click, or Escape. Uses inert to keep the hidden modal out of the
  // tab order and out of screen-reader focus until it's actually open.
  (function(){
    var openBtn = null;
    function openModal(modal, trigger){
      modal.removeAttribute('inert');
      modal.classList.add('open');
      openBtn = trigger;
      var closeBtn = modal.querySelector('.attachment-modal-close');
      if(closeBtn) closeBtn.focus();
      // lock html too, not just body -- in standards mode <html> is the scrolling
      // element, so body-only overflow:hidden leaves the page scrollable behind the modal
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
    function closeModal(modal){
      modal.classList.remove('open');
      modal.setAttribute('inert', '');
      // the image lightbox can sit on top of this modal -- only release the scroll
      // lock if it isn't also still open
      if(!document.querySelector('.img-lightbox.open')){
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      }
      if(openBtn){ openBtn.focus(); openBtn = null; }
    }
    document.querySelectorAll('.attachment-btn[data-modal]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var modal = document.getElementById(btn.getAttribute('data-modal'));
        if(modal) openModal(modal, btn);
      });
    });
    document.querySelectorAll('.attachment-modal').forEach(function(modal){
      modal.querySelectorAll('[data-modal-close]').forEach(function(el){
        el.addEventListener('click', function(){ closeModal(modal); });
      });
    });
    document.addEventListener('keydown', function(e){
      if(e.key !== 'Escape') return;
      // the image lightbox can sit on top of an open attachment modal — let its own
      // Escape handler close that first instead of dropping both layers at once
      if(document.querySelector('.img-lightbox.open')) return;
      var open = document.querySelector('.attachment-modal.open');
      if(open) closeModal(open);
    });
  })();

  // ATTACHMENT IMAGE LIGHTBOX — click (or Enter/Space) any filled attachment thumbnail
  // to view it full-size. Placeholder slots (SVG icon, no <img>) are left as-is since
  // there's no real image to enlarge.
  (function(){
    var medias = Array.prototype.filter.call(
      document.querySelectorAll('.attachment-media'),
      function(el){ return el.querySelector('img'); }
    );
    if(!medias.length) return;

    var lightbox = document.createElement('div');
    lightbox.className = 'img-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Enlarged image');
    lightbox.setAttribute('inert', '');
    lightbox.innerHTML =
      '<div class="img-lightbox-backdrop" data-lightbox-close></div>' +
      '<div class="img-lightbox-inner">' +
        '<button type="button" class="img-lightbox-close" data-lightbox-close aria-label="Close">&times;</button>' +
        '<img alt="">' +
      '</div>';
    document.body.appendChild(lightbox);
    var lbImg = lightbox.querySelector('img');
    var lbCloseBtn = lightbox.querySelector('.img-lightbox-close');
    var lastTrigger = null;

    function openLightbox(img, trigger){
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || '';
      lightbox.removeAttribute('inert');
      lightbox.classList.add('open');
      lastTrigger = trigger;
      lbCloseBtn.focus();
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox(){
      lightbox.classList.remove('open');
      lightbox.setAttribute('inert', '');
      // the lightbox can sit on top of an already-open attachment modal -- only
      // release the scroll lock if that modal isn't also still open underneath
      if(!document.querySelector('.attachment-modal.open')){
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      }
      if(lastTrigger && lastTrigger.focus){ lastTrigger.focus(); }
      lastTrigger = null;
    }

    medias.forEach(function(el){
      var img = el.querySelector('img');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', 'View full-size: ' + (img.alt || 'image'));
      el.addEventListener('click', function(){ openLightbox(img, el); });
      el.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openLightbox(img, el); }
      });
    });

    lightbox.querySelectorAll('[data-lightbox-close]').forEach(function(el){
      el.addEventListener('click', closeLightbox);
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && lightbox.classList.contains('open')){ closeLightbox(); }
    });
  })();
