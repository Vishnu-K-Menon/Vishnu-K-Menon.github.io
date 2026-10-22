/* =============================================================
   BLUEPRINT — cyanotype engineering drawing portfolio
   All content is hydrated from data/*.json. A missing or empty
   file hides its section entirely (never an empty shell).
   ============================================================= */

'use strict';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// When the browser runs scroll-driven animations, simple reveals are handled
// by CSS inside @supports (animation-timeline: view()) — IO only draws lines.
const SCROLL_DRIVEN =
    typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline: view()');

const $ = (id) => document.getElementById(id);

function esc(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function fetchJSON(name) {
    return fetch('data/' + name + '.json')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
}

function show(el) {
    if (el) el.hidden = false;
}

function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value == null ? '' : String(value);
}

/* Shrink display type until its longest word fits the container.
   Batched: one read pass, one proportional write, then a short settle loop
   (rarely more than a single extra iteration) — no sustained layout thrash. */
function fitToWidth(el, minPx) {
    if (!el) return;
    const min = minPx || 26;
    el.style.fontSize = '';
    const base = parseFloat(window.getComputedStyle(el).fontSize);
    const sw = el.scrollWidth;
    const cw = el.clientWidth;
    if (!sw || !cw || sw <= cw) return;
    let size = Math.max(min, Math.floor(base * (cw / sw)));
    el.style.fontSize = size + 'px';
    let guard = 8;
    while (el.scrollWidth > el.clientWidth && size > min && guard-- > 0) {
        size -= 2;
        el.style.fontSize = size + 'px';
    }
}

document.addEventListener('DOMContentLoaded', init);

async function init() {
    if (!REDUCED_MOTION) document.documentElement.classList.add('motion-ok');

    const [siteConfig, navigation, hero, about, experience, projects, skills, education, contact, footer] =
        await Promise.all([
            fetchJSON('site-config'),
            fetchJSON('navigation'),
            fetchJSON('hero'),
            fetchJSON('about'),
            fetchJSON('experience'),
            fetchJSON('projects'),
            fetchJSON('skills'),
            fetchJSON('education'),
            fetchJSON('contact'),
            fetchJSON('footer')
        ]);

    hydrateSiteConfig(siteConfig);
    hydrateNavigation(navigation);
    hydrateHero(hero);
    hydrateAbout(about);
    hydrateExperience(experience);
    hydrateProjects(projects);
    hydrateSkills(skills);
    hydrateEducation(education);
    hydrateContact(contact);
    hydrateFooter(footer);

    initNavToggle();
    initReveal();
}

/* ---------------------------------------------------------- site config */
function hydrateSiteConfig(data) {
    const meta = (data && (data.meta || data)) || null;
    if (!meta) return;
    if (meta.title) document.title = meta.title;
    const desc = document.querySelector('meta[name="description"]');
    const author = document.querySelector('meta[name="author"]');
    if (desc && meta.description) desc.content = meta.description;
    if (author && meta.author) author.content = meta.author;
}

/* ----------------------------------------------------------- navigation */
function hydrateNavigation(data) {
    if (!data || !data.brand || !data.brand.name) return;
    setText('brand-monogram', data.brand.monogram || data.brand.name.charAt(0));
    setText('brand-name', data.brand.name);
    setText('brand-dwg', data.brand.drawingNumber || '');

    const items = data.menuItems || [];
    $('nav-menu').innerHTML = items
        .map((item, i) =>
            '<li><a href="' + esc(item.href) + '" class="nav-link">' +
            '<span class="nav-idx">' + String(i + 1).padStart(2, '0') + '</span>' +
            esc(item.text) + '</a></li>'
        )
        .join('');
    show($('navbar'));
}

