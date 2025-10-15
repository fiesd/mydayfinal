// ===== 유틸 =====
const $ = (q, el=document)=>el.querySelector(q);
const $$ = (q, el=document)=>[...el.querySelectorAll(q)];
const fmt = (d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = new Date();
let view = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = new Date(today);

const STORAGE_KEY = 'dailymyday.v1';
const loadAll = ()=> JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
const saveAll = (obj)=> localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));

const MOODS = [
  {id:'happy', em:'😊', name:'행복'},
  {id:'calm', em:'😌', name:'차분'},
  {id:'love', em:'🥰', name:'사랑'},
  {id:'okay', em:'🙂', name:'보통'},
  {id:'tired', em:'🥱', name:'피곤'},
  {id:'sad', em:'😢', name:'슬픔'},
  {id:'angry', em:'😡', name:'화남'},
  {id:'anx', em:'😟', name:'불안'},
  {id:'proud', em:'😎', name:'뿌듯'},
  {id:'grateful', em:'🙏', name:'감사'},
  {id:'excited', em:'🤩', name:'설렘'},
  {id:'sick', em:'🤒', name:'아픔'}
];
const MOOD_EMO = Object.fromEntries(MOODS.map(m=>[m.id,m.em]));
const MOOD_NAME = Object.fromEntries(MOODS.map(m=>[m.id,m.name]));

// 오늘 표시
$('#todayPill').textContent = `오늘 ${fmt(today)}`;

// ===== 탭 전환 =====
function showTab(name){
  $$('.view').forEach(v=>v.classList.remove('active'));
  $(`#view${name}`).classList.add('active');
  $$('.tabbtn').forEach(b=>b.classList.remove('active'));
  $(`.tabbtn[data-tab="${name}"]`).classList.add('active');

  if(name==='Diary'){ updateEditorHeader(); }
  if(name==='Records'){ renderEntries(); renderStats(); }
  if(name==='Mood'){ bindFlowButtons(); }
  window.scrollTo({top:0, behavior:'smooth'});
}
$$('.tabbtn').forEach(b=> b.addEventListener('click', ()=> showTab(b.dataset.tab)));

// ===== 달력 =====
function renderMonthBar(){
  $('#monthLabel').textContent = `${view.getFullYear()}-${String(view.getMonth()+1).padStart(2,'0')}`;
}
function renderCalendar(){
  const grid = $('#calendarGrid');
  grid.innerHTML = '';
  const year = view.getFullYear(), month = view.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month+1, 0).getDate();

  for(let i=0;i<firstDow;i++){ const d=document.createElement('div'); d.className='day disabled'; grid.appendChild(d); }
  const all = loadAll();
  for(let d=1; d<=lastDate; d++){
    const date = new Date(year, month, d);
    const id = fmt(date);
    const cell = document.createElement('button');
    cell.className = 'day';
    if(fmt(date)===fmt(today)) cell.classList.add('today');
    if(fmt(date)===fmt(selectedDate)) cell.classList.add('selected');
    cell.textContent = d;

    if(all[id]){
      const dot = document.createElement('span');
      dot.style.position='absolute'; dot.style.bottom='6px'; dot.style.width='6px'; dot.style.height='6px';
      dot.style.borderRadius='50%'; dot.style.background='#5a45b8';
      cell.appendChild(dot);
    }

    cell.addEventListener('click', ()=>{
      selectedDate = date;
      renderCalendar();
      loadEntryToEditor();
      showTab('Mood'); // 날짜→감정
    });
    grid.appendChild(cell);
  }
}

// ===== 월 이동 (중복 클릭 방지) =====
let _monthNavLock = false;
let _lastNavAt = 0;
function shiftMonth(delta){
  const now = Date.now();
  if (_monthNavLock) return;
  if (now - _lastNavAt < 180) return;
  _monthNavLock = true;

  view = new Date(view.getFullYear(), view.getMonth() + delta, 1);
  renderMonthBar();
  renderCalendar();

  _lastNavAt = now;
  setTimeout(()=>{ _monthNavLock = false; }, 80);
}
function bindMonthButtons(){
  const prev = document.getElementById('prevMonth');
  const next = document.getElementById('nextMonth');
  if (!prev || !next) return;

  const prevNew = prev.cloneNode(true);
  const nextNew = next.cloneNode(true);
  prev.parentNode.replaceChild(prevNew, prev);
  next.parentNode.replaceChild(nextNew, next);

  const opts = { passive:false };
  prevNew.addEventListener('pointerup', (e)=>{ e.preventDefault(); e.stopImmediatePropagation(); shiftMonth(-1); }, opts);
  nextNew.addEventListener('pointerup', (e)=>{ e.preventDefault(); e.stopImmediatePropagation(); shiftMonth(+1); }, opts);
}

