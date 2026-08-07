// Nova UAT visual polish — pairs with enhance.css.
// Adds the .nova-reveal class to major content blocks and toggles .in
// as they scroll into view. Purely presentational — no content edits.
//
// Skip the chatbot widget's own elements (they have their own animations).

(() => {
  if (window.__NOVA_ENHANCE__) return;
  window.__NOVA_ENHANCE__ = true;

  // Wait for DOM ready-ish
  const ready = () => {
    // Pick the main content region if the site marks it; otherwise fall
    // back to the largest section in <main> or the body.
    const main = document.querySelector('main') || document.body;
    const candidates = main.querySelectorAll(
      'main > section, main > div > section, section > div, article, [class*="hero"], [class*="Hero"]'
    );
    const targets = [...candidates].filter(
      (el) =>
        !el.closest('.glbl-chat-panel') &&
        !el.classList.contains('glbl-chat-btn') &&
        el.getBoundingClientRect().height > 40
    );

    for (const el of targets) el.classList.add('nova-reveal');

    // Elements already in viewport at load: reveal immediately, no animation
    const viewportH = window.innerHeight;
    for (const el of targets) {
      const r = el.getBoundingClientRect();
      if (r.top < viewportH * 0.9) {
        el.classList.add('in');
      }
    }

    // IntersectionObserver for the rest
    if (!('IntersectionObserver' in window)) {
      for (const el of targets) el.classList.add('in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    for (const el of targets) {
      if (!el.classList.contains('in')) io.observe(el);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();
