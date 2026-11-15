/* fixes.js — सर्च, वर्ल्ड कंट्री लिस्ट, देश का डेटा और लिंक सुधार
   पुराने फ़ंक्शन हटाए नहीं गए; यह फ़ाइल उनके नए/मज़बूत संस्करण ऊपर से लगाती है। */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  async function getJSON(url, ms = 10000) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
    try { const r = await fetch(url, { signal: c.signal }); return r.ok ? await r.json() : null; }
    catch (e) { return null; } finally { clearTimeout(t); }
  }

  /* ---------- विकिपीडिया सर्च (राज्य/UT नाम ठीक करके) ---------- */
  const WIKI_FIX = {
    'delhi (nct)': 'Delhi', 'jammu & kashmir (ut)': 'Jammu and Kashmir (union territory)',
    'dadra & nagar haveli and daman & diu (ut)': 'Dadra and Nagar Haveli and Daman and Diu',
    'andaman & nicobar islands (ut)': 'Andaman and Nicobar Islands', 'puducherry (ut)': 'Puducherry',
    'chandigarh (ut)': 'Chandigarh', 'ladakh (ut)': 'Ladakh', 'lakshadweep (ut)': 'Lakshadweep',
    'bharat': 'India', 'भारत': 'भारत'
  };
  const cleanTitle = q => WIKI_FIX[q.toLowerCase()] || q.replace(/\s*\((UT|NCT)\)\s*$/i, '').replace(/&/g, 'and');
  const wikiSummary = (lang, t) => getJSON(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, '_'))}?redirect=true`);
  const wikiSearch = async (lang, q) => {
    const d = await getJSON(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=6&format=json&origin=*`);
    return (d && d.query && d.query.search) || [];
  };

  let lastQ = '', lastT = 0, skipCountry = false;

  window.quickSearch = function (term) {
    $('bharatSearchInput').value = term;
    skipCountry = true;
    window.searchBharat();
  };

  window.searchBharat = async function () {
    const input = $('bharatSearchInput');
    const q = input.value.trim(); if (!q) return;
    const now = Date.now();
    if (q === lastQ && now - lastT < 600) return;       // कीबोर्ड से डबल-ट्रिगर रोकना
    lastQ = q; lastT = now;

    // वर्ल्ड टैब पर देश का नाम लिखा हो तो सीधे उसका डेटा खोलें
    const onWorld = $('globalSection').style.display === 'block';
    if (onWorld && !skipCountry && window.allCountries && allCountries.length) {
      const nq = norm(q);
      const hit = allCountries.find(c => norm(c.name.common) === nq) || allCountries.find(c => norm(c.name.common).startsWith(nq));
      if (hit) { fetchCountryWorldBankData(hit); return; }
    }
    skipCountry = false;

    const section = $('searchResultSection'), titleEl = $('searchTitle'), bodyEl = $('searchBody');
    section.style.display = 'block';
    titleEl.textContent = `खोज रहे हैं: "${q}" …`;
    bodyEl.style.gridTemplateColumns = '1fr';
    bodyEl.innerHTML = '<p>विकिपीडिया और सरकारी पोर्टल से जानकारी ला रहे हैं…</p>';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const lang = /[\u0900-\u097F]/.test(q) ? 'hi' : 'en';
    const title = cleanTitle(q);
    let [sum, found] = await Promise.all([wikiSummary(lang, title), wikiSearch(lang, title)]);
    if (!sum || !sum.extract || sum.type === 'disambiguation') {
      sum = null;
      if (found.length) sum = await wikiSummary(lang, found[0].title);
      if (!sum && lang === 'hi') { const en = await wikiSearch('en', title); if (en.length) { sum = await wikiSummary('en', en[0].title); found = en; } }
    }
    const related = found.filter(r => !sum || r.title !== sum.title).slice(0, 5);
    const eq = encodeURIComponent(q);
    const links = `
      <a href="https://www.google.com/search?q=${eq}+site:gov.in" target="_blank" rel="noopener" class="gov-badge">🇮🇳 सरकारी साइटों पर खोजें ↗</a>
      <a href="https://data.gov.in/search?title=${eq}" target="_blank" rel="noopener" class="gov-badge">📊 data.gov.in ↗</a>
      <a href="https://pib.gov.in/" target="_blank" rel="noopener" class="gov-badge">📰 PIB ↗</a>
      <a href="https://www.india.gov.in/" target="_blank" rel="noopener" class="gov-badge">🏛️ India.gov.in ↗</a>`;
    const chips = related.length ? `<div class="fx-chips">${related.map(r => `<button data-q="${esc(r.title)}">${esc(r.title)}</button>`).join('')}</div>` : '';

    if (sum && sum.extract) {
      titleEl.textContent = `📘 ${sum.title}`;
      const img = sum.thumbnail ? `<img src="${esc(sum.thumbnail.source)}" alt="${esc(sum.title)}">` : '';
      bodyEl.style.gridTemplateColumns = img ? '' : '1fr';
      bodyEl.innerHTML = `<div>
          <p style="font-size:1rem;margin-bottom:1rem;">${esc(sum.extract)}</p>
          <div class="gov-links">
            <a href="${esc(sum.content_urls.desktop.page)}" target="_blank" rel="noopener" class="gov-badge">📖 पूरा लेख (Wikipedia) ↗</a>${links}
          </div>${chips}</div>${img}`;
    } else {
      titleEl.textContent = `🔍 "${q}" के लिए परिणाम`;
      bodyEl.innerHTML = `<div><p>सीधा सारांश नहीं मिला। नीचे के लिंक आज़माएँ:</p>
        <div class="gov-links"><a href="https://en.wikipedia.org/w/index.php?search=${eq}" target="_blank" rel="noopener" class="gov-badge">📖 Wikipedia में खोजें ↗</a>${links}</div>${chips}</div>`;
    }
    bodyEl.querySelectorAll('[data-q]').forEach(b => b.onclick = () => window.quickSearch(b.dataset.q));
  };

  /* ---------- वर्ल्ड देशों की सूची (दो स्रोत, ताकि खाली न रहे) ---------- */
  async function loadCountries() {
    const grid = $('countryGrid');
    grid.innerHTML = '<p>देशों की सूची लोड हो रही है…</p>';
    let list = await getJSON('https://restcountries.com/v3.1/all?fields=name,cca3,flags,region,population');
    if (!Array.isArray(list) || list.length < 100) {
      list = null;
      const wb = await getJSON('https://api.worldbank.org/v2/country?format=json&per_page=400');
      if (wb && wb[1]) list = wb[1].filter(c => c.region && c.region.value !== 'Aggregates').map(c => ({
        name: { common: c.name }, cca3: c.id, region: c.region.value, population: 0,
        flags: { png: `https://flagcdn.com/w80/${(c.iso2Code || '').toLowerCase()}.png` } }));
    }
    if (!list) {
      grid.innerHTML = '<div class="fx-empty">सूची लोड नहीं हो पाई। इंटरनेट जाँचें।<br><br><button class="gov-badge" id="fxRetry" style="cursor:pointer">🔄 दोबारा कोशिश करें</button></div>';
      $('fxRetry').onclick = loadCountries; return;
    }
    allCountries = list.sort((a, b) => (b.population || 0) - (a.population || 0) || a.name.common.localeCompare(b.name.common));
    window.filterCountries();
  }
  window.loadAllCountries = loadCountries;

  window.renderCountries = function (list) {
    const grid = $('countryGrid'); grid.innerHTML = '';
    if (!list.length) { grid.innerHTML = '<div class="fx-empty">🔍 कोई देश नहीं मिला। दूसरा नाम लिखकर देखें (जैसे Japan, Brazil)।</div>'; return; }
    const frag = document.createDocumentFragment();
    list.forEach(c => {
      const card = document.createElement('div');
      card.className = 'country-card';
      card.onclick = () => fetchCountryWorldBankData(c);
      const pop = c.population ? `Pop: ${(c.population / 1e6).toFixed(2)}M • ` : '';
      card.innerHTML = `<img src="${esc(c.flags.png)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
        <div><div style="font-weight:600;font-size:.95rem;color:var(--primary);">${esc(c.name.common)}</div>
        <div style="font-size:.8rem;color:#64748b;">${pop}${esc(c.region || '')}</div></div>`;
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  };

  window.filterCountries = function () {
    const q = norm($('countrySearch').value);
    const list = window.allCountries ? allCountries : [];
    window.renderCountries(!q ? list : list.filter(c => norm(c.name.common).includes(q) || norm(c.region || '').includes(q) || norm(c.cca3).includes(q)));
  };

  /* ---------- देश का लाइव डेटा (सबसे नया उपलब्ध मान + 25 साल का ट्रेंड) ---------- */
  let trendChart = null;
  window.fetchCountryWorldBankData = async function (country) {
    const modal = $('countryModal'), body = $('modalBody');
    modal.style.display = 'flex';
    body.innerHTML = `<h3>${esc(country.name.common)} का डेटा लोड हो रहा है…</h3>`;
    const iso3 = country.cca3, base = `https://api.worldbank.org/v2/country/${iso3}/indicator/`;
    const [pop, gr, wk, series] = await Promise.all([
      getJSON(base + 'SP.POP.TOTL?format=json&mrnev=1'), getJSON(base + 'SP.POP.GROW?format=json&mrnev=1'),
      getJSON(base + 'SP.POP.1564.TO.ZS?format=json&mrnev=1'), getJSON(base + 'SP.POP.TOTL?format=json&per_page=40')]);
    const v = d => d && d[1] && d[1][0] && d[1][0].value != null ? d[1][0] : null;
    const p = v(pop), g = v(gr), w = v(wk);
    const latestPop = p ? Number(p.value).toLocaleString() : (country.population ? country.population.toLocaleString() : 'N/A');
    const trend = ((series && series[1]) || []).filter(x => x.value != null).reverse().slice(-25);
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:15px;margin-bottom:1rem;">
        <img src="${esc(country.flags.png)}" style="width:60px;border-radius:6px;border:1px solid #ddd;" alt="">
        <div><h2 style="color:var(--primary);">${esc(country.name.common)}</h2>
        <span style="font-size:.85rem;color:#64748b;">${esc(country.region || '')}${p ? ' | World Bank (' + esc(p.date) + ')' : ''}</span></div>
      </div>
      <div class="kpi-grid" style="grid-template-columns:1fr 1fr;margin-top:1rem;">
        <div class="kpi-card"><div class="kpi-title">कुल जनसंख्या</div><div class="kpi-value" style="font-size:1.3rem;">${latestPop}</div></div>
        <div class="kpi-card saffron"><div class="kpi-title">वृद्धि दर</div><div class="kpi-value" style="font-size:1.3rem;">${g ? Number(g.value).toFixed(2) + '%' : 'N/A'}</div></div>
        <div class="kpi-card green"><div class="kpi-title">कार्य-आयु (15-64)</div><div class="kpi-value" style="font-size:1.3rem;">${w ? Number(w.value).toFixed(1) + '%' : 'N/A'}</div></div>
        <div class="kpi-card"><div class="kpi-title">स्रोत</div><div class="kpi-value" style="font-size:1rem;color:var(--blue);">World Bank API</div></div>
      </div>
      ${trend.length > 2 ? '<div class="fx-trend"><canvas id="fxTrend" height="160"></canvas></div>' : ''}
      <div class="gov-links">
        <a href="https://data.worldbank.org/country/${esc(iso3)}" target="_blank" rel="noopener" class="gov-badge">🌐 पूरा प्रोफ़ाइल ↗</a>
        <button id="fxModalWiki" class="gov-badge" style="cursor:pointer;">📖 जानकारी / Wiki</button>
      </div>`;
    $('fxModalWiki').onclick = () => { window.closeModal(); window.quickSearch(country.name.common); };
    if (trend.length > 2 && window.Chart) {
      if (trendChart) trendChart.destroy();
      trendChart = new Chart($('fxTrend').getContext('2d'), { type: 'line',
        data: { labels: trend.map(x => x.date), datasets: [{ label: 'जनसंख्या', data: trend.map(x => x.value), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.12)', fill: true, tension: .3, pointRadius: 0 }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(0) + 'M' : n } } } } });
    }
  };

  /* ---------- इवेंट: मोबाइल कीबोर्ड पर keyup भरोसेमंद नहीं, इसलिए input/keydown ---------- */
  function wire() {
    const cs = $('countrySearch'); if (cs) cs.addEventListener('input', () => window.filterCountries());
    const sf = $('stateFilter'); if (sf) sf.addEventListener('input', () => window.filterStates());
    const bi = $('bharatSearchInput');
    if (bi) bi.addEventListener('keydown', e => { if (e.key === 'Enter') window.searchBharat(); });
    $('countryModal').addEventListener('click', e => { if (e.target.id === 'countryModal') window.closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') window.closeModal(); });
    const ot = window.switchTab;
    window.switchTab = function (t, b) { ot(t, b); if (t === 'global' && (!window.allCountries || !allCountries.length)) loadCountries(); };
  }

  window.addEventListener('load', () => { wire(); setTimeout(() => { if (!window.allCountries || !allCountries.length) loadCountries(); }, 1500); });
})();