// ===== 감정 =====
function renderMoods(selected){
  const box = $('#moodGrid'); if(!box) return;
  box.innerHTML = '';
  MOODS.forEach(m=>{
    const b = document.createElement('div');
    b.className = 'mood' + (selected===m.id ? ' active':'');
    b.innerHTML = `<span class="em">${m.em}</span><div style="font-size:var(--fs-sm);margin-top:4px">${m.name}</div>`;
    b.addEventListener('click', ()=>{
      $$('.mood', box).forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      updateEditorHeader();
    });
    b.dataset.mid = m.id;
    box.appendChild(b);
  });
}
function getSelectedMood(){ const act = $('#moodGrid .mood.active'); return act ? act.dataset.mid : ''; }
function setSelectedMood(mid){ $$('#moodGrid .mood').forEach(x=>{ if(x.dataset.mid===mid) x.classList.add('active'); else x.classList.remove('active'); }); }

// ===== 에디터 =====
function updateEditorHeader(){
  const moodId = getSelectedMood();
  const emoji = MOOD_EMO[moodId] || '';
  const space = emoji ? ' ' : '';
  $('#editorTitle').textContent = `${fmt(selectedDate)} 일기${space}${emoji}`;
}
function loadEntryToEditor(){
  const id = fmt(selectedDate);
  const all = loadAll();
  const it = all[id] || {text:'', mood:'', praise:'', summary:null};

  const diaryEl = $('#diary'); if(diaryEl) diaryEl.value = it.text || '';
  const praiseEl = $('#praise'); if(praiseEl) praiseEl.value = it.praise || '';
  renderMoods(it.mood||''); setSelectedMood(it.mood||'');
  const countEl = $('#charCount'); if(countEl) countEl.textContent = (it.text||'').length;

  if(it.summary && it.summary.text){
    $('#summaryText').textContent = it.summary.text;
    $('#summaryTime').textContent = `(${new Date(it.summary.at).toLocaleString()})`;
    $('#summaryBox').style.display = '';
  }else{
    $('#summaryBox').style.display = 'none';
  }
  renderEntries(); renderStats(); renderCalendar(); updateEditorHeader();
}
function saveCurrent(){
  const id = fmt(selectedDate);
  const all = loadAll();
  all[id] = {
    text: ($('#diary')?.value || '').trim(),
    praise: ($('#praise')?.value || '').trim(),
    mood: getSelectedMood(),
    summary: all[id]?.summary || null
  };
  saveAll(all);
  renderEntries(); renderStats(); renderCalendar();
}
function deleteCurrent(){
  const id = fmt(selectedDate);
  const all = loadAll();
  if(all[id]){
    delete all[id];
    saveAll(all);
    const diaryEl = $('#diary'); if(diaryEl) diaryEl.value='';
    const praiseEl = $('#praise'); if(praiseEl) praiseEl.value='';
    setSelectedMood(''); $('#summaryBox').style.display='none';
    renderEntries(); renderStats(); renderCalendar(); updateEditorHeader();
  }
}

// ===== 1~3문장 자연스러운 요약 후처리 =====
function formatNaturalSummary(text){
  if(!text) return '';
  let s = text
    .replace(/\r/g,' ')
    .replace(/\n+/g,' ')
    .replace(/^[\-\*\d\)\.]+\s*/g,'')
    .replace(/\s*[…]+/g,' ')
    .replace(/\s{2,}/g,' ')
    .trim();
  const parts = s.split(/(?<=[\.!?。！？])\s+/).map(x=>x.trim()).filter(Boolean);
  let kept = parts.slice(0,3);
  if (kept.length === 0) kept = [s];

  const endPunc = /[.!?。！？]$/;
  const politeKo = /(다|요|함|됨|했음|했어요|했습니다|였다|이었다|했다|였다가)$/;
  kept = kept.map(line=>{
    let t = line.replace(/\s*[…]+$/,'').trim();
    if (!endPunc.test(t) && !politeKo.test(t)) t += '다.';
    return t;
  });
  return kept.join(' ');
}

