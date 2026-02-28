// Logika aplikacji
const {
  TABS,
  STEP_NAMES,
  HM_HINTS,
  COMPLETION_CHECKS,
  VALIDATION_CONFIG
} = window.APP_DATA;

// ── GLOBAL STATE ──


let sidebarOpen = true;
let summaryOpen = false;
let summaryCompact = false;
let currentTab = 't1';
let activeTipBtn = null;
let summaryCloseTimer = null;
const themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applyAutoTheme(event){
  const prefersDark = typeof event?.matches === 'boolean' ? event.matches : themeMediaQuery.matches;
  document.body.classList.toggle('theme-dark', prefersDark);
}

function setTheme(mode){
  const themeMode = mode === 'dark' || mode === 'auto' ? mode : 'light';
  themeMediaQuery.removeEventListener('change', applyAutoTheme);

  if(themeMode === 'auto'){
    applyAutoTheme();
    themeMediaQuery.addEventListener('change', applyAutoTheme);
  } else {
    document.body.classList.toggle('theme-dark', themeMode === 'dark');
  }

  document.getElementById('themeLightBtn').classList.toggle('active', themeMode === 'light');
  document.getElementById('themeDarkBtn').classList.toggle('active', themeMode === 'dark');
  document.getElementById('themeAutoBtn').classList.toggle('active', themeMode === 'auto');
  localStorage.setItem('rf-theme', themeMode);
}

function initTheme(){
  const saved = localStorage.getItem('rf-theme');
  const initial = saved === 'dark' || saved === 'auto' ? saved : 'light';
  setTheme(initial);
}

function getTipText(btn){
  const popup = btn.querySelector('.tip-popup');
  return popup ? popup.textContent.trim() : '';
}

function updateTipAria(btn, expanded){
  const hasText = !!getTipText(btn);
  btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  btn.setAttribute('aria-label', expanded ? 'Ukryj podpowiedź' : (hasText ? `Pokaż podpowiedź: ${getTipText(btn)}` : 'Pokaż podpowiedź'));
}

function showGlobalTip(btn){
  const tipEl = document.getElementById('globalTip');
  const text = getTipText(btn);
  if(!tipEl || !text) return;
  const popup = btn.querySelector('.tip-popup');
  if(!popup) return;

  if(activeTipBtn && activeTipBtn !== btn) hideGlobalTip(activeTipBtn, false);

  tipEl.textContent = text;
  const rect = btn.getBoundingClientRect();
  const top = rect.bottom + 8;
  const left = Math.min(Math.max(rect.left + rect.width / 2, 12), window.innerWidth - 12);

  tipEl.style.top = `${top}px`;
  tipEl.style.left = `${left}px`;
  tipEl.style.transform = 'translate(-50%, 0)';
  tipEl.classList.add('visible');
  tipEl.setAttribute('aria-hidden', 'false');

  btn.setAttribute('aria-describedby', 'globalTip');
  updateTipAria(btn, true);
  activeTipBtn = btn;
}

function hideGlobalTip(btn = activeTipBtn, clearActive = true){
  const tipEl = document.getElementById('globalTip');
  if(!tipEl || !btn) return;
  tipEl.classList.remove('visible');
  tipEl.setAttribute('aria-hidden', 'true');
  btn.removeAttribute('aria-describedby');
  updateTipAria(btn, false);
  if(clearActive && activeTipBtn === btn) activeTipBtn = null;
}

function initGlobalTooltips(){
  const tipEl = document.getElementById('globalTip');
  if(!tipEl) return;
  tipEl.setAttribute('role', 'tooltip');

  document.querySelectorAll('.tip-btn').forEach(btn=>{
    if(btn.tabIndex < 0) btn.tabIndex = 0;
    btn.setAttribute('role', 'button');
    updateTipAria(btn, false);

    btn.addEventListener('mouseenter', ()=>showGlobalTip(btn));
    btn.addEventListener('focus', ()=>showGlobalTip(btn));

    btn.addEventListener('mouseleave', ()=>{
      if(activeTipBtn === btn) hideGlobalTip(btn);
    });
    btn.addEventListener('blur', ()=>{
      if(activeTipBtn === btn) hideGlobalTip(btn);
    });

    btn.addEventListener('click', e=>{
      e.preventDefault();
      if(activeTipBtn === btn) hideGlobalTip(btn);
      else showGlobalTip(btn);
    });

    btn.addEventListener('keydown', e=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        showGlobalTip(btn);
      }
      if(e.key === 'Escape'){
        e.preventDefault();
        hideGlobalTip(btn);
        btn.blur();
      }
    });
  });

  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape' && activeTipBtn){
      hideGlobalTip(activeTipBtn);
    }
  });

  window.addEventListener('resize', ()=>{
    if(activeTipBtn) showGlobalTip(activeTipBtn);
  });

  window.addEventListener('scroll', ()=>{
    if(activeTipBtn) showGlobalTip(activeTipBtn);
  }, true);
}

// ── SIDEBAR TOGGLE ──
function toggleSidebar(){
  sidebarOpen = !sidebarOpen;
  document.body.classList.toggle('body-sidebar-collapsed', !sidebarOpen);
}

// ── MOBILE ──
function openMobileMenu(){
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('mobileOverlay').classList.add('open');
}
function closeMobileMenu(){
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('mobileOverlay').classList.remove('open');
}


function initSummaryCompact(){
  summaryCompact = localStorage.getItem('rf-summary-compact') === '1';
  const compactToggle = document.getElementById('summaryCompactToggle');
  if(compactToggle) compactToggle.checked = summaryCompact;
}

function syncSummaryVisibilityState(){
  document.body.classList.remove('body-summary-open','body-summary-closing');
  document.querySelectorAll('[data-summary-toggle]').forEach(btn=>btn.classList.remove('active'));
  const panel = document.getElementById('summaryPanel');
  if(panel) panel.setAttribute('aria-hidden', summaryOpen ? 'false' : 'true');
}

function setSummaryCompact(nextState){
  summaryCompact = !!nextState;
  localStorage.setItem('rf-summary-compact', summaryCompact ? '1' : '0');
  const compactToggle = document.getElementById('summaryCompactToggle');
  if(compactToggle) compactToggle.checked = summaryCompact;
  buildSummaryPanel();
}

function toggleSummarySection(sectionId){
  const section = document.getElementById(sectionId);
  if(!section) return;
  section.classList.toggle('collapsed');
}

