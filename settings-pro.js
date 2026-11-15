/* settings-pro.js — आधुनिक सेटिंग्स: दिखावट, होम, सर्च, सुरक्षा, अकाउंट, डेटा, जानकारी
   features.js के बाद लोड करें। */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const DEF = { theme: 'system', accent: '#2563eb', font: 16, density: 'comfortable', motion: true, startTab: 'india', showKpi: true, showChart: true, saveHistory: true, suggest: true };
  const ACCENTS = [['#2563eb', 'नीला'], ['#f97316', 'केसरिया'], ['#16a34a', 'हरा'], ['#7c3aed', 'बैंगनी'], ['#e11d48', 'गुलाबी']];
  const SECTIONS = [['look', '🎨', 'दिखावट'], ['home', '🏠', 'होम'], ['search', '🔎', 'सर्च'], ['sec', '🔐', 'सुरक्षा'], ['acc', '👤', 'अकाउंट'], ['data', '💾', 'डेटा'], ['about', 'ℹ️', 'जानकारी']];
  let cur = 'look';

  const st = () => Object.assign({}, DEF, FX.data().settings);
  function put(k, v) { FX.data().settings[k] = v; FX.save(); applyPro(); }

  function applyPro() {
    const s = st();
    const dark = s.theme === 'dark' || (s.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    FX.data().settings.dark = dark;
    if (s.font) FX.data().settings.font = s.font;
    FX.applySettings();
    document.documentElement.style.setProperty('--blue', s.accent);
    const b = document.body.classList;
    b.toggle('fx-compact', s.density === 'compact');
    b.toggle('fx-nomotion', !s.motion);
    b.toggle('fx-hide-kpi', !s.showKpi);
    b.toggle('fx-hide-chart', !s.showChart);
  }

  /* ---- छोटे बिल्डर ---- */
  const toggle = (k, t, d) => `<div class="sp-row"><div>${t}${d ? `<small>${d}</small>` : ''}</div>
    <label class="sp-sw"><input type="checkbox" data-k="${k}" ${st()[k] ? 'checked' : ''}><span></span></label></div>`;
  const seg = (k, t, opts) => `<div class="sp-row"><div>${t}</div><div class="sp-seg">${opts.map(([v, l]) => `<button data-seg="${k}" data-v="${v}" class="${st()[k] === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;

  function draw() {
    const s = st(), main = $('#spMain'), user = FX.session();
    const bio = !!FX.LS.get('fx_bio', null);
    const hist = (FX.data().history || []).length;
    const P = {
      look: `<h3>🎨 दिखावट</h3>
        ${seg('theme', 'थीम', [['system', '🖥 सिस्टम'], ['light', '☀️ लाइट'], ['dark', '🌙 डार्क']])}
        <div class="sp-row"><div>मुख्य रंग</div><div class="sp-sw-col">${ACCENTS.map(([c, n]) => `<button title="${n}" data-acc="${c}" class="${s.accent === c ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div></div>
        <div class="sp-row"><div>अक्षर का आकार: <b id="spFv">${s.font}</b>px</div><input type="range" min="13" max="22" value="${s.font}" data-k="font"></div>
        ${seg('density', 'डेंसिटी', [['comfortable', 'आरामदायक'], ['compact', 'कॉम्पैक्ट']])}
        ${toggle('motion', 'एनिमेशन', 'बंद करने पर पेज हल्का और तेज़ चलेगा')}
        <div class="sp-row"><span></span><button class="fx-btn ghost" data-act="resetLook">↺ दिखावट रीसेट</button></div>`,
      home: `<h3>🏠 होम पेज</h3>
        ${seg('startTab', 'खुलते ही कौन सा टैब', [['india', '🇮🇳 भारत'], ['global', '🌍 दुनिया']])}
        ${toggle('showKpi', 'ऊपर के सारांश कार्ड दिखाएँ')}
        ${toggle('showChart', 'राज्यों का चार्ट दिखाएँ')}`,
      search: `<h3>🔎 सर्च</h3>
        ${toggle('suggest', 'टाइप करते समय सुझाव', 'राज्य, देश और विषयों के सुझाव')}
        ${toggle('saveHistory', 'खोज का इतिहास सेव करें')}
        <div class="sp-row"><div>सेव किया इतिहास: <b>${hist}</b> खोजें</div><button class="fx-btn red" data-act="clearHist">🗑 इतिहास मिटाएँ</button></div>
        <p class="fx-muted" style="margin-top:10px">टिप: कीबोर्ड पर <b>/</b> दबाते ही सर्च बार खुल जाता है।</p>`,
      sec: `<h3>🔐 सुरक्षा</h3>
        <div class="sp-row"><div>बायोमेट्रिक लॉक<small>${bio ? 'चालू है: साइट खोलते समय फ़िंगरप्रिंट/फ़ेस/स्क्रीन-लॉक माँगेगा' : 'बंद है'}</small></div>
          ${bio ? '<button class="fx-btn red" data-act="bioOff">बंद करें</button>' : '<button class="fx-btn alt" data-act="bioOn">चालू करें</button>'}</div>
        <p class="fx-muted" style="margin-top:10px">यह लॉक सिर्फ़ इसी डिवाइस पर काम करता है। HTTPS साइट (जैसे GitHub Pages) ज़रूरी है।</p>`,
      acc: `<h3>👤 अकाउंट</h3><div id="sAcc"></div>
        <p class="fx-muted" style="margin-top:10px">${user ? 'आपकी लाइब्रेरी, सेटिंग्स और इतिहास इस अकाउंट के नाम से सेव होते हैं।' : 'गेस्ट मोड में डेटा सिर्फ़ इसी ब्राउज़र में रहता है।'}</p>`,
      data: `<h3>💾 डेटा</h3>
        <div class="sp-row"><div>सारा डेटा डाउनलोड<small>सेटिंग्स + लाइब्रेरी + इतिहास (JSON)</small></div><button class="fx-btn" data-act="dlJson">⬇ JSON</button></div>
        <div class="sp-row"><div>लाइब्रेरी की तालिका<small>Excel में खुलने वाली CSV</small></div><button class="fx-btn alt" data-act="dlCsv">⬇ CSV</button></div>
        <div class="sp-row"><div>बैकअप वापस लाएँ</div><label class="fx-btn ghost" style="cursor:pointer">⬆ इम्पोर्ट<input type="file" id="spImp" accept=".json" hidden></label></div>
        <div class="sp-row"><div>सब कुछ मिटाएँ<small>यह वापस नहीं आएगा</small></div><button class="fx-btn red" data-act="wipe">🗑 मिटाएँ</button></div>`,
      about: `<h3>ℹ️ जानकारी</h3>
        <div class="sp-row"><div>Know About Bharat<small>जनसंख्या डैशबोर्ड: भारत, राज्य/UT और दुनिया के देश</small></div></div>
        <div class="sp-row"><div>डेटा स्रोत<small>MoSPI, Census India, data.gov.in, World Bank, Wikipedia</small></div></div>
        <div class="sp-row"><div>शॉर्टकट<small><b>/</b> सर्च खोलें &nbsp; <b>Esc</b> बंद करें</small></div></div>`
    };
    main.innerHTML = P[cur];
    document.querySelectorAll('.sp-nav button').forEach(b => b.classList.toggle('on', b.dataset.sec === cur));
    if (cur === 'acc') FX.renderAccount();
    const imp = $('#spImp'); if (imp) imp.onchange = FX.importJson;
  }

  window.FX_renderSettings = function () {
    const box = $('#fxSet .fx-box'); if (box) box.classList.add('pro');
    $('#fxSetBody').innerHTML = `<h2>⚙️ सेटिंग्स</h2><div class="sp-wrap">
      <nav class="sp-nav">${SECTIONS.map(([id, ic, n]) => `<button data-sec="${id}">${ic} ${n}</button>`).join('')}</nav>
      <div class="sp-main" id="spMain"></div></div>`;
    $('.sp-nav').onclick = e => { const b = e.target.closest('[data-sec]'); if (b) { cur = b.dataset.sec; draw(); } };
    const main = $('#spMain');
    main.addEventListener('change', e => {
      const k = e.target.dataset.k; if (!k) return;
      if (e.target.type === 'checkbox') { put(k, e.target.checked); if (k === 'saveHistory' || k === 'suggest') return; }
    });
    main.addEventListener('input', e => { if (e.target.dataset.k === 'font') { $('#spFv').textContent = e.target.value; put('font', +e.target.value); } });
    main.addEventListener('click', async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.seg) { put(t.dataset.seg, t.dataset.v); draw(); if (t.dataset.seg === 'startTab') {} return; }
      if (t.dataset.acc) { put('accent', t.dataset.acc); draw(); return; }
      const a = t.dataset.act; if (!a) return;
      const name = 'bharat-' + (FX.session() ? FX.session().user : 'guest');
      if (a === 'resetLook') { ['theme', 'accent', 'font', 'density', 'motion'].forEach(k => FX.data().settings[k] = DEF[k]); FX.save(); applyPro(); draw(); }
      else if (a === 'clearHist') { FX.data().history = []; FX.save(); draw(); }
      else if (a === 'bioOn') await FX.bioRegister();
      else if (a === 'bioOff') { FX.bioRemove(); draw(); }
      else if (a === 'dlJson') FX.download(name + '.json', JSON.stringify(FX.data(), null, 2), 'application/json');
      else if (a === 'dlCsv') FX.downloadCsv();
      else if (a === 'wipe' && confirm('सारा सेव किया हुआ डेटा मिट जाएगा। पक्का?')) { FX.reset(); applyPro(); draw(); }
    });
    draw();
  };

  function init() {
    if (!window.FX) return setTimeout(init, 150);
    applyPro();
    const s = st();
    if (s.startTab === 'global') { const t = document.querySelectorAll('.tab-btn')[1]; if (t && !sessionStorage.getItem('sp_tab')) { t.click(); sessionStorage.setItem('sp_tab', '1'); } }
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (st().theme === 'system') applyPro(); });
  }
  window.addEventListener('load', () => setTimeout(init, 100));
})();
