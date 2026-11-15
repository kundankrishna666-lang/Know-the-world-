/* features.js — सेटिंग्स, बायोमेट्रिक लॉक, अकाउंट, लाइब्रेरी, डाउनलोड, मजबूत सर्च
   पुराना कोड वैसा ही रहता है; यह फ़ाइल उसके ऊपर जुड़ती है। */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const LS = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const API = window.BHARAT_API || ''; // वैकल्पिक: Flask सर्वर का URL (server/app.py)

  /* ---------- उपयोगकर्ता डेटा (अकाउंट के अनुसार) ---------- */
  const emptyData = () => ({ settings: { dark: false, font: 16 }, library: { states: [], countries: [], searches: [] }, history: [] });
  let session = LS.get('fx_session', null);           // {user, token?}
  const key = () => 'fx_data_' + (session ? session.user : 'guest');
  let data = Object.assign(emptyData(), LS.get(key(), {}));
  const save = () => { LS.set(key(), data); pushRemote(); };

  async function sha(text) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  /* ---------- थीम / फ़ॉन्ट ---------- */
  function applySettings() {
    document.body.classList.toggle('fx-dark', !!data.settings.dark);
    document.documentElement.style.fontSize = data.settings.font + 'px';
  }

  /* ---------- सर्वर सिंक (वैकल्पिक) ---------- */
  async function pushRemote() {
    if (!API || !session || !session.token) return;
    try { await fetch(API + '/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.token }, body: JSON.stringify(data) }); } catch (e) {}
  }
  async function pullRemote() {
    if (!API || !session || !session.token) return;
    try {
      const r = await fetch(API + '/api/data', { headers: { Authorization: 'Bearer ' + session.token } });
      if (r.ok) { const d = await r.json(); if (d && d.library) { data = Object.assign(emptyData(), d); LS.set(key(), data); } }
    } catch (e) {}
  }

  /* ---------- UI बनाना ---------- */
  function build() {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="fx-fab">
        <button id="fxLibBtn" title="लाइब्रेरी">📚</button>
        <button id="fxSetBtn" title="सेटिंग्स">⚙️</button>
      </div>
      <div class="fx-panel" id="fxSet"><div class="fx-box"><button class="fx-x" data-close>&times;</button><div id="fxSetBody"></div></div></div>
      <div class="fx-panel" id="fxLib"><div class="fx-box"><button class="fx-x" data-close>&times;</button><div id="fxLibBody"></div></div></div>
      <div id="fxLock"><h1>🔒 Know About Bharat</h1><p>जारी रखने के लिए फ़िंगरप्रिंट / फ़ेस / स्क्रीन-लॉक से पुष्टि करें</p>
        <button class="fx-btn" id="fxUnlock">🔓 अनलॉक करें</button><p class="fx-muted" id="fxLockMsg"></p></div>`);
    document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('.fx-panel').classList.remove('open'));
    document.querySelectorAll('.fx-panel').forEach(p => p.addEventListener('click', e => { if (e.target === p) p.classList.remove('open'); }));
    $('#fxSetBtn').onclick = () => { renderSettings(); $('#fxSet').classList.add('open'); };
    $('#fxLibBtn').onclick = () => { renderLibrary(); $('#fxLib').classList.add('open'); };
  }

  /* ---------- सेटिंग्स ---------- */
  function renderSettings() {
    const bioOn = !!LS.get('fx_bio', null);
    $('#fxSetBody').innerHTML = `
      <h2>⚙️ सेटिंग्स</h2>
      <h3>दिखावट</h3>
      <div class="fx-row"><span>🌙 डार्क मोड</span><input type="checkbox" id="sDark" ${data.settings.dark ? 'checked' : ''}></div>
      <div class="fx-row"><span>🔤 अक्षर का आकार: <b id="sFontV">${data.settings.font}</b>px</span><input type="range" id="sFont" min="13" max="22" value="${data.settings.font}"></div>
      <h3>🔐 बायोमेट्रिक सुरक्षा</h3>
      <div class="fx-row"><span>फ़िंगरप्रिंट / फ़ेस / PIN लॉक <br><span class="fx-muted">इस डिवाइस पर साइट खोलते समय पुष्टि माँगेगा</span></span>
        <button class="fx-btn ${bioOn ? 'red' : 'alt'}" id="sBio">${bioOn ? 'बंद करें' : 'चालू करें'}</button></div>
      <h3>👤 अकाउंट</h3>
      <div id="sAcc"></div>
      <h3>💾 डेटा</h3>
      <div class="fx-row"><button class="fx-btn" id="sDlJson">⬇ JSON डाउनलोड</button><button class="fx-btn alt" id="sDlCsv">⬇ लाइब्रेरी CSV</button>
        <label class="fx-btn ghost" style="cursor:pointer">⬆ इम्पोर्ट<input type="file" id="sImp" accept=".json" hidden></label></div>
      <div class="fx-row"><button class="fx-btn red" id="sClear">🗑 मेरा सारा डेटा मिटाएँ</button></div>`;
    $('#sDark').onchange = e => { data.settings.dark = e.target.checked; applySettings(); save(); };
    $('#sFont').oninput = e => { data.settings.font = +e.target.value; $('#sFontV').textContent = e.target.value; applySettings(); save(); };
    $('#sBio').onclick = async () => { bioOn ? (localStorage.removeItem('fx_bio'), renderSettings()) : await bioRegister(); };
    $('#sDlJson').onclick = () => download('bharat-data-' + (session ? session.user : 'guest') + '.json', JSON.stringify(data, null, 2), 'application/json');
    $('#sDlCsv').onclick = downloadCsv;
    $('#sImp').onchange = importJson;
    $('#sClear').onclick = () => { if (confirm('सारा सेव किया हुआ डेटा मिट जाएगा। पक्का?')) { data = emptyData(); save(); applySettings(); renderSettings(); } };
    renderAccount();
  }

  function renderAccount() {
    const box = $('#sAcc');
    if (session) {
      box.innerHTML = `<div class="fx-row"><span>लॉगिन: <b>${esc(session.user)}</b></span><button class="fx-btn red" id="aOut">लॉगआउट</button></div>`;
      $('#aOut').onclick = () => { session = null; localStorage.removeItem('fx_session'); data = Object.assign(emptyData(), LS.get(key(), {})); applySettings(); renderSettings(); };
    } else {
      box.innerHTML = `<p class="fx-muted">गेस्ट मोड: डेटा सिर्फ़ इसी ब्राउज़र में है। अकाउंट बनाकर अलग-अलग यूज़र का डेटा अलग रखें।</p>
        <input type="text" id="aU" placeholder="यूज़रनेम"><input type="password" id="aP" placeholder="पासवर्ड (कम से कम 6 अक्षर)">
        <div class="fx-row"><button class="fx-btn" id="aIn">लॉगिन</button><button class="fx-btn alt" id="aReg">नया अकाउंट</button></div><p class="fx-muted" id="aMsg"></p>`;
      $('#aReg').onclick = () => auth(true);
      $('#aIn').onclick = () => auth(false);
    }
  }

  async function auth(isNew) {
    const u = $('#aU').value.trim().toLowerCase(), p = $('#aP').value, msg = $('#aMsg');
    if (!u || p.length < 6) { msg.textContent = 'यूज़रनेम और 6+ अक्षर का पासवर्ड डालें'; return; }
    if (API) {                                       // असली सर्वर अकाउंट
      try {
        const r = await fetch(API + (isNew ? '/api/register' : '/api/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
        const j = await r.json();
        if (!r.ok) { msg.textContent = j.error || 'विफल'; return; }
        session = { user: u, token: j.token };
      } catch (e) { msg.textContent = 'सर्वर से कनेक्ट नहीं हो पाया'; return; }
    } else {                                         // सिर्फ़ ब्राउज़र वाला अकाउंट
      const users = LS.get('fx_users', {});
      const salt = users[u] ? users[u].salt : crypto.getRandomValues(new Uint32Array(4)).join('-');
      const hash = await sha(salt + p);
      if (isNew) { if (users[u]) { msg.textContent = 'यह यूज़रनेम पहले से है'; return; } users[u] = { salt, hash }; LS.set('fx_users', users); }
      else if (!users[u] || users[u].hash !== hash) { msg.textContent = 'गलत यूज़रनेम या पासवर्ड'; return; }
      session = { user: u };
    }
    LS.set('fx_session', session);
    await pullRemote();
    data = Object.assign(emptyData(), LS.get(key(), data));
    if (isNew) save();
    applySettings(); renderSettings();
  }

  /* ---------- डाउनलोड / इम्पोर्ट ---------- */
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function downloadCsv() {
    const rows = [['नाम', 'जनसंख्या (करोड़)', 'वृद्धि दर %', 'युवा %', 'बेरोज़गारी %']];
    (data.library.states || []).forEach(n => { const s = (window.indiaStatesData || []).find(x => x.name === n); if (s) rows.push([s.name, s.pop, s.growth, s.youth, s.unemp]); });
    (data.library.countries || []).forEach(c => rows.push([c, '', '', '', '']));
    download('bharat-library.csv', '\ufeff' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n'), 'text/csv');
  }
  function importJson(e) {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { try { const d = JSON.parse(rd.result); if (!d.library) throw 0; data = Object.assign(emptyData(), d); save(); applySettings(); renderSettings(); alert('इम्पोर्ट सफल ✅'); } catch (x) { alert('फ़ाइल सही नहीं है'); } };
    rd.readAsText(f);
  }

  /* ---------- बायोमेट्रिक (WebAuthn) ---------- */
  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function bioRegister() {
    if (!window.PublicKeyCredential) { alert('यह ब्राउज़र/डिवाइस बायोमेट्रिक सपोर्ट नहीं करता'); return; }
    try {
      const cred = await navigator.credentials.create({ publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Know About Bharat' },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: session ? session.user : 'guest', displayName: session ? session.user : 'Guest' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000 } });
      LS.set('fx_bio', { id: b64(cred.rawId) });
      alert('बायोमेट्रिक लॉक चालू ✅');
      renderSettings();
    } catch (e) { alert('चालू नहीं हो पाया: ' + (e.message || e)); }
  }
  async function bioCheck() {
    try {
      await navigator.credentials.get({ publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: unb64(LS.get('fx_bio').id) }],
        userVerification: 'required', timeout: 60000 } });
      $('#fxLock').classList.remove('on'); sessionStorage.setItem('fx_ok', '1');
    } catch (e) { $('#fxLockMsg').textContent = 'पुष्टि नहीं हुई, दोबारा कोशिश करें'; }
  }
  function lockIfNeeded() {
    if (LS.get('fx_bio', null) && !sessionStorage.getItem('fx_ok')) { $('#fxLock').classList.add('on'); bioCheck(); }
  }

  /* ---------- लाइब्रेरी ---------- */
  function renderLibrary() {
    const L = data.library;
    const list = (arr, fn, empty) => arr.length ? arr.map(fn).join('') : `<p class="fx-muted">${empty}</p>`;
    $('#fxLibBody').innerHTML = `
      <h2>📚 मेरी लाइब्रेरी</h2>
      <h3>⭐ सेव किए राज्य / UT</h3>
      ${list(L.states, n => `<div class="fx-item"><span class="lnk" data-state="${esc(n)}">${esc(n)}</span><button class="fx-btn red" data-rm="states|${esc(n)}">✖</button></div>`, 'अभी कुछ नहीं। किसी राज्य को खोलकर ⭐ दबाएँ।')}
      <h3>🌍 सेव किए देश</h3>
      ${list(L.countries, n => `<div class="fx-item"><span class="lnk" data-search="${esc(n)}">${esc(n)}</span><button class="fx-btn red" data-rm="countries|${esc(n)}">✖</button></div>`, 'अभी कुछ नहीं।')}
      <h3>🔖 सेव की खोजें</h3>
      ${list(L.searches, n => `<div class="fx-item"><span class="lnk" data-search="${esc(n)}">${esc(n)}</span><button class="fx-btn red" data-rm="searches|${esc(n)}">✖</button></div>`, 'सर्च के बाद 🔖 दबाएँ।')}
      <h3>🕘 हाल की खोजें</h3>
      ${list(data.history.slice(0, 10), n => `<div class="fx-item"><span class="lnk" data-search="${esc(n)}">${esc(n)}</span></div>`, 'कोई इतिहास नहीं।')}`;
    $('#fxLibBody').onclick = e => {
      const t = e.target;
      if (t.dataset.rm) { const [k, v] = t.dataset.rm.split('|'); data.library[k] = data.library[k].filter(x => x !== v); save(); renderLibrary(); }
      else if (t.dataset.state) { $('#fxLib').classList.remove('open'); window.selectState(t.dataset.state); }
      else if (t.dataset.search) { $('#fxLib').classList.remove('open'); window.quickSearch(t.dataset.search); }
    };
  }
  function addLib(kind, v) {
    if (!data.library[kind].includes(v)) { data.library[kind].unshift(v); save(); }
    alert('लाइब्रेरी में सेव हो गया ✅');
  }

  /* ---------- मजबूत सर्च ---------- */
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\u0900-\u097f ]/g, '');
  function lev(a, b) {                               // गलत स्पेलिंग पकड़ने के लिए
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[n];
  }
  const TOPICS = ['ISRO', 'Indian Economy', 'Indian Constitution', 'Digital India', 'Make in India', 'Ayushman Bharat', 'Swachh Bharat', 'Mughal Empire', 'Indian Independence Movement', 'Taj Mahal', 'Ganga River', 'Himalayas', 'Census of India', 'Demographics of India', 'Indian Railways', 'Chandrayaan', 'Aryabhata', 'Ashoka'];
  const ALIAS = { 'उत्तर प्रदेश': 'Uttar Pradesh', 'बिहार': 'Bihar', 'महाराष्ट्र': 'Maharashtra', 'दिल्ली': 'Delhi (NCT)', 'केरल': 'Kerala', 'गुजरात': 'Gujarat', 'राजस्थान': 'Rajasthan', 'पंजाब': 'Punjab', 'बंगाल': 'West Bengal', 'तमिलनाडु': 'Tamil Nadu' };

  function suggestions(q) {
    const nq = norm(q); if (!nq) return [];
    const pool = [];
    (window.indiaStatesData || []).forEach(s => pool.push({ label: s.name, type: 'state' }));
    (window.allCountries || []).forEach(c => pool.push({ label: c.name.common, type: 'country' }));
    TOPICS.forEach(t => pool.push({ label: t, type: 'topic' }));
    Object.keys(ALIAS).forEach(h => pool.push({ label: h, type: 'state', real: ALIAS[h] }));
    return pool.map(p => {
      const n = norm(p.label); let score = 99;
      if (n.startsWith(nq)) score = 0; else if (n.includes(nq)) score = 1;
      else { const d = lev(nq, n.slice(0, nq.length + 1)); if (d <= Math.max(1, Math.floor(nq.length / 4))) score = 2 + d; }
      return Object.assign({ score }, p);
    }).filter(p => p.score < 99).sort((a, b) => a.score - b.score).slice(0, 8);
  }

  function setupSearch() {
    const input = $('#bharatSearchInput'); if (!input) return;
    const box = document.createElement('div'); box.id = 'fxSuggest';
    input.closest('.search-wrapper').appendChild(box);
    let items = [], idx = -1;
    const hide = () => { box.style.display = 'none'; idx = -1; };
    const pick = it => {
      hide();
      if (it.type === 'state') { input.value = it.real || it.label; window.selectState(it.real || it.label); window.quickSearch(it.real || it.label); }
      else { window.quickSearch(it.label); }
    };
    input.addEventListener('input', () => {
      items = suggestions(input.value);
      const hist = !input.value ? data.history.slice(0, 6).map(h => ({ label: h, type: '🕘' })) : [];
      items = items.length ? items : hist;
      box.innerHTML = items.map((it, i) => `<div data-i="${i}">${esc(it.label)}<small>${esc(it.type)}</small></div>`).join('');
      box.style.display = items.length ? 'block' : 'none';
    });
    input.addEventListener('focus', () => input.dispatchEvent(new Event('input')));
    input.addEventListener('keydown', e => {
      const els = box.querySelectorAll('div');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % Math.max(els.length, 1); els.forEach((x, i) => x.classList.toggle('sel', i === idx)); }
      else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); pick(items[idx]); }
      else if (e.key === 'Escape') hide();
    });
    box.addEventListener('mousedown', e => { const d = e.target.closest('div[data-i]'); if (d) { e.preventDefault(); pick(items[+d.dataset.i]); } });
    document.addEventListener('click', e => { if (!e.target.closest('.search-wrapper')) hide(); });
    document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); } });

    // मूल searchBharat को बदले बिना उसके चारों ओर लपेटना (इतिहास सेव + 🔖 बटन)
    const orig = window.searchBharat;
    window.searchBharat = function () {
      const q = input.value.trim();
      if (q) { data.history = [q, ...data.history.filter(x => x !== q)].slice(0, 30); save(); }
      hide();
      return orig.apply(this, arguments);
    };
  }

  /* ---------- मौजूदा पेज में ⭐ बटन जोड़ना ---------- */
  function setupObservers() {
    const info = $('#selectedStateInfo');
    if (info) new MutationObserver(() => {
      if (info.querySelector('.fx-save')) return;
      const h = info.querySelector('h3'); if (!h) return;
      const name = h.textContent.replace(/\s*\(.*\)\s*$/, '').trim();
      const b = document.createElement('button'); b.className = 'gov-badge fx-save'; b.textContent = '⭐ लाइब्रेरी में सेव';
      b.onclick = () => addLib('states', (window.indiaStatesData.find(s => h.textContent.startsWith(s.name)) || { name }).name);
      (info.querySelector('.gov-links') || info).appendChild(b);
    }).observe(info, { childList: true });
    const mb = $('#modalBody');
    if (mb) new MutationObserver(() => {
      if (mb.querySelector('.fx-save')) return;
      const h = mb.querySelector('h2'), links = mb.querySelector('.gov-links'); if (!h || !links) return;
      const b = document.createElement('button'); b.className = 'gov-badge fx-save'; b.textContent = '⭐ सेव';
      b.onclick = () => addLib('countries', h.textContent.trim()); links.appendChild(b);
    }).observe(mb, { childList: true });
    const sb = $('#searchBody');
    if (sb) new MutationObserver(() => {
      const links = sb.querySelector('.gov-links'); if (!links || links.querySelector('.fx-save')) return;
      const b = document.createElement('button'); b.className = 'gov-badge fx-save'; b.textContent = '🔖 खोज सेव करें';
      b.onclick = () => addLib('searches', $('#bharatSearchInput').value.trim()); links.appendChild(b);
    }).observe(sb, { childList: true });
  }

  /* ---------- शुरुआत ---------- */
  function init() {
    // पुराने कोड के const/let को window पर उपलब्ध कराना (सिर्फ़ पढ़ने के लिए)
    try { window.indiaStatesData = indiaStatesData; } catch (e) {}
    try { Object.defineProperty(window, 'allCountries', { get: () => allCountries, configurable: true }); } catch (e) {}
    build(); applySettings(); setupSearch(); setupObservers(); lockIfNeeded(); pullRemote().then(applySettings);
  }
  window.addEventListener('load', () => setTimeout(init, 0));
})();