/* ----------------------------------------------------------------- hero */
function hydrateHero(data) {
    if (!data || !data.name) return;

    setText('hero-dwg', data.drawingNumber || '');
    const figure = [data.figure, data.figureLabel].filter(Boolean).join(' — ');
    setText('hero-figure', figure);
    setText('hero-name', data.name);
    setText('hero-dim-label', data.dimensionLabel || '');
    setText('hero-title', data.title || '');

    if (data.summary) {
        setText('hero-note-label', data.summaryLabel || 'NOTE');
        setText('hero-summary', data.summary);
    } else {
        $('hero-note').remove();
    }

    const meta = data.meta || [];
    $('hero-meta').innerHTML = meta
        .map((m) => {
            const value = m.href
                ? '<a href="' + esc(m.href) + '">' + esc(m.value) + '</a>'
                : '<span class="meta-value">' + esc(m.value) + '</span>';
            return '<li><span class="meta-label">' + esc(m.label) + '</span>' + value + '</li>';
        })
        .join('');

    const buttons = (data.cta && data.cta.buttons) || [];
    $('hero-cta').innerHTML = buttons
        .map((b) => '<a href="' + esc(b.href) + '" class="btn btn-' + esc(b.type || 'secondary') + '">' + esc(b.text) + '</a>')
        .join('');

    const readouts = data.readouts || [];
    $('hero-readouts').innerHTML = readouts
        .map((r) =>
            '<div class="readout"><span class="readout-value">' + esc(r.value) + '</span>' +
            '<span class="readout-label">' + esc(r.label) + '</span></div>'
        )
        .join('');

    if (data.photo && data.photo.src) {
        const img = $('hero-photo-img');
        img.src = data.photo.src;
        img.alt = data.photo.alt || data.name;
        setText('hero-photo-dim', data.photo.dimensionLabel || '');
        setText('hero-photo-caption', data.photo.caption || '');
        show($('hero-photo'));
    } else {
        $('hero-photo').remove();
    }

    show($('hero'));

    const name = $('hero-name');
    const refit = () => fitToWidth(name, 30);
    refit();
    let fitRaf = 0;
    window.addEventListener('resize', () => {
        if (fitRaf) cancelAnimationFrame(fitRaf);
        fitRaf = requestAnimationFrame(refit);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
}

/* ---------------------------------------------------------------- about */
function hydrateAbout(data) {
    if (!data || !data.notes || data.notes.length === 0) return;

    setText('about-figure', data.figure || 'NOTES');
    setText('about-title', data.sectionTitle || 'General Notes');

    $('about-notes').innerHTML = data.notes
        .map((note) => '<li class="reveal">' + esc(note) + '</li>')
        .join('');

    const specs = data.specs || [];
    $('about-specs').innerHTML = specs
        .map((s) =>
            '<div class="spec-row"><dt>' + esc(s.label) + '</dt><dd>' + esc(s.value) + '</dd></div>'
        )
        .join('');
    if (specs.length === 0) $('about-specs').remove();

    show($('about'));
}

/* ----------------------------------------------- experience + datum SVG */
function truncate(text, max) {
    const s = String(text || '');
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function buildDatumStrip(roles) {
    const svg = $('datum-strip');
    if (!svg) return;
    const n = roles.length;
    const w = 1000;
    const parts = [];

    parts.push('<line class="datum-ext" x1="0" y1="46" x2="' + w + '" y2="46"/>');
    parts.push('<line class="datum-line draw" x1="8" y1="46" x2="' + (w - 8) + '" y2="46" pathLength="1"/>');

    // Keep company labels from colliding when there are many stations.
    const maxChars = Math.min(18, Math.max(8, Math.floor(120 / n)));

    roles.forEach((role, i) => {
        const x = Math.round((i + 0.5) * (w / n));
        parts.push('<line class="datum-tick" x1="' + x + '" y1="36" x2="' + x + '" y2="56"/>');
        parts.push('<circle class="datum-node" cx="' + x + '" cy="46" r="5"/>');
        parts.push('<text class="datum-sta" x="' + x + '" y="18" text-anchor="middle">' + esc(String(role.station || '').toUpperCase()) + '</text>');
        parts.push('<text class="datum-co" x="' + x + '" y="78" text-anchor="middle">' + esc(truncate(String(role.company || '').toUpperCase(), maxChars)) + '</text>');
        parts.push('<text class="datum-span" x="' + x + '" y="94" text-anchor="middle">' + esc(String(role.span || '').toUpperCase()) + '</text>');
    });

    svg.innerHTML = parts.join('');
}

function hydrateExperience(data) {
    if (!data || !data.roles || data.roles.length === 0) return;

    setText('experience-figure', data.figure || 'FIG. 01');
    setText('experience-title', data.sectionTitle || 'Service Record');
    buildDatumStrip(data.roles);

    $('experience-list').innerHTML = data.roles
        .map((role) => {
            const org = [role.company, role.location].filter(Boolean).join(' · ');
            const details = (role.details || [])
                .map((d) => '<li>' + esc(d) + '</li>')
                .join('');
            const tech = (role.technologies || []).join(' · ');
            const logo = role.logo
                ? '<span class="role-logo"><img src="' + esc(role.logo) + '" alt="' + esc(role.company) + ' logo" loading="lazy" decoding="async"></span>'
                : '';
            return (
                '<article class="role reveal">' +
                '<header class="role-head"><span>' + esc(role.station || '') + '</span><span>' + esc(role.period || '') + '</span></header>' +
                '<div class="role-id">' + logo + '<div>' +
                '<h3 class="role-position">' + esc(role.position) + '</h3>' +
                '<p class="role-org">' + esc(org) + '</p>' +
                '</div></div>' +
                (role.summary ? '<p class="role-summary">' + esc(role.summary) + '</p>' : '') +
                (details ? '<ul class="role-details">' + details + '</ul>' : '') +
                (tech ? '<p class="role-tech">[ ' + esc(tech) + ' ]</p>' : '') +
                '</article>'
            );
        })
        .join('');

    show($('experience'));
}

/* ------------------------------------------------------------- projects */
function hydrateProjects(data) {
    if (!data || !data.projects || data.projects.length === 0) return;

    setText('projects-figure', data.figure || 'FIG. 02');
    setText('projects-title', data.sectionTitle || 'Project Schematics');

    const crops =
        '<span class="crop crop-tl" aria-hidden="true"></span>' +
        '<span class="crop crop-tr" aria-hidden="true"></span>' +
        '<span class="crop crop-bl" aria-hidden="true"></span>' +
        '<span class="crop crop-br" aria-hidden="true"></span>';

    $('projects-grid').innerHTML = data.projects
        .map((p) => {
            const spec = (p.technologies || []).join(' · ');
            const links = (p.links || [])
                .map((l) =>
                    '<a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' +
                    esc(l.label) + ' ↗</a>'
                )
                .join('');
            return (
                '<article class="schematic reveal">' + crops +
                '<header class="schematic-head"><span>' + esc(p.part || '') + '</span>' +
                (p.category ? '<span>[ ' + esc(p.category) + ' ]</span>' : '') + '</header>' +
                (p.image
                    ? '<figure class="schematic-fig"><img src="' + esc(p.image) + '" alt="' + esc(p.name) + ' schematic" width="640" height="360" loading="lazy" decoding="async"></figure>'
                    : '') +
                '<h3 class="schematic-name">' + esc(p.name) + '</h3>' +
                '<p class="schematic-desc">' + esc(p.description || '') + '</p>' +
                (spec ? '<p class="schematic-spec">SPEC: ' + esc(spec) + '</p>' : '') +
                (links ? '<div class="schematic-links">' + links + '</div>' : '') +
                '</article>'
            );
        })
        .join('');

    show($('projects'));
}

/* --------------------------------------------------------------- skills */
function hydrateSkills(data) {
    if (!data || !data.rows || data.rows.length === 0) return;

    setText('skills-figure', data.figure || 'FIG. 03');
    setText('skills-title', data.sectionTitle || 'Parts Schedule');

    $('skills-rows').innerHTML = data.rows
        .map((row) =>
            '<tr>' +
            '<td class="cell-mono" data-label="REF">' + esc(row.ref) + '</td>' +
            '<td class="cell-strong" data-label="CATEGORY">' + esc(row.category) + '</td>' +
            '<td data-label="ITEMS">' + esc((row.items || []).join(' · ')) + '</td>' +
            '<td class="cell-mono td-num" data-label="QTY">' + esc(row.qty) + '</td>' +
            '</tr>'
        )
        .join('');

    if (data.note) {
        setText('skills-note', data.note);
    } else {
        $('skills-note').remove();
    }

    show($('skills'));
}

/* ---------------------------------------- education → revision history */
function hydrateEducation(data) {
    if (!data || !data.revisions || data.revisions.length === 0) return;

    setText('education-figure', data.figure || 'FIG. 04');
    setText('education-title', data.sectionTitle || 'Revision History');

    $('education-rows').innerHTML = data.revisions
        .map((rev) =>
            '<tr>' +
            '<td class="cell-mono" data-label="REV">' + esc(rev.rev) + '</td>' +
            '<td class="cell-mono" data-label="DATE">' + esc(rev.date || '—') + '</td>' +
            '<td class="cell-strong" data-label="DESCRIPTION">' + esc(rev.description) + '</td>' +
            '<td data-label="ISSUED BY">' + esc(rev.org || '—') + '</td>' +
            '<td class="cell-mono" data-label="NOTE">' + esc(rev.note || '—') + '</td>' +
            '</tr>'
        )
        .join('');

    show($('education'));
}

/* -------------------------------------------------------------- contact */
function hydrateContact(data) {
    if (!data || (!data.email && (!data.channels || data.channels.length === 0))) return;

    setText('contact-figure', data.figure || 'FIG. 05');
    setText('contact-title', data.sectionTitle || 'Contact Detail');
    setText('contact-subtitle', data.subtitle || '');

    const emailEl = $('contact-email');
    if (data.email) {
        emailEl.textContent = data.email;
        emailEl.href = 'mailto:' + data.email;
        // The shared enhancement layer copies mailto addresses on activation
        // when the Clipboard API exists; the hint mirrors what will happen.
        const hint = $('email-hint');
        hint.textContent = navigator.clipboard && navigator.clipboard.writeText
            ? 'TAP TO COPY / SEND'
            : 'SEND ↗';
    } else {
        $('email-row').remove();
    }

    const cells = [
        { label: 'Location', value: data.location },
        { label: 'Phone', value: data.phone },
        { label: 'Status', value: data.availability }
    ].filter((c) => c.value);

    $('contact-grid').innerHTML = cells
        .map((c) =>
            '<div class="contact-cell"><span class="cell-label">' + esc(c.label) + '</span>' +
            '<span class="cell-value">' + esc(c.value) + '</span></div>'
        )
        .join('');
    if (cells.length === 0) $('contact-grid').remove();

    const channels = data.channels || [];
    $('contact-channels').innerHTML = channels
        .map((ch) =>
            '<li><a href="' + esc(ch.url) + '" target="_blank" rel="noopener noreferrer">' +
            '<span class="ch-label">' + esc(ch.label) + '</span>' + esc(ch.value) + ' ↗</a></li>'
        )
        .join('');
    if (channels.length === 0) $('contact-channels').remove();

    show($('contact'));
}

/* ------------------------------------------------- footer / title block */
function hydrateFooter(data) {
    if (!data || !data.titleBlock || !data.titleBlock.drawnBy) return;
    const tb = data.titleBlock;

    setText('footer-credit', data.credit || '');
    setText('footer-copyright', data.copyright || '');

    const cells = [
        { label: 'Project', value: tb.project, wide: true },
        { label: 'Drawn By', value: tb.drawnBy },
        { label: 'Discipline', value: tb.role },
        { label: 'Location', value: tb.location },
        { label: 'Email', value: tb.email, href: tb.email ? 'mailto:' + tb.email : '' },
        { label: 'DWG No.', value: tb.drawingNumber },
        { label: 'Rev', value: tb.revision },
        { label: 'Sheet', value: tb.sheet },
        { label: 'Scale', value: tb.scale }
    ].filter((c) => c.value);

    $('title-block').innerHTML = cells
        .map((c) => {
            const value = c.href
                ? '<a href="' + esc(c.href) + '">' + esc(c.value) + '</a>'
                : esc(c.value);
            return (
                '<div class="tb-cell' + (c.wide ? ' tb-wide' : '') + '">' +
                '<span class="tb-label">' + esc(c.label) + '</span>' +
                '<span class="tb-value">' + value + '</span></div>'
            );
        })
        .join('');

    show($('footer'));
}

/* ------------------------------------------------------------ nav toggle */
function initNavToggle() {
    const navbar = $('navbar');
    const toggle = $('nav-toggle');
    if (!navbar || !toggle) return;

    toggle.addEventListener('click', () => {
        const open = navbar.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
    });

    navbar.addEventListener('click', (e) => {
        if (e.target.closest('.nav-link')) {
            navbar.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navbar.classList.contains('open')) {
            navbar.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });
}

/* --------------------------------- section reveal + line-draw animation */
function initReveal() {
    // Line-draw (stroke-dashoffset) is the signature animation and stays on
    // the JS/IO path everywhere. Simple .reveal fades move to pure CSS
    // scroll-driven animations when the browser supports view() timelines.
    const selector = SCROLL_DRIVEN ? '.fig-rule, .datum-strip' : '.reveal, .fig-rule, .datum-strip';
    const targets = document.querySelectorAll(selector);

    if (REDUCED_MOTION || !('IntersectionObserver' in window)) {
        targets.forEach((el) => el.classList.add('revealed'));
        return;
    }

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    obs.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach((el) => observer.observe(el));
}
