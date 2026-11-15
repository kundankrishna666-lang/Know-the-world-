/* search-pro.js — ऊपर वाले "Search Bharat" बार का मज़बूत संस्करण
   अकेली फ़ाइल है: fixes.js न भी चले तब भी काम करेगी। पुराना कोड वैसा ही रहता है। */
(function () {
  'use strict';
  if (window.__fxSearchPro) return;
  window.__fxSearchPro = true;
  console.log('[search-pro] loaded');

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).toLowerCase().trim();

  // "(UT)", "(NCT)" जैसे नाम Wikipedia में नहीं मिलते, इसलिए ठीक करना
  const FIX = {
    'delhi (nct)': 'Delhi', 'jammu & kashmir (ut)': 'Jammu and Kashmir (union territory)',
    'dadra & nagar haveli and daman & diu (ut)': 'Dadra and Nagar Haveli and Daman and Diu',
    'andaman & nicobar islands (ut)': 'Andaman and Nicobar Islands', 'puducherry (ut)': 'Puducherry',
    'chandigarh (ut)': 'Chandigarh', 'ladakh (ut)': 'Ladakh', 'lakshadweep (ut)': 'Lakshadweep', 'bharat': 'India'
  };
  const clean = q => FIX[norm(q)] || q.replace(/\s*\((UT|NCT)\)\s*$/i, '').replace(/&/g, 'and');

  async function getJSON(url, ms = 12000) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
    try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) return null; return await r.json(); }
    catch (e) { console.warn('[search-pro] fetch failed', e); return null; }
    finally { clearTimeout(t); }
  }

  // एक ही कॉल में लेख का सारांश + फोटो + लिंक (Wikipedia Action API)
  async function wikiPages(lang, q) {
    const u = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=6` +
      `&prop=extracts|pageimages|info&exintro=1&explaintext=1&exsentences=6&exlimit=max&piprop=thumbnail&pithumbsize=400&inprop=url`;
    const d = await getJSON(u);
    const pages = d && d.query && d.query.pages;
    return pages ? Object.values(pages).sort((a, b) => a.index - b.index) : [];
  }
  // बैकअप: सीधा सारांश
  async function wikiSummary(lang, t) {
    const d = await getJSON(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, '_'))}?redirect=true`);
    return d && d.extract ? { title: d.title, extract: d.extract, fullurl: d.content_urls && d.content_urls.desktop.page, thumbnail: d.thumbnail } : null;
  }

  const AC = () => (typeof allCountries !== 'undefined' && Array.isArray(allCountries)) ? allCountries : [];
  let skipCountry = false, lastQ = '', lastT = 0;

  window.quickSearch = function (term) {
    $('bharatSearchInput').value = term;
    skipCountry = true;
    window.searchBharat();
  };

  window.searchBharat = async function () {
    const q = $('bharatSearchInput').value.trim();
    if (!q) return;
    const now = Date.now();
    if (q === lastQ && now - lastT < 700) return;     // कीबोर्ड से डबल-ट्रिगर रोकना
    lastQ = q; lastT = now;

    // वर्ल्ड टैब पर देश का नाम हो तो उसका लाइव डेटा
    const g = $('globalSection');
    if (g && g.style.display === 'block' && !skipCountry && AC().length && typeof fetchCountryWorldBankData === 'function') {
      const nq = norm(q);
      const hit = AC().find(c => norm(c.name.common) === nq);
      if (hit) { fetchCountryWorldBankData(hit); return; }
    }
    skipCountry = false;

    const section = $('searchResultSection'), titleEl = $('searchTitle'), bodyEl = $('searchBody');
    section.style.display = 'block';
    titleEl.textContent = `खोज रहे हैं: "${q}" …`;
    bodyEl.style.gridTemplateColumns = '1fr';
    bodyEl.innerHTML = '<p>⏳ जानकारी ला रहे हैं…</p>';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const eq = encodeURIComponent(q);
    const links = `
      <a href="https://www.google.com/search?q=${eq}+site:gov.in" target="_blank" rel="noopener" class="gov-badge">🇮🇳 सरकारी साइटों पर खोजें ↗</a>
      <a href="https://data.gov.in/search?title=${eq}" target="_blank" rel="noopener" class="gov-badge">📊 data.gov.in ↗</a>
      <a href="https://pib.gov.in/" target="_blank" rel="noopener" class="gov-badge">📰 PIB ↗</a>
      <a href="https://www.india.gov.in/" target="_blank" rel="noopener" class="gov-badge">🏛️ India.gov.in ↗</a>`;

    try {
      const lang = /[\u0900-\u097F]/.test(q) ? 'hi' : 'en';
      const title = clean(q);
      let pages = await wikiPages(lang, title);
      if (!pages.length && lang === 'hi') pages = await wikiPages('en', title);
      let main = pages.find(p => norm(p.title) === norm(title)) || pages[0];
      if (main && !main.extract) main = null;
      if (!main) { const s = await wikiSummary(lang, title); if (s) main = s; }
      const related = pages.filter(p => !main || p.title !== main.title).slice(0, 5);
      const chips = related.length ? `<div class="fx-chips" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:1rem">${related.map(r => `<button data-q="${esc(r.title)}" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:20px;padding:5px 12px;font-size:.8rem;cursor:pointer">${esc(r.title)}</button>`).join('')}</div>` : '';

      if (main) {
        titleEl.textContent = `📘 ${main.title}`;
        const img = main.thumbnail ? `<img src="${esc(main.thumbnail.source)}" alt="${esc(main.title)}">` : '';
        bodyEl.style.gridTemplateColumns = img ? '' : '1fr';
        const wurl = main.fullurl || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(main.title.replace(/ /g, '_'))}`;
        bodyEl.innerHTML = `<div>
          <p style="font-size:1rem;margin-bottom:1rem;white-space:pre-line">${esc(main.extract)}</p>
          <div class="gov-links"><a href="${esc(wurl)}" target="_blank" rel="noopener" class="gov-badge">📖 पूरा लेख (Wikipedia) ↗</a>${links}</div>${chips}</div>${img}`;
      } else {
        titleEl.textContent = `🔍 "${q}" के लिए सीधा सारांश नहीं मिला`;
        bodyEl.innerHTML = `<div><p>Wikipedia पर इस नाम का लेख नहीं मिला, या इंटरनेट/ब्राउज़र ने अनुरोध रोक दिया। नीचे के लिंक आज़माएँ:</p>
          <div class="gov-links"><a href="https://en.wikipedia.org/w/index.php?search=${eq}" target="_blank" rel="noopener" class="gov-badge">📖 Wikipedia में खोजें ↗</a>${links}
          <button class="gov-badge" id="spRetry" style="cursor:pointer">🔄 दोबारा कोशिश</button></div></div>`;
        const r = $('spRetry'); if (r) r.onclick = () => { lastT = 0; window.searchBharat(); };
      }
      bodyEl.querySelectorAll('[data-q]').forEach(b => b.onclick = () => window.quickSearch(b.dataset.q));
    } catch (err) {
      console.error('[search-pro]', err);
      titleEl.textContent = '⚠️ खोज में दिक्कत';
      bodyEl.innerHTML = `<p>कुछ गड़बड़ हुई: ${esc(err.message || err)}</p><div class="gov-links">${links}</div>`;
    }
  };

  // मोबाइल कीबोर्ड पर Enter भरोसेमंद पकड़ने के लिए
  window.addEventListener('load', () => {
    const bi = $('bharatSearchInput');
    if (bi) bi.addEventListener('keydown', e => { if (e.key === 'Enter') window.searchBharat(); });
  });
})();