// ── SUMMARY PANEL ──
function toggleSummary(forceState){
  const nextState = typeof forceState === 'boolean' ? forceState : !summaryOpen;
  if(nextState === summaryOpen) return;

  if(summaryCloseTimer){
    clearTimeout(summaryCloseTimer);
    summaryCloseTimer = null;
  }

  if(nextState){
    summaryOpen = true;
    document.body.classList.remove('body-summary-closing');
    document.body.classList.add('body-summary-open');
    document.querySelectorAll('[data-summary-toggle]').forEach(btn=>btn.classList.add('active'));
    document.getElementById('summaryPanel')?.setAttribute('aria-hidden','false');
    buildSummaryPanel();
    return;
  }

  summaryOpen = false;
  document.body.classList.remove('body-summary-open');
  document.body.classList.add('body-summary-closing');
  document.querySelectorAll('[data-summary-toggle]').forEach(btn=>btn.classList.remove('active'));
  document.getElementById('summaryPanel')?.setAttribute('aria-hidden','true');
  summaryCloseTimer = setTimeout(()=>{
    document.body.classList.remove('body-summary-closing');
    summaryCloseTimer = null;
  }, 220);
}

// ── TAB SWITCHING ──
function switchTab(id, btn){
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(btn) btn.classList.add('active');
  currentTab = id;
  const idx = parseInt(id.replace('t','')) - 1;
  document.getElementById('footerStep').textContent = String(idx+1).padStart(2,'0');
  document.getElementById('footerStepName').textContent = STEP_NAMES[idx];
  document.querySelector('.tab-content').scrollTop = 0;
  closeMobileMenu();
  scheduleUpdate();
}
function goTab(id){
  const btn = document.querySelector(`[data-tab="${id}"]`);
  switchTab(id, btn);
}

function goToField(tabId, fieldId){
  if(!tabId) return;
  goTab(tabId);
  if(summaryOpen) toggleSummary(false);
  requestAnimationFrame(()=>{
    const field = fieldId ? document.getElementById(fieldId) : null;
    if(field){
      field.focus({preventScroll:false});
      if(typeof field.scrollIntoView === 'function') field.scrollIntoView({behavior:'smooth', block:'center'});
    }
  });
}

// ── CARD COLLAPSE ──
function toggleCard(head){
  const card = head.closest('.card');
  card.classList.toggle('collapsed');
}

// ── HF ZONE COLLAPSE ──
function toggleHF(head){
  const zone = head.closest('.hf-zone');
  zone.classList.toggle('hf-collapsed');
}

// ── SQL FIELDS ──
function toggleSqlFields(){
  const v = document.getElementById('sqlType').value;
  document.getElementById('sqlObjField').style.display = (v && v!=='query') ? '' : 'none';
  document.getElementById('sqlInlineField').style.display = v==='query' ? '' : 'none';
}

// ── HEADER MODE ──

function setHM(m){ document.getElementById('hmHint').innerHTML = `<i class="bi bi-info-circle"></i>${HM_HINTS[m]}`; }

// ── REMOVE ROW ──
function removeRow(btn){
  const tr = btn.closest('tr'), tb = tr.closest('tbody');
  tr.remove(); renumber(tb);
  scheduleUpdate();
}
function renumber(tb){ if(!tb)return; Array.from(tb.rows).forEach((r,i)=>{ const c=r.querySelector('.row-num'); if(c) c.textContent=i+1; }); }

function moveRow(btn, direction){
  const tr = btn.closest('tr');
  const tb = tr?.closest('tbody');
  if(!tr || !tb) return;
  const target = direction < 0 ? tr.previousElementSibling : tr.nextElementSibling;
  if(!target) return;
  if(direction < 0){
    tb.insertBefore(tr, target);
  }else{
    tb.insertBefore(target, tr);
  }
  renumber(tb);
  scheduleUpdate();
}

function moveColRow(btn, direction){
  moveRow(btn, direction);
}

// ── ADD COLUMN ──
function colRowHtml(n, type=''){
  return `<tr>
    <td><span class="drag-handle"><i class="bi bi-grip-vertical"></i></span></td>
    <td>
      <div class="row-move">
        <button class="btn-move" type="button" onclick="moveColRow(this,-1)" title="Przesuń w górę"><i class="bi bi-chevron-up"></i></button>
        <button class="btn-move" type="button" onclick="moveColRow(this,1)" title="Przesuń w dół"><i class="bi bi-chevron-down"></i></button>
      </div>
    </td>
    <td class="row-num">${n}</td>
    <td><input type="text" class="mono" placeholder="${type==='formula'?'{@FormulaNazwa}':type==='rt'?'#{RunningTotal}':'pole_db'}"/></td>
    <td><input type="text" placeholder="Nagłówek"/></td>
    <td><select><option>—</option><option${type==='formula'?' selected':''}>Formula</option><option>String</option><option>Number</option><option>Currency</option><option>Date</option><option>DateTime</option><option>Boolean</option><option>Percent</option></select></td>
    <td><input type="text" placeholder="format"/></td>
    <td style="text-align:center"><input type="checkbox" checked/></td>
    <td style="text-align:center"><input type="checkbox"/></td>
    <td><select><option>L</option><option>Ś</option><option>P</option></select></td>
    <td><select><option>Brak</option><option>Kolor</option><option>Tło</option><option>Bold</option><option>Wiele</option></select></td>
    <td><button class="btn-rm" onclick="removeRow(this)"><i class="bi bi-trash3"></i></button></td>
  </tr>`;
}
function addColRow(){ const tb=document.getElementById('colBody'); tb.insertAdjacentHTML('beforeend', colRowHtml(tb.rows.length+1)); scheduleUpdate(); }
function addFormulaCol(){ const tb=document.getElementById('colBody'); tb.insertAdjacentHTML('beforeend', colRowHtml(tb.rows.length+1,'formula')); scheduleUpdate(); }
function addRunningTotal(){ const tb=document.getElementById('colBody'); tb.insertAdjacentHTML('beforeend', colRowHtml(tb.rows.length+1,'rt')); scheduleUpdate(); }

