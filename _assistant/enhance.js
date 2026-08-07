// Nova UAT enhancement: reveal-on-scroll + sticky header + theme toggle.

(() => {
  if (window.__NOVA_ENHANCE__) return;
  window.__NOVA_ENHANCE__ = true;

  /* ==============================================================
     Theme toggle — cycles auto → light → dark → auto
     Preference lives in localStorage as 'nova-theme'; 'auto' clears
     the data-theme attribute and lets @media prefers-color-scheme win.
     ============================================================== */

  const THEME_KEY = 'nova-theme';
  const order = ['auto', 'light', 'dark'];
  const icons = {
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  };
  const labels = { auto: 'Auto', light: 'Light', dark: 'Dark' };

  const applyTheme = (t) => {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  };

  const savedTheme = (() => {
    try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch { return 'auto'; }
  })();
  applyTheme(savedTheme);

  const buildToggle = () => {
    const btn = document.createElement('button');
    btn.className = 'nova-theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Switch theme');
    let current = savedTheme;
    const render = () => {
      btn.innerHTML = `${icons[current]}<span>${labels[current]}</span>`;
    };
    render();
    btn.addEventListener('click', () => {
      current = order[(order.indexOf(current) + 1) % order.length];
      try { localStorage.setItem(THEME_KEY, current); } catch {}
      applyTheme(current);
      render();
    });
    document.body.appendChild(btn);
  };

  /* ==============================================================
     Reveal-on-scroll + sticky header glass state
     ============================================================== */

  /* Scroll progress bar (top edge of viewport) */
  const buildProgress = () => {
    const bar = document.createElement('div');
    bar.className = 'nova-progress';
    document.body.appendChild(bar);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = `scaleX(${pct})`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  };

  /* Collapse empty/near-empty sections that the mirror left behind
     from stripped Next.js React components (huge dead zone bug). */
  const collapseEmptySections = () => {
    const main = document.querySelector('main');
    if (!main) return 0;
    const sections = main.querySelectorAll('section, main > div > div');
    let hidden = 0;
    for (const s of sections) {
      if (s.classList.contains('nova-tabs')) continue;
      if (s.closest('.glbl-chat-panel')) continue;
      const text = (s.innerText || '').replace(/\s+/g, '').length;
      const hasMedia = !!s.querySelector('img, video, iframe, svg, canvas');
      // If the section has no rendered text AND no media, it's dead
      if (text < 4 && !hasMedia) {
        s.style.display = 'none';
        hidden++;
      }
    }
    return hidden;
  };

  /* Inject a tabbed explorer section on the homepage only */
  const TAB_DATA = {
    Products: [
      { title: 'BuildOps', desc: 'AI-assisted software engineering platform.', href: '/ai-products/buildops/' },
      { title: 'cmplihr',  desc: "India's labour-law compliance, on autopilot.", href: '/ai-products/cmplihr/' },
      { title: 'Medhavarse', desc: 'Adaptive learning for K–12 and higher ed.', href: '/ai-products/medhavarse/' },
      { title: 'InterviewPanda', desc: 'AI interview prep and hiring workflow.', href: '/ai-products/interviewpanda/' },
      { title: 'SupportOps', desc: 'AI-native customer support ops.', href: '/ai-products/supportops/' },
      { title: 'Btrfly', desc: 'Custom AI product for our partners.', href: '/ai-products/btrfly/' },
    ],
    Services: [
      { title: 'AI Solutions', desc: 'RAG, agents, custom LLM apps.', href: '/services/ai-solutions/' },
      { title: 'Cybersecurity', desc: 'VAPT, SSDLC, DPDP-aligned security.', href: '/services/cybersecurity/' },
      { title: 'Cloud Engineering', desc: 'CI/CD, Kubernetes, cloud-native.', href: '/services/cloud-engineering/' },
      { title: 'Data Intelligence', desc: 'Data pipelines, analytics, BI.', href: '/services/data-intelligence/' },
      { title: 'Enterprise Software', desc: 'ERP, HRMS, custom line-of-business.', href: '/services/enterprise-software/' },
      { title: 'Web · Mobile · IT Staffing', desc: 'Design → build → staff.', href: '/services/' },
    ],
    Insights: [
      { title: 'Agentic systems in production', desc: 'What actually survives once agents ship.', href: '/insights/agentic-systems-that-survive-production/' },
      { title: 'DPDP: secure by design', desc: "Building for India's data-protection act.", href: '/insights/dpdp-act-secure-by-design/' },
      { title: 'How a lean senior team ships fast', desc: 'Our own operating pattern.', href: '/insights/how-a-lean-senior-team-ships-fast/' },
      { title: 'Modernizing legacy — no big bang', desc: 'Incremental replacement patterns.', href: '/insights/modernizing-legacy-without-the-big-bang/' },
    ],
    Industries: [
      { title: 'Government', desc: 'Digital public infrastructure at scale.', href: '/government/' },
      { title: 'All industries', desc: 'Sectors we work across.', href: '/industries/' },
      { title: 'Engagement models', desc: 'How we start with new partners.', href: '/engagement/' },
      { title: 'Careers', desc: 'Join Globalion.', href: '/careers/' },
    ],
  };
  const buildTabs = () => {
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;
    const main = document.querySelector('main');
    if (!main) return;
    // Insert after the first section (the hero) if possible; else at the end
    const hero = main.querySelector('section') || main.firstElementChild;

    const wrap = document.createElement('section');
    wrap.className = 'nova-tabs';
    wrap.innerHTML = `
      <h2>Explore Globalion</h2>
      <p class="nova-sub">Everything we build, ship, and write about — in one place.</p>
      <div class="nova-tab-strip" role="tablist"></div>
      <div class="nova-tab-content"></div>
    `;
    const strip = wrap.querySelector('.nova-tab-strip');
    const content = wrap.querySelector('.nova-tab-content');
    const keys = Object.keys(TAB_DATA);
    const render = (key) => {
      strip.querySelectorAll('.nova-tab').forEach((b) => b.classList.toggle('active', b.dataset.key === key));
      content.innerHTML = '';
      for (const item of TAB_DATA[key]) {
        const a = document.createElement('a');
        a.className = 'nova-tab-card';
        a.href = item.href;
        a.innerHTML = `<h3></h3><p></p><span class="arrow">Explore →</span>`;
        a.querySelector('h3').textContent = item.title;
        a.querySelector('p').textContent = item.desc;
        content.appendChild(a);
      }
    };
    for (const key of keys) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'nova-tab';
      b.dataset.key = key;
      b.textContent = key;
      b.addEventListener('click', () => render(key));
      strip.appendChild(b);
    }
    render(keys[0]);

    if (hero && hero.nextSibling) main.insertBefore(wrap, hero.nextSibling);
    else main.appendChild(wrap);
  };

  const ready = () => {
    buildToggle();
    buildProgress();
    const collapsed = collapseEmptySections();
    if (collapsed) console.log(`[nova] collapsed ${collapsed} empty section(s)`);
    buildTabs();

    const main = document.querySelector('main') || document.body;
    const candidates = main.querySelectorAll(
      'main > section, main > div > section, section > div, article, [class*="hero"], [class*="Hero"]'
    );
    const targets = [...candidates].filter(
      (el) =>
        !el.closest('.glbl-chat-panel') &&
        !el.classList.contains('glbl-chat-btn') &&
        !el.classList.contains('nova-theme-toggle') &&
        el.getBoundingClientRect().height > 40
    );
    for (const el of targets) el.classList.add('nova-reveal');

    const viewportH = window.innerHeight;
    for (const el of targets) {
      const r = el.getBoundingClientRect();
      if (r.top < viewportH * 0.9) el.classList.add('in');
    }

    if ('IntersectionObserver' in window) {
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
      for (const el of targets) if (!el.classList.contains('in')) io.observe(el);
    } else {
      for (const el of targets) el.classList.add('in');
    }

    // Sticky-header glass
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        document.body.classList.toggle('nova-scrolled', window.scrollY > 24);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();
