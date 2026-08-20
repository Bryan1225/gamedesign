
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

  (function(){
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if(!items.length) return;

    var revealed = new WeakSet();
    var seenCount = 0;

    function revealOne(el){
      if(revealed.has(el)) return;
      revealed.add(el);
      el.style.setProperty('--reveal-delay', (seenCount % 3) * 0.08 + 's');
      seenCount++;
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

  // MERGE TEXT — splits headings, lead paragraphs, and bullet points into
  // per-word spans, each starting scattered (random direction/rotation/scale),
  // then converges them into place on load or scroll-reveal. Skipped entirely
  // for prefers-reduced-motion (text just renders normally, no splitting).
  //
  // Scope is deliberately not "literally every span on the page" -- headings,
  // lead paragraphs, and bullet list items get it; tags, table cells, and nav
  // labels stay as simple fades. Splitting every small fragment site-wide would
  // be visually noisy and would hurt performance for little benefit.
  (function(){
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduceMotion) return;

    var selector = [
      'h1','h2','h3','.nav-name',
      '.about-panel p', '.row-blurb', '.row-contrib li',
      '.detail-body p:not(.muted)'
    ].join(',');
    var targets = Array.prototype.filter.call(document.querySelectorAll(selector), function(el){
      return !el.closest('.attachment-modal');
    });
    if(!targets.length) return;

    var DIRECTIONS = [
      {x:-90,y:0},{x:90,y:0},{x:0,y:-75},{x:0,y:75},
      {x:-70,y:-55},{x:70,y:-55},{x:-70,y:55},{x:70,y:55}
    ];

    var items = [];
    targets.forEach(function(el){
      var full = el.textContent.trim();
      if(!full) return;
      el.setAttribute('aria-label', full);
      var holder = document.createElement('span');
      holder.setAttribute('aria-hidden', 'true');
      var words = full.split(/\s+/);
      words.forEach(function(word, i){
        var span = document.createElement('span');
        span.className = 'merge-word';
        span.textContent = word;
        var d = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        var rot = (Math.random() * 34 - 17).toFixed(1);
        var scale = (0.4 + Math.random() * 0.25).toFixed(2);
        var delay = Math.min(i, 20) * 0.055;
        span.style.setProperty('--mx', d.x + 'px');
        span.style.setProperty('--my', d.y + 'px');
        span.style.setProperty('--mrot', rot + 'deg');
        span.style.setProperty('--mscale', scale);
        span.style.setProperty('--mdelay', delay.toFixed(3) + 's');
        holder.appendChild(span);
        if(i < words.length - 1){ holder.appendChild(document.createTextNode(' ')); }
      });
      el.textContent = '';
      el.appendChild(holder);
      items.push(el);
    });
    if(!items.length) return;

    var revealed = new WeakSet();
    function mergeIn(el){
      if(revealed.has(el)) return;
      revealed.add(el);
      el.querySelectorAll('.merge-word').forEach(function(span){ span.classList.add('merged'); });
    }
    function checkMerge(){
      var vh = window.innerHeight || document.documentElement.clientHeight;
      items.forEach(function(el){
        if(revealed.has(el)) return;
        var rect = el.getBoundingClientRect();
        if(rect.top < vh * 0.94){ mergeIn(el); }
      });
    }
    var ticking = false;
    function queueCheck(){
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(function(){ checkMerge(); ticking = false; });
    }
    window.addEventListener('scroll', queueCheck, { passive: true });
    window.addEventListener('resize', queueCheck);
    document.addEventListener('scroll', queueCheck, { passive: true, capture: true });

    checkMerge();
    window.addEventListener('load', checkMerge);
    setTimeout(checkMerge, 400);
    setTimeout(checkMerge, 1200);
    setTimeout(function(){ items.forEach(mergeIn); }, 3000);
  })();

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
      document.body.style.overflow = 'hidden';
    }
    function closeModal(modal){
      modal.classList.remove('open');
      modal.setAttribute('inert', '');
      document.body.style.overflow = '';
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
      var open = document.querySelector('.attachment-modal.open');
      if(open) closeModal(open);
    });
  })();