// ── ADD CF ROW ──
function addCFRow(){
  const tb=document.getElementById('cfBody'); const n=tb.rows.length+1;
  tb.insertAdjacentHTML('beforeend',`<tr><td class="row-num">${n}</td><td><input type="text" class="mono" placeholder="kolumna"/></td><td><input type="text" class="mono" placeholder="{pole} < 0"/></td><td><select><option>Kolor tekstu</option><option>Kolor tła</option><option>Oba</option><option>Bold</option></select></td><td><input type="color" value="#dc2626"/></td><td><input type="color" value="#fee2e2"/></td><td><select><option>Normal</option><option>Bold</option><option>Italic</option></select></td><td><input type="text" placeholder="Opis"/></td><td><div class="row-actions"><div class="row-move"><button class="btn-move" type="button" onclick="moveRow(this,-1)" title="Przesuń w górę"><i class="bi bi-chevron-up"></i></button><button class="btn-move" type="button" onclick="moveRow(this,1)" title="Przesuń w dół"><i class="bi bi-chevron-down"></i></button></div><button class="btn-rm" onclick="removeRow(this)"><i class="bi bi-trash3"></i></button></div></td></tr>`);
  scheduleUpdate();
}

// ── ADD PARAM ROW ──
function addParamRow(){
  const tb=document.getElementById('paramBody'); const n=tb.rows.length+1;
  tb.insertAdjacentHTML('beforeend',`<tr><td class="row-num">${n}</td><td><input type="text" class="mono" placeholder="NazwaParam"/></td><td><select><option>—</option><option>String</option><option>Number</option><option>Date</option><option>DateTime</option><option>Boolean</option></select></td><td><input type="text" placeholder="domyślna"/></td><td style="text-align:center"><input type="checkbox"/></td><td style="text-align:center"><input type="checkbox"/></td><td><select><option>DatePicker</option><option>TextBox</option><option>Dropdown</option><option>MultiSelect</option><option>Ukryta</option></select></td><td><input type="text" class="mono" placeholder="SELECT..."/></td><td><input type="text" placeholder="Opis"/></td><td><div class="row-actions"><div class="row-move"><button class="btn-move" type="button" onclick="moveRow(this,-1)" title="Przesuń w górę"><i class="bi bi-chevron-up"></i></button><button class="btn-move" type="button" onclick="moveRow(this,1)" title="Przesuń w dół"><i class="bi bi-chevron-down"></i></button></div><button class="btn-rm" onclick="removeRow(this)"><i class="bi bi-trash3"></i></button></div></td></tr>`); scheduleUpdate();
}

// ── FILTER GROUP ──
let fgc = 0;
function addFilterGroup(){
  fgc++; const div=document.createElement('div'); div.className='cond-group';
  div.innerHTML=`<div class="cond-group-bar"><span style="font-size:11px;font-weight:800;color:var(--muted);font-family:'JetBrains Mono',monospace">GRUPA ${fgc}</span><span style="font-size:12px;color:var(--muted)">Wewnątrz:</span><select class="logic-sel"><option>AND</option><option>OR</option></select><span style="margin-left:auto;font-size:12px;color:var(--muted)">Z następną:</span><select class="logic-sel"><option>AND</option><option>OR</option></select><button class="btn-danger-sm ms-2" onclick="removeFilterGroup(this)"><i class="bi bi-x"></i></button></div><div style="padding:8px"><div class="dt-wrap"><table class="dt"><thead><tr><th>#</th><th>Pole</th><th>Poziom</th><th>Operator</th><th>Wartość</th><th>Typ wartości</th><th>NOT</th><th>Opis</th><th></th></tr></thead><tbody class="filter-rows"><tr><td class="row-num">1</td><td><input type="text" class="mono" placeholder="pole"/></td><td><select><option>SQL WHERE</option><option>CR Record</option><option>CR Group</option></select></td><td><select><option>= (równa się)</option><option>!=</option><option>&gt;</option><option>&lt;</option><option>BETWEEN</option><option>IN</option><option>LIKE</option><option>IS NULL</option><option>IS NOT NULL</option></select></td><td><input type="text" placeholder="wartość"/></td><td><select><option>Stała</option><option>Param CR</option><option>Formuła CR</option><option>Inne pole</option></select></td><td style="text-align:center"><input type="checkbox" style="accent-color:var(--r)"/></td><td><input type="text" placeholder="Opis"/></td><td><div class="row-actions"><div class="row-move"><button class="btn-move" type="button" onclick="moveRow(this,-1)" title="Przesuń w górę"><i class="bi bi-chevron-up"></i></button><button class="btn-move" type="button" onclick="moveRow(this,1)" title="Przesuń w dół"><i class="bi bi-chevron-down"></i></button></div><button class="btn-rm" onclick="removeRow(this)"><i class="bi bi-trash3"></i></button></div></td></tr></tbody></table></div><button class="btn-add mt-2" style="font-size:12px;padding:5px 12px" onclick="addFilterRow(this)"><i class="bi bi-plus-lg"></i>Dodaj warunek</button></div>`;
  document.getElementById('filterGroups').appendChild(div);
  scheduleUpdate();
}
function removeFilterGroup(btn){
  btn.closest('.cond-group')?.remove();
  scheduleUpdate();
}
function addFilterRow(btn){
  const tb=btn.closest('.cond-group').querySelector('.filter-rows'); const n=tb.rows.length+1;
  tb.insertAdjacentHTML('beforeend',`<tr><td class="row-num">${n}</td><td><input type="text" class="mono" placeholder="pole"/></td><td><select><option>SQL WHERE</option><option>CR Record</option><option>CR Group</option></select></td><td><select><option>= (równa się)</option><option>!=</option><option>&gt;</option><option>&lt;</option><option>BETWEEN</option><option>IN</option><option>LIKE</option><option>IS NULL</option><option>IS NOT NULL</option></select></td><td><input type="text" placeholder="wartość"/></td><td><select><option>Stała</option><option>Param CR</option><option>Formuła CR</option><option>Inne pole</option></select></td><td style="text-align:center"><input type="checkbox" style="accent-color:var(--r)"/></td><td><input type="text" placeholder="Opis"/></td><td><div class="row-actions"><div class="row-move"><button class="btn-move" type="button" onclick="moveRow(this,-1)" title="Przesuń w górę"><i class="bi bi-chevron-up"></i></button><button class="btn-move" type="button" onclick="moveRow(this,1)" title="Przesuń w dół"><i class="bi bi-chevron-down"></i></button></div><button class="btn-rm" onclick="removeRow(this)"><i class="bi bi-trash3"></i></button></div></td></tr>`);
  scheduleUpdate();
}

