/* Launchfolio shared enhancement layer — template-agnostic.
   Adds: JSON-LD Person schema, personal SVG favicon, og/twitter metas,
   theme-color, copy-email toast, and a skip-to-content link.
   Reads the same data/*.json files the template already ships; every step
   is tolerant of missing files and skips work the template already did. */
(() => {
  'use strict';

  const grab = (file) =>
    fetch(`data/${file}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);

  const walk = (node, visit) => {
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      visit(key, value);
      if (value && typeof value === 'object') walk(value, visit);
    }
  };

  const collectUrls = (obj) => {
    const urls = new Set();
    walk(obj, (_k, v) => {
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) urls.add(v);
    });
    return [...urls];
  };

  const collectByKey = (obj, keys) => {
    const found = [];
    walk(obj, (k, v) => {
      if (keys.includes(k) && typeof v === 'string' && v.trim()) found.push(v.trim());
    });
    return found;
  };

  const ensureMeta = (attr, name, content) => {
    if (!content) return;
    let el = document.head.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    if (!el.getAttribute('content')) el.setAttribute('content', content);
  };

  async function run() {
    const [site, hero, contact, education, experience] = await Promise.all(
      ['site-config', 'hero', 'contact', 'education', 'experience'].map(grab)
    );

    const name =
      (hero && typeof hero.name === 'string' && hero.name.trim()) ||
      (site && site.meta && site.meta.author) || '';
    const title =
      (hero && (hero.title || hero.role || hero.charting)) ||
      (site && site.meta && site.meta.description) || '';
    const email = contact && typeof contact.email === 'string' ? contact.email : '';
    const location =
      (contact && contact.location) || (hero && hero.location) || '';

    /* ---- JSON-LD Person (skip if the template already injected one) ---- */
    if (name && !document.querySelector('script[type="application/ld+json"]')) {
      const sameAs = collectUrls({ hero, contact }).filter((u) =>
        /linkedin\.com|github\.com|twitter\.com|x\.com|dribbble\.com|behance\.net/i.test(u) ||
        (hero && (u === hero.website || u === hero.url))
      );
      const schools = education ? [...new Set(collectByKey(education, ['institution']))] : [];
      const companies = experience
        ? collectByKey(experience, ['company', 'house', 'atelier', 'venue'])
        : [];
      const person = { '@context': 'https://schema.org', '@type': 'Person', name };
      if (typeof title === 'string' && title.length < 120) person.jobTitle = title;
      if (email) person.email = `mailto:${email}`;
      if (location) person.address = { '@type': 'PostalAddress', addressLocality: location };
      if (sameAs.length) person.sameAs = sameAs.slice(0, 6);
      if (schools.length) person.alumniOf = schools.slice(0, 3);
      if (companies.length) person.worksFor = { '@type': 'Organization', name: companies[0] };
      const metaDesc = document.head.querySelector('meta[name="description"]');
      if (metaDesc && metaDesc.content) person.description = metaDesc.content;
      const tag = document.createElement('script');
      tag.type = 'application/ld+json';
      tag.textContent = JSON.stringify(person);
      document.head.appendChild(tag);
    }

    /* ---- Share metas (og / twitter) ---- */
    const metaDesc = document.head.querySelector('meta[name="description"]');
    ensureMeta('property', 'og:title', document.title);
    ensureMeta('property', 'og:description', metaDesc ? metaDesc.content : '');
    ensureMeta('property', 'og:type', 'profile');
    ensureMeta('name', 'twitter:card', 'summary');
    ensureMeta('name', 'twitter:title', document.title);

    /* ---- theme-color from the template's real ground ---- */
    const bodyStyle = getComputedStyle(document.body);
    ensureMeta('name', 'theme-color', bodyStyle.backgroundColor);

    /* ---- Personal favicon: initials in the template's own colors/face ---- */
    const hasDataIcon = [...document.querySelectorAll('link[rel~="icon"]')]
      .some((l) => (l.getAttribute('href') || '').startsWith('data:'));
    if (name && !hasDataIcon) {
      const initials = name.split(/\s+/).map((w) => w[0]).filter(Boolean)
        .slice(0, 2).join('').toUpperCase();
      const family = (bodyStyle.fontFamily || 'sans-serif').split(',')[0].replace(/"/g, "'");
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">` +
        `<rect width="64" height="64" rx="12" fill="${bodyStyle.backgroundColor}"/>` +
        `<text x="32" y="33" dy="0.36em" text-anchor="middle" fill="${bodyStyle.color}" ` +
        `font-family="${family}, sans-serif" font-size="28" font-weight="700">${initials}</text></svg>`;
      let icon = document.head.querySelector('link[rel~="icon"]');
      if (!icon) {
        icon = document.createElement('link');
        icon.rel = 'icon';
        document.head.appendChild(icon);
      }
      icon.type = 'image/svg+xml';
      icon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }

    /* ---- Copy-email toast on mailto links ---- */
    if (navigator.clipboard && !document.querySelector('[data-lf-toast]')) {
      const toast = document.createElement('div');
      toast.setAttribute('data-lf-toast', '');
      toast.setAttribute('role', 'status');
      toast.style.cssText =
        'position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(8px);' +
        `background:${bodyStyle.color};color:${bodyStyle.backgroundColor};` +
        'padding:8px 16px;font:13px/1.2 inherit;letter-spacing:.04em;opacity:0;' +
        'pointer-events:none;transition:opacity .25s,transform .25s;z-index:9999;border-radius:3px;';
      document.body.appendChild(toast);
      let timer = null;
      document.addEventListener('click', (event) => {
        const link = event.target.closest && event.target.closest('a[href^="mailto:"]');
        if (!link) return;
        const address = link.getAttribute('href').replace(/^mailto:/, '').split('?')[0];
        if (!address) return;
        navigator.clipboard.writeText(address).then(() => {
          toast.textContent = 'address copied';
          toast.style.opacity = '1';
          toast.style.transform = 'translateX(-50%) translateY(0)';
          clearTimeout(timer);
          timer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(8px)';
          }, 1600);
        }).catch(() => {});
      });
    }

    /* ---- Skip-to-content ---- */
    if (!document.querySelector('.skip-link, [data-lf-skip]')) {
      const target = document.querySelector('main, [role="main"], section');
      if (target) {
        if (!target.id) target.id = 'lf-content';
        const skip = document.createElement('a');
        skip.setAttribute('data-lf-skip', '');
        skip.href = `#${target.id}`;
        skip.textContent = 'Skip to content';
        skip.style.cssText =
          'position:absolute;left:12px;top:-48px;z-index:10000;padding:10px 16px;' +
          `background:${bodyStyle.color};color:${bodyStyle.backgroundColor};` +
          'font:14px/1 inherit;text-decoration:none;transition:top .15s;';
        skip.addEventListener('focus', () => { skip.style.top = '12px'; });
        skip.addEventListener('blur', () => { skip.style.top = '-48px'; });
        document.body.prepend(skip);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { run(); });
  } else {
    run();
  }
})();