// ===== AI 요약 =====
async function summarize(){
  const proxy = document.querySelector('meta[name="proxy-url"]')?.content || '';
  if(!proxy) throw new Error('프록시가 설정되지 않았습니다.');

  const diary = ($('#diary')?.value || '').trim();
  const praise = ($('#praise')?.value || '').trim();
  const moodId = getSelectedMood();
  const moodName = MOOD_NAME[moodId] || '';

  if(!diary){ throw new Error('일기 내용을 먼저 입력해 주세요.'); }

  const info = [
    `일기: ${diary}`,
    moodName ? `감정: ${moodName}` : '',
    praise ? `칭찬: ${praise}` : ''
  ].filter(Boolean).join('\n');

  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role:"system", content:"너는 따뜻하고 간결한 한국어 일기 요약 도우미야." },
      { role:"user", content:
`다음 정보를 바탕으로 한국어 요약을 만들어줘.

형식:
- 반드시 "오늘은"으로 시작해.
- 원인–결과가 드러나게 자연스럽게 이어서 써(예: ~해서, ~하지만, ~이라, ~때문에).
- 문어체 과거형으로 끝내(~었다/~였다/~했다 등). 말줄임표(…/...)는 쓰지 마.
- 1~3문장만 작성해.

정보:
${info}` }
    ],
    temperature: 0.3
  };

  const res = await fetch(proxy + "/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });

  if(!res.ok){
    const txt = await res.text().catch(()=>res.statusText);
    throw new Error(`요약 실패: ${txt}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const fallback = await res.text().catch(()=> '');
    throw new Error(`요약 실패: 응답 형식이 올바르지 않습니다. ${fallback.slice(0,120)}`);
  }

  let data;
  try{ data = await res.json(); }
  catch(e){ throw new Error('요약 실패: 응답 파싱 오류가 발생했습니다.'); }

  const raw = data?.choices?.[0]?.message?.content?.trim() || '';
  return formatNaturalSummary(raw);
}

// ===== 기록 & 통계 =====
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function renderEntries(){
  const box = $('#entries'); if(!box) return;
  const all = loadAll();
  const keys = Object.keys(all).sort().reverse();
  box.innerHTML = '';
  if(keys.length===0){ box.innerHTML = `<div class="muted">아직 저장된 기록이 없습니다.</div>`; return; }
  keys.slice(0,80).forEach(k=>{
    const it = all[k];
    const mood = MOODS.find(m=>m.id===it.mood);
    const card = document.createElement('div');
    card.className='entry';
    card.innerHTML = `
      <div class="meta">
        <span class="chip">${k}</span>
        ${mood? `<span class="chip" style="background:#f7faff;color:#2563eb">${mood.em} ${mood.name}</span>`:''}
        ${it.praise? `<span class="muted">칭찬: ${escapeHtml(it.praise)}</span>`:''}
      </div>
      <div style="margin-top:6px;color:var(--ink);white-space:pre-wrap">${escapeHtml(it.text||'')}</div>
      ${it.summary && it.summary.text ? `
        <div class="entry" style="margin-top:8px;background:#fcfbff">
          <div class="meta"><span class="chip">AI 요약</span>
          <span class="muted">${new Date(it.summary.at).toLocaleString()}</span></div>
          <div style="margin-top:6px;white-space:pre-wrap">${escapeHtml(it.summary.text)}</div>
        </div>` : ''
      }
      <div class="actions">
        <button class="btn" data-jump="${k}" type="button">열기</button>
        <button class="btn" style="color:#ef4444;border-color:#ffd4d4;background:#fff5f5" data-del="${k}" type="button">삭제</button>
      </div>
    `;
    box.appendChild(card);
  });
  $$('button[data-jump]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.dataset.jump;
      const [y,m,d]=id.split('-').map(Number);
      selectedDate = new Date(y, m-1, d);
      view = new Date(y, m-1, 1);
      renderMonthBar(); renderCalendar(); loadEntryToEditor();
      showTab('Diary');
      window.scrollTo({top:0,behavior:'smooth'});
    });
  });
  $$('button[data-del]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.dataset.del;
      const all = loadAll();
      if(all[id]){ delete all[id]; saveAll(all); }
      if(fmt(selectedDate)===id){
        const diaryEl = $('#diary'); if(diaryEl) diaryEl.value='';
        const praiseEl = $('#praise'); if(praiseEl) praiseEl.value='';
        setSelectedMood(''); $('#summaryBox').style.display='none';
      }
      renderEntries(); renderStats(); renderCalendar();
    });
  });
}
function renderStats(){
  const box = $('#statsBox'); if(!box) return;
  const all = loadAll();
  const counts = {};
  Object.values(all).forEach(it=>{ if(it.mood){ counts[it.mood] = (counts[it.mood] || 0) + 1; }});
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  const top3 = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3);

  if(total===0){
    box.innerHTML = `
      <div class="stat"><div class="k">총 기록</div><div class="v">0</div></div>
      <div class="stat"><div class="k">최다 감정</div><div class="v">-</div></div>
      <div class="stat"><div class="k">감정 종류</div><div class="v">0</div></div>
    `;
  }else{
    const best = top3[0] ? (MOODS.find(m=>m.id===top3[0][0])?.name+' '+top3[0][1]+'회') : '-';
    box.innerHTML = `
      <div class="stat"><div class="k">총 기록</div><div class="v">${Object.keys(all).length}</div></div>
      <div class="stat"><div class="k">최다 감정</div><div class="v">${best||'-'}</div></div>
      <div class="stat"><div class="k">감정 종류</div><div class="v">${Object.keys(counts).length}</div></div>
    `;
  }
}

// ===== 버튼 & 흐름 =====
function bindFlowButtons(){
  const btn = document.getElementById('nextToDiary');
  if(!btn) return;
  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);
  fresh.addEventListener('pointerup', (e)=>{
    e.preventDefault(); e.stopImmediatePropagation();
    saveCurrent();
    showTab('Diary');
    updateEditorHeader();
  }, {passive:false});
}
function bindDiaryButtons(){
  // 저장
  const save = document.getElementById('saveBtn');
  if(save){
    const s2 = save.cloneNode(true);
    save.parentNode.replaceChild(s2, save);
    s2.addEventListener('pointerup', (e)=>{ e.preventDefault(); saveCurrent(); alert('저장했어요.'); showTab('Calendar'); }, {passive:false});
  }
  // 삭제
  const del = document.getElementById('delBtn');
  if(del){
    const d2 = del.cloneNode(true);
    del.parentNode.replaceChild(d2, del);
    d2.addEventListener('pointerup', (e)=>{ e.preventDefault(); if(confirm('이 날짜의 기록을 삭제할까요?')) deleteCurrent(); }, {passive:false});
  }
  // AI 요약
  const summ = document.getElementById('summBtn');
  if(summ){
    const m2 = summ.cloneNode(true);
    summ.parentNode.replaceChild(m2, summ);
    m2.addEventListener('pointerup', async (e)=>{
      e.preventDefault();
      const diaryText = ($('#diary')?.value || '').trim();
      const box = $('#summaryBox'); const textEl = $('#summaryText'); const timeEl = $('#summaryTime');
      box.style.display = '';
      if(!diaryText){
        textEl.innerHTML = '<span style="color:#ef4444">일기 내용을 먼저 입력해 주세요.</span>';
        timeEl.textContent = '';
        return;
      }
      m2.disabled = true; m2.textContent = '요약 중...';
      textEl.textContent = '요약을 생성하고 있어요…';
      timeEl.textContent = '';
      try{
        const sum = await summarize();
        textEl.textContent = sum;
        timeEl.textContent = `(${new Date().toLocaleString()})`;

        const id = fmt(selectedDate);
        const all = loadAll();
        const it = all[id] || {};
        it.summary = {text: sum, at: Date.now()};
        all[id] = {
          text: ($('#diary')?.value || '').trim(),
          praise: ($('#praise')?.value || '').trim(),
          mood: getSelectedMood(),
          summary: it.summary
        };
        saveAll(all);
        renderEntries();
      }catch(err){
        console.warn(err);
        textEl.innerHTML = `<span style="color:#ef4444">${(err && err.message) ? err.message : '요약 중 오류가 발생했습니다.'}</span>`;
        timeEl.textContent = '';
      }finally{
        m2.disabled = false; m2.textContent = 'AI 요약';
      }
    }, {passive:false});
  }
}

// ===== 초기화 =====
function init(){
  renderMonthBar();
  renderCalendar();
  renderMoods('');
  loadEntryToEditor();
  bindMonthButtons();
  bindFlowButtons();
  bindDiaryButtons();
}
init();