// ── ADD GROUP ROW ──
function addGroupRow(){
  const tb=document.getElementById('groupBody'); const n=tb.rows.length+1;
  tb.insertAdjacentHTML('beforeend',`<tr><td class="row-num">${n}</td><td><input type="text" class="mono" placeholder="pole"/></td><td><select><option>ASC</option><option>DESC</option><option>Custom</option></select></td><td><select><option>Brak</option><option>SUM</option><option>COUNT</option><option>AVG</option><option>MIN</option><option>MAX</option></select></td><td><input type="text" class="mono" placeholder="pole_kwota"/></td><td style="text-align:center"><input type="checkbox"/></td><td style="text-align:center"><input type="checkbox"/></td><td><input type="text" placeholder="Nagłówek"/></td><td><input type="text" placeholder="Stopka"/></td><td><div class="row-actions"><div class="row-move"><button class="btn-move" type="button" onclick="moveRow(this,-1)" title="Przesuń w górę"><i class="bi bi-chevron-up"></i></button><button class="btn-move" type="button" onclick="moveRow(this,1)" title="Przesuń w dół"><i class="bi bi-chevron-down"></i></button></div><button class="btn-rm" onclick="removeRow(this)"><i class="bi bi-trash3"></i></button></div></td></tr>`);
  scheduleUpdate();
}

// ── SUBREPORTS ──
let src = 0;
function addSubreport(){
  src++; const id=`sr${src}`;
  const div=document.createElement('div'); div.className='sr-card'; div.id=id;
  div.innerHTML=`<div class="sr-head"><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)">SR-${String(src).padStart(2,'0')}</span><span style="font-weight:800;flex:1;font-size:13px" id="${id}-label">Nowy podraport</span><span class="sr-pill sr-inline">Inline</span><button class="btn-rm ms-2" onclick="this.closest('.sr-card').remove()"><i class="bi bi-trash3"></i></button></div><div class="sr-tabs"><button class="sr-tab active" onclick="srTab(this,'${id}-a')">Identyfikacja</button><button class="sr-tab" onclick="srTab(this,'${id}-b')">Źródło danych</button><button class="sr-tab" onclick="srTab(this,'${id}-c')">Powiązanie</button><button class="sr-tab" onclick="srTab(this,'${id}-d')">Kolumny</button><button class="sr-tab" onclick="srTab(this,'${id}-e')">Wydajność</button></div><div class="sr-pane active" id="${id}-a"><div class="form-row cols-3"><div class="field"><label class="field-label">Nazwa .rpt</label><input type="text" class="fc mono" placeholder="SR_Nazwa.rpt" oninput="document.getElementById('${id}-label').textContent=this.value||'Nowy podraport'"/></div><div class="field"><label class="field-label">Typ</label><select class="fs"><option>Inline</option><option>On-demand</option><option>Linked Embedded</option></select></div><div class="field"><label class="field-label">Sekcja CR</label><select class="fs"><option>Report Header</option><option>Report Footer</option><option>Group Header</option><option>Group Footer</option><option>Details</option></select></div></div><div class="field mt-2"><label class="field-label">Opis biznesowy</label><textarea class="fc" rows="2" placeholder="Co prezentuje ten podraport?"></textarea></div></div><div class="sr-pane" id="${id}-b"><div class="form-row cols-3"><div class="field"><label class="field-label">Typ źródła</label><select class="fs"><option>VIEW</option><option>SP</option><option>Zapytanie SQL</option></select></div><div class="field"><label class="field-label">Obiekt SQL</label><input type="text" class="fc mono" placeholder="dbo.v_SR_Dane"/></div><div class="field"><label class="field-label">Parametry SR</label><input type="text" class="fc" placeholder="LinkID:Number"/></div></div><div class="field mt-2"><label class="field-label">Zapytanie SQL</label><textarea class="fc mono" rows="3" placeholder="SELECT ... WHERE id = {?LinkID}"></textarea></div></div><div class="sr-pane" id="${id}-c"><div class="info-alert mb-3"><i class="bi bi-info-circle"></i>Powiązanie = przekazywanie wartości z raportu głównego do parametrów SR przez SubreportLinks.</div><div class="dt-wrap"><table class="dt"><thead><tr><th>#</th><th>Pole raportu głównego</th><th>→</th><th>Parametr SR ({?X})</th><th>Konwersja</th><th></th></tr></thead><tbody id="${id}-links"><tr><td class="row-num">1</td><td><input type="text" class="mono" placeholder="{Orders.ID}"/></td><td style="text-align:center;color:var(--g);font-size:16px">→</td><td><input type="text" class="mono" placeholder="{?LinkID}"/></td><td><select><option>Brak</option><option>ToText</option><option>ToNumber</option><option>CDate</option></select></td><td><div class="row-actions"><div class="row-move"><button class="btn-move" type="button" onclick="moveRow(this,-1)" title="Przesuń w górę"><i class="bi bi-chevron-up"></i></button><button class="btn-move" type="button" onclick="moveRow(this,1)" title="Przesuń w dół"><i class="bi bi-chevron-down"></i></button></div><button class="btn-rm" onclick="removeRow(this)"><i class="bi bi-trash3"></i></button></div></td></tr></tbody></table></div><button class="btn-add mt-2" onclick="addSrLink('${id}-links')"><i class="bi bi-plus-lg"></i>Dodaj powiązanie</button></div><div class="sr-pane" id="${id}-d"><div class="dt-wrap"><table class="dt"><thead><tr><th>#</th><th>Pole</th><th>Nagłówek</th><th>Typ</th><th>Format</th><th>Widoczna</th><th></th></tr></thead><tbody id="${id}-cols"><tr><td class="row-num">1</td><td><input type="text" class="mono" placeholder="pole"/></td><td><input type="text" placeholder="Nagłówek"/></td><td><select><option>String</option><option>Number</option><option>Currency</option><option>Date</option></select></td><td><input type="text" placeholder="format"/></td><td style="text-align:center"><input type="checkbox" checked/></td><td><div class="row-actions"><div class="row-move"><button class="btn-move" type="button" onclick="moveRow(this,-1)" title="Przesuń w górę"><i class="bi bi-chevron-up"></i></button><button class="btn-move" type="button" onclick="moveRow(this,1)" title="Przesuń w dół"><i class="bi bi-chevron-down"></i></button></div><button class="btn-rm" onclick="removeRow(this)"><i class="bi bi-trash3"></i></button></div></td></tr></tbody></table></div><button class="btn-add mt-2" onclick="addSrCol('${id}-cols')"><i class="bi bi-plus-lg"></i>Dodaj kolumnę</button></div><div class="sr-pane" id="${id}-e"><div class="form-row cols-3"><div class="field"><label class="field-label">Wywołania</label><select class="fs"><option>1 raz</option><option>Per grupę</option><option>Per wiersz</option><option>On-demand</option></select></div><div class="field"><label class="field-label">Szac. wierszy SR</label><select class="fs"><option>Małe (&lt;50)</option><option>Średnie (50-500)</option><option>Duże (500-5000)</option><option>Bardzo duże (&gt;5000)</option></select></div><div class="field"><label class="field-label">Ryzyko wydajnościowe</label><select class="fs"><option>Niskie</option><option>Średnie</option><option>Wysokie</option><option>Krytyczne</option></select></div></div><div class="field mt-2"><label class="field-label">Uwagi optymalizacyjne</label><input type="text" class="fc" placeholder="np. Rozważ JOIN zamiast podraportu..."/></div></div>`;
  document.getElementById('subreportList').appendChild(div);
  scheduleUpdate();
}
function srTab(btn, panId){
  const sc=btn.closest('.sr-card');
  sc.querySelectorAll('.sr-tab').forEach(t=>t.classList.remove('active'));
  sc.querySelectorAll('.sr-pane').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(panId).classList.add('active');
}
function addSrLink(id){ const tb=document.getElementById(id); tb.insertAdjacentHTML('beforeend',`<tr><td class="row-num">${tb.rows.length+1}</td><td><input type="text" class="mono" placeholder="pole główne"/></td><td style="text-align:center;color:var(--g);font-size:16px">→</td><td><input type="text" class="mono" placeholder="{?Param}"/></td><td><select><option>Brak</option><option>ToText</option><option>ToNumber</option><option>CDate</option></select></td><td><div class="row-actions"><div class="row-move"><button class="btn-move" type="button" onclick="moveRow(this,-1)" title="Przesuń w górę"><i class="bi bi-chevron-up"></i></button><button class="btn-move" type="button" onclick="moveRow(this,1)" title="Przesuń w dół"><i class="bi bi-chevron-down"></i></button></div><button class="btn-rm" onclick="removeRow(this)"><i class="bi bi-trash3"></i></button></div></td></tr>`); scheduleUpdate(); }
function addSrCol(id){ const tb=document.getElementById(id); tb.insertAdjacentHTML('beforeend',`<tr><td class="row-num">${tb.rows.length+1}</td><td><input type="text" class="mono" placeholder="pole"/></td><td><input type="text" placeholder="Nagłówek"/></td><td><select><option>String</option><option>Number</option><option>Currency</option><option>Date</option></select></td><td><input type="text" placeholder="format"/></td><td style="text-align:center"><input type="checkbox" checked/></td><td><div class="row-actions"><div class="row-move"><button class="btn-move" type="button" onclick="moveRow(this,-1)" title="Przesuń w górę"><i class="bi bi-chevron-up"></i></button><button class="btn-move" type="button" onclick="moveRow(this,1)" title="Przesuń w dół"><i class="bi bi-chevron-down"></i></button></div><button class="btn-rm" onclick="removeRow(this)"><i class="bi bi-trash3"></i></button></div></td></tr>`); scheduleUpdate(); }

// ── FORMAT CARD ──
function toggleFmt(head){
  const body=head.nextElementSibling;
  body.classList.toggle('open');
  head.querySelector('.fmt-chevron').style.transform=body.classList.contains('open')?'':'rotate(-90deg)';
}
function addFmtCard(){
  const fmt=prompt('Nazwa formatu:'); if(!fmt) return;
  document.getElementById('fmtContainer').insertAdjacentHTML('beforeend',`<div class="fmt-card mt-2"><div class="fmt-head" onclick="toggleFmt(this)"><div class="fmt-ico" style="background:var(--a-l);color:var(--a)"><i class="bi bi-file-earmark"></i></div><span class="fmt-name">${fmt}</span><div style="margin-left:auto" onclick="event.stopPropagation()"><label class="toggle-sw" style="width:32px;height:18px"><input class="fmt-cb" type="checkbox" checked onchange="onFieldChange(this)"><div class="toggle-track"><div class="toggle-thumb" style="width:12px;height:12px;top:3px;left:3px"></div></div></label></div><i class="bi bi-chevron-down fmt-chevron ms-2"></i></div><div class="fmt-body open"><div class="form-row cols-2"><div class="field"><label class="field-label">Typ eksportu CR</label><input type="text" class="fc mono" placeholder="ExportFormatType.HTML40"/></div><div class="field"><label class="field-label">Wzorzec nazwy</label><input type="text" class="fc mono" placeholder="Raport.html"/></div></div><div class="field mt-2"><label class="field-label">Wytyczne dewelopera</label><textarea class="fc" rows="2" placeholder="Opisz wymagania..."></textarea></div></div></div>`);
}

// ── TOKENS ──
let lastFC = null;
document.addEventListener('focusin', e=>{ if(e.target.matches('input[type=text],input[type=date],textarea')) lastFC=e.target; });
function insertToken(t){ if(lastFC){ const s=lastFC.selectionStart,e=lastFC.selectionEnd,v=lastFC.value; lastFC.value=v.slice(0,s)+t+v.slice(e); lastFC.selectionStart=lastFC.selectionEnd=s+t.length; lastFC.focus(); showToast(`Token ${t} wstawiony`,'success'); } else { showToast('Kliknij najpierw w pole tekstowe.','warning'); } }

// ── EMPTY STATE PREVIEW ──
function updateEmptyPreview(){
  const msg=document.getElementById('emptyMsg').value||'Brak danych dla wybranych kryteriów.';
  const hint=document.getElementById('emptyHint').value||'Zmień filtry i spróbuj ponownie.';
  const icoRaw=document.getElementById('emptyIcon').value||'bi-inbox';
  const ico = /^bi-[a-z0-9-]+$/i.test(icoRaw) ? icoRaw : 'bi-inbox';
  const preview = document.getElementById('emptyPreview');
  preview.innerHTML = '';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'es-icon';
  const icon = document.createElement('i');
  icon.className = `bi ${ico}`;
  iconWrap.appendChild(icon);

  const title = document.createElement('div');
  title.className = 'es-title';
  title.textContent = msg;

  const sub = document.createElement('div');
  sub.className = 'es-sub';
  sub.textContent = hint;

  preview.append(iconWrap, title, sub);
}

// ── FIELD CHANGE → UPDATE INDICATORS ──
function onFieldChange(el){
  if(el && el.value && el.classList.contains('fc')){
    el.classList.add('filled');
  }
  scheduleUpdate();
}

let updateTimer = null;
function scheduleUpdate(){ clearTimeout(updateTimer); updateTimer = setTimeout(updateAll, 150); }

function escapeHtml(value){
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── COMPUTE TAB COMPLETION ──
function countFilledInputs(pane){
  if(!pane) return 0;
  const allInputs = pane.querySelectorAll('input[type=text]:not([type=hidden]),textarea,select');
  let count = 0;
  allInputs.forEach(el=>{
    const v = (el.value || '').trim();
    if(v && v !== '—' && v !== '— wybierz —' && v !== '— wybierz typ —') count++;
  });
  return count;
}

function completionFromRequired(tab, pane){
  const required = tab.required;
  let filled = 0, total = required.length;

  required.forEach(id=>{
    const el = document.getElementById(id);
    if(el && el.value.trim().length > 0) filled++;
  });

  const anyFilled = countFilledInputs(pane);

  if(total === 0){
    if(anyFilled === 0) return {status:'none', progress:0};
    return {status:'partial', progress:50};
  }
  if(filled === 0 && anyFilled === 0) return {status:'none', progress:0};
  if(filled < total) return {status:'partial', progress:Math.round((filled/total)*100)};
  return {status:'complete', progress:100};
}

function completionFromStructure({ready, touched}){
  if(ready) return {status:'complete', progress:100};
  if(touched) return {status:'partial', progress:50};
  return {status:'none', progress:0};
}



function computeTabCompletion(tab){
  const pane = document.getElementById(tab.id);
  const checker = tab.completionCheck;
  if(typeof checker === 'function') return checker(tab, pane);
  if(typeof checker === 'string' && COMPLETION_CHECKS[checker]) return COMPLETION_CHECKS[checker](tab, pane);
  return completionFromRequired(tab, pane);
}

function computeTabStatus(tab){
  return computeTabCompletion(tab).status;
}

function updateAll(){
  let progressSum = 0;
  const tabData = [];
  TABS.forEach(tab=>{
    const completion = computeTabCompletion(tab);
    const status = completion.status;
    const dot = document.getElementById(`ts-${tab.id}`);
    if(dot){
      dot.className = `tab-status ${status}`;
    }
    tabData.push({...tab, ...completion});
    progressSum += completion.progress;
  });

  const pct = Math.round(progressSum/TABS.length);
  document.getElementById('globalProgressFill').style.width = pct+'%';
  document.getElementById('progressLabel').textContent = pct+'% gotowe';

  // Score circle
  const circle = document.getElementById('scoreCircle');
  const circ = 239;
  circle.style.strokeDashoffset = circ - (circ * pct/100);
  document.getElementById('scorePct').textContent = pct+'%';
  const stxt = document.getElementById('scoreStatusTxt');
  if(pct===0){ stxt.textContent='Uzupełnij pola aby śledzić postęp'; stxt.style.color='var(--muted)'; }
  else if(pct<50){ stxt.textContent='Dobry początek — kontynuuj!'; stxt.style.color='var(--y)'; }
  else if(pct<100){ stxt.textContent='Prawie gotowe — świetna robota!'; stxt.style.color='var(--a)'; }
  else { stxt.textContent='Definicja kompletna! 🎉'; stxt.style.color='var(--g)'; }

  const validationErrors = getValidationErrors();
  updateQuickFixCta(getPrioritySuggestions(validationErrors)[0] || null);

  // Update summary panel if open
  if(summaryOpen) buildSummaryPanel(tabData, pct);
}

// ── BUILD SUMMARY PANEL ──
function buildSummaryPanel(tabData, pct){
  if(!tabData){
    tabData = TABS.map(t=>({...t, ...computeTabCompletion(t)}));
    pct = Math.round(tabData.reduce((acc,t)=>acc+t.progress,0)/TABS.length);
  }

  const compactClass = summaryCompact ? 'sum-tab-meta compact-hidden' : 'sum-tab-meta';

  // Tab list
  const tl = document.getElementById('sumTabList');
  tl.innerHTML = tabData.map((t,i)=>{
    const icoClass = t.status==='complete'?'sum-ico-g':t.status==='partial'?'sum-ico-y':'sum-ico-n';
    const icoI = t.status==='complete'?'bi-check':'bi-dash';
    const pctTxt = `${t.progress}%`;
    const statusText = t.status==='complete'?'Kompletna':t.status==='partial'?'W trakcie':'Do uzupełnienia';
    const reqInfo = t.required?.length ? `Wymagane: ${t.required.length}` : 'Brak pól wymaganych';
    return `<div class="sum-tab-row" onclick="goTab('${t.id}');toggleSummary(false)">
      <div class="tab-ico sum-tab-ico ${icoClass}"><i class="bi ${icoI}"></i></div>
      <div class="sum-tab-name">${t.name}<span class="${compactClass}">${statusText} · ${reqInfo}</span></div>
      <span class="sum-tab-pct">${pctTxt}</span>
    </div>`;
  }).join('');

  // Details
  const rName = (document.getElementById('rName')||{}).value||'';
  const rTitle = (document.getElementById('rTitle')||{}).value||'';
  const rStatus = (document.getElementById('rStatus')||{}).value||'Szkic';
  const sqlType = (document.getElementById('sqlType')||{}).value||'';
  const cols = document.getElementById('colBody').rows.length;
  const params = document.getElementById('paramBody').rows.length;
  const groups = document.getElementById('groupBody').rows.length;
  const srs = document.querySelectorAll('.sr-card').length;
  const activeFmts = document.querySelectorAll('.fmt-cb:checked').length;

  const sqlLabels={view:'Widok (VIEW)',proc:'SP',fn:'TVF',query:'SQL inline','':'—'};
  const safeRName = escapeHtml(rName || '(nie podano)');
  const safeRTitle = escapeHtml(rTitle || '(nie podano)');
  const safeRStatus = escapeHtml(rStatus);
  const safeSqlLabel = escapeHtml(sqlLabels[sqlType] || '—');

  if(summaryCompact){
    document.getElementById('sumDetails').innerHTML = `
      <div class="sum-detail"><div class="sum-detail-label">Status · Postęp</div><div class="sum-detail-val"><span class="sum-badge blue">${safeRStatus}</span> <span class="sum-badge green">${pct}%</span></div></div>
      <div class="sum-detail"><div class="sum-detail-label">Najważniejsze liczniki</div><div class="sum-detail-val">Kolumny: ${cols} · Parametry: ${params} · Grupy: ${groups} · SR: ${srs}</div></div>
      <div class="sum-detail"><div class="sum-detail-label">Źródło · Eksport</div><div class="sum-detail-val"><span class="sum-badge ${sqlType?'green':'yellow'}">${safeSqlLabel}</span> <span class="sum-badge blue">Formaty: ${activeFmts}</span></div></div>
    `;
  } else {
    document.getElementById('sumDetails').innerHTML = `
      <div class="sum-detail"><div class="sum-detail-label">Nazwa raportu</div><div class="sum-detail-val ${!rName?'empty':''}">${safeRName}</div></div>
      <div class="sum-detail"><div class="sum-detail-label">Tytuł wyświetlany</div><div class="sum-detail-val ${!rTitle?'empty':''}">${safeRTitle}</div></div>
      <div class="sum-detail"><div class="sum-detail-label">Status · Źródło SQL</div><div class="sum-detail-val"><span class="sum-badge blue">${safeRStatus}</span> <span class="sum-badge ${sqlType?'green':'yellow'}">${safeSqlLabel}</span></div></div>
      <div class="sum-detail"><div class="sum-detail-label">Kolumny · Parametry · Grupy · SR</div><div class="sum-detail-val">${cols} · ${params} · ${groups} · ${srs}</div></div>
      <div class="sum-detail"><div class="sum-detail-label">Aktywne formaty eksportu</div><div class="sum-detail-val">${activeFmts} aktywnych</div></div>
    `;
  }

  // Alerts
  const validationErrors = getValidationErrors();
  renderValidationSummary(validationErrors);
}

// ── VALIDATION ──


function clearValidationErrors(){
  document.querySelectorAll('.validation-error').forEach(el=>el.classList.remove('validation-error'));
  document.querySelectorAll('.field-validation-message').forEach(el=>{
    el.textContent = '';
    el.classList.remove('visible');
  });
}

function showFieldError(fieldId, message){
  const el = document.getElementById(fieldId);
  if(!el) return;
  el.classList.add('validation-error');
  const fieldWrap = el.closest('.field') || el.parentElement;
  if(!fieldWrap) return;
  let msgEl = fieldWrap.querySelector('.field-validation-message');
  if(!msgEl){
    msgEl = document.createElement('div');
    msgEl.className = 'field-validation-message';
    fieldWrap.appendChild(msgEl);
  }
  msgEl.textContent = message;
  msgEl.classList.add('visible');
}

function getValidationErrors(){
  const errors = [];
  VALIDATION_CONFIG.forEach(cfg=>{
    const el = document.getElementById(cfg.id);
    if(!el) return;
    if(!el.checkValidity()){
      let message = el.validationMessage || `Pole "${cfg.label}" jest nieprawidłowe.`;
      if(cfg.id === 'rName'){
        if(el.validity.valueMissing) message = 'Nazwa raportu jest wymagana.';
        else if(el.validity.tooShort) message = 'Nazwa raportu musi mieć min. 3 znaki.';
        else if(el.validity.patternMismatch) message = 'Nazwa raportu może zawierać tylko litery, cyfry i podkreślenia (bez spacji).';
      }
      if(cfg.id === 'rTitle' && el.validity.valueMissing) message = 'Tytuł wyświetlany jest wymagany.';
      if(cfg.id === 'rDesc'){
        if(el.validity.valueMissing) message = 'Opis / cel raportu jest wymagany.';
        else if(el.validity.tooShort) message = 'Opis raportu musi mieć co najmniej 20 znaków.';
      }
      if(cfg.id === 'sqlType' && el.validity.valueMissing) message = 'Wybierz typ źródła SQL.';
      if(cfg.id === 'defaultExportFormat' && el.validity.valueMissing) message = 'Wybierz domyślny format eksportu.';
      errors.push({fieldId: cfg.id, tab: cfg.tab, message});
    }
  });

  const activeFormats = document.querySelectorAll('.fmt-cb:checked');
  if(activeFormats.length === 0){
    errors.push({fieldId:'fmtPdfEnabled', tab:'t10', message:'Wybierz co najmniej jeden aktywny format eksportu (PDF/Excel/CSV).'});
  }

  const exportPatternRules = [
    {toggle:'fmtPdfEnabled', pattern:'pdfFilePattern', ext:'PDF', tab:'t10'},
    {toggle:'fmtExcelEnabled', pattern:'excelFilePattern', ext:'Excel', tab:'t10'},
    {toggle:'fmtCsvEnabled', pattern:'csvFilePattern', ext:'CSV', tab:'t10'}
  ];
  exportPatternRules.forEach(rule=>{
    const toggle = document.getElementById(rule.toggle);
    const patternInput = document.getElementById(rule.pattern);
    if(!toggle || !patternInput || !toggle.checked) return;
    if(!patternInput.value.trim()){
      errors.push({fieldId: rule.pattern, tab: rule.tab, message: `Dla aktywnego formatu ${rule.ext} podaj wzorzec nazwy pliku.`});
    } else if(!patternInput.checkValidity()){
      errors.push({fieldId: rule.pattern, tab: rule.tab, message: `Wzorzec nazwy dla ${rule.ext} musi kończyć się odpowiednim rozszerzeniem.`});
    }
  });

  return errors;
}

function getErrorPriority(error){
  if(!error) return 99;
  if(error.tab === 't1' || error.tab === 't2') return 0;
  if(error.tab === 't10') return 2;
  return 1;
}

function getPrioritySuggestions(errors){
  return [...errors]
    .sort((a,b)=>getErrorPriority(a)-getErrorPriority(b))
    .slice(0,2)
    .map((error, idx)=>({
      ...error,
      title: idx===0 ? 'Najwyższy priorytet' : 'Kolejny krok',
      body: error.message
    }));
}

function updateQuickFixCta(error){
  topPriorityError = error || null;
  const btn = document.getElementById('quickFixCta');
  if(!btn) return;
  if(!error){
    btn.style.display = 'none';
    return;
  }
  btn.style.display = '';
  btn.innerHTML = '<i class="bi bi-magic"></i><span>Przejdź i popraw</span>';
}

function onPriorityCta(tab, fieldId){
  goToField(tab, fieldId);
}

function renderValidationSummary(errors){
  const alertsEl = document.getElementById('sumAlerts');
  if(!alertsEl) return;
  if(!errors.length){
    updateQuickFixCta(null);
    alertsEl.innerHTML = `<div class="sum-alert ok"><i class="bi bi-check-circle"></i><div><strong>Brak błędów walidacji.</strong><div>Gotowe do generacji dokumentacji.</div></div></div>`;
    return;
  }

  const suggestions = getPrioritySuggestions(errors);
  updateQuickFixCta(suggestions[0]);
  const suggestionHtml = suggestions.map(s=>`
    <div class="sum-priority">
      <div class="sum-priority-title">${s.title}</div>
      <div class="sum-priority-body">${s.body}</div>
      <button class="sum-priority-cta" type="button" onclick="onPriorityCta('${s.tab}','${s.fieldId}')"><i class="bi bi-arrow-right-circle"></i>Przejdź i popraw</button>
    </div>
  `).join('');

  const list = errors.map(e=>`<li>${e.message}</li>`).join('');
  alertsEl.innerHTML = `
    <div class="sum-priority-wrap">${suggestionHtml}</div>
    <div class="sum-priority-rules">
      <strong>Reguły priorytetyzacji</strong>
      <ul>
        <li>Wymagane pola z zakładek t1/t2 są najwyżej.</li>
        <li>Błędy eksportu i formatów są obsługiwane niżej.</li>
      </ul>
    </div>
    <div class="sum-alert warn"><i class="bi bi-exclamation-triangle"></i><div><div><strong>Popraw poniższe błędy:</strong></div><ul class="sum-alert-list">${list}</ul></div></div>
  `;
}

function clearCurrentSection(){
  const tab = document.getElementById(currentTab);
  if(!tab) return;
  tab.querySelectorAll('input,textarea,select').forEach(el=>{
    if(el.type === 'button' || el.type === 'submit' || el.type === 'reset' || el.disabled) return;
    if(el.type === 'checkbox' || el.type === 'radio'){
      el.checked = false;
    }else if(el.tagName === 'SELECT'){
      el.selectedIndex = 0;
    }else{
      el.value = '';
    }
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  });
  clearValidationErrors();
  showToast('Wyczyszczono bieżącą sekcję.','success');
}

function jumpToErrors(){
  const errors = getValidationErrors();
  renderValidationSummary(errors);
  if(!errors.length){
    showToast('Brak błędów walidacji.','success');
    return;
  }
  if(!summaryOpen) toggleSummary(true);
  const first = errors[0];
  goTab(first.tab);
  const firstField = document.getElementById(first.fieldId);
  if(firstField) firstField.focus({preventScroll:false});
  showToast(`Znaleziono błędy: ${errors.length}.`, 'warning');
}

function buildClipboardSummary(){
  const progress = document.getElementById('progressLabel')?.textContent?.trim() || '0% gotowe';
  const reportName = document.getElementById('rName')?.value?.trim() || '—';
  const reportTitle = document.getElementById('rTitle')?.value?.trim() || '—';
  const sourceType = document.getElementById('sqlType')?.value || '—';
  const defaultFormat = document.getElementById('defaultExportFormat')?.value || '—';
  const errors = getValidationErrors();
  return [
    'Podsumowanie definicji raportu',
    `Postęp: ${progress}`,
    `Nazwa raportu: ${reportName}`,
    `Tytuł: ${reportTitle}`,
    `Typ źródła SQL: ${sourceType}`,
    `Domyślny format eksportu: ${defaultFormat}`,
    `Liczba błędów walidacji: ${errors.length}`
  ].join('\n');
}

async function copySummaryToClipboard(){
  const payload = buildClipboardSummary();
  if(!navigator.clipboard || !navigator.clipboard.writeText){
    showToast('Schowek niedostępny w tej przeglądarce.','warning');
    return;
  }
  try{
    await navigator.clipboard.writeText(payload);
    showToast('Skopiowano podsumowanie do schowka.','success');
  }catch(_err){
    showToast('Nie udało się skopiować podsumowania.','warning');
  }
}

function validateBeforeSubmit(){
  clearValidationErrors();
  const errors = getValidationErrors();

  errors.forEach(err=>showFieldError(err.fieldId, err.message));
  renderValidationSummary(errors);

  if(errors.length){
    if(!summaryOpen) toggleSummary();
    const first = getPrioritySuggestions(errors)[0] || errors[0];
    goToField(first.tab, first.fieldId);
    showToast('Uzupełnij wymagane pola przed generowaniem dokumentacji.','warning');
    return false;
  }

  showToast('Dokumentacja wygenerowana!','success');
  return true;
}

// ── TOAST ──
function showToast(msg, type=''){
  const c=document.getElementById('toastContainer');
  const t=document.createElement('div');
  t.className=`toast ${type}`;
  const icon=document.createElement('i');
  icon.className=`bi bi-${type==='success'?'check-circle':type==='warning'?'exclamation-triangle':'info-circle'}`;
  t.appendChild(icon);
  t.append(document.createTextNode(msg));
  c.appendChild(t);
  setTimeout(()=>{ t.classList.add('removing'); setTimeout(()=>t.remove(),250); }, 2500);
}

document.querySelectorAll('button:not([type])').forEach(btn=>{ btn.type = 'button'; });

// ── INPUT CHANGE LISTENER ──
document.addEventListener('input', e=>{
  if(e.target.matches('input,textarea,select')) scheduleUpdate();
});
document.addEventListener('change', e=>{
  if(e.target.matches('input,textarea,select')) scheduleUpdate();
});

document.addEventListener('keydown', e=>{
  if(e.key === 'Escape' && summaryOpen) toggleSummary(false);
});

// ── INIT ──
// Add initial filter group
addFilterGroup();
initTheme();
initSummaryCompact();
syncSummaryVisibilityState();
initGlobalTooltips();
// Initial update
setTimeout(updateAll, 300);

// ── ANIMATE CARDS ON TAB SWITCH ──
const tabObs = new MutationObserver(()=>{
  document.querySelectorAll('.tab-pane.active .card').forEach((c,i)=>{
    c.style.animationDelay = (i*0.05)+'s';
    c.style.animation='none'; c.offsetHeight;
    c.style.animation='';
  });
});
document.querySelectorAll('.tab-pane').forEach(p=>tabObs.observe(p,{attributes:true,attributeFilter:['class']}));

// ── INPUT FILL TRACKING ──
document.querySelectorAll('input[type=text],textarea').forEach(el=>{
  el.addEventListener('input', ()=>{ el.classList.toggle('filled', el.value.trim().length>0); });
});
