// ============================================================
// SIRIAI PM — App v3 (3-Phase lifecycle model)
// ============================================================

/* globals Store, CONFIG */

// ── CONSTANTS ────────────────────────────────────────────────
const STATUSES = [
  '1. 브랜드 소통',
  '2. 모집중',
  '3. 컨펌 단계',
  '4. 컨텐츠 업로드',
  '5. 캠페인 종료',
  '6. 입금 확인',
  '7. 상시 진행',
  '기타/이슈',
];

// DB값 → UI 레이블 + 색 클래스
const STATUS_META = {
  '1. 브랜드 소통':   { cls: 's1', label: '브랜드 소통' },
  '2. 모집중':        { cls: 's2', label: '모집중' },
  '3. 컨펌 단계':     { cls: 's3', label: '컨펌 단계' },
  '4. 컨텐츠 업로드': { cls: 's4', label: '업로드중' },
  '5. 캠페인 종료':   { cls: 's5', label: '납품완료' },
  '6. 입금 확인':     { cls: 's6', label: '입금확인중' },
  '7. 상시 진행':     { cls: 's7', label: '상시진행' },
  '기타/이슈':        { cls: 'sX', label: '보류' },
};

const PAY_STATUSES = ['미입금', '입금완료', '부분입금', '분쟁', '해당없음'];

const PAY_META = {
  '입금완료': { cls: 'pay-done',    label: '입금완료 ✓' },
  '미입금':   { cls: 'pay-unpaid',  label: '미입금' },
  '부분입금': { cls: 'pay-partial', label: '부분입금' },
  '분쟁':     { cls: 'pay-dispute', label: '분쟁' },
  '해당없음': { cls: 'pay-na',      label: '—' },
};

const QA_META = {
  '검수전': { cls: 'qa-badge qa-검수전', label: '검수전' },
  '검수중': { cls: 'qa-badge qa-검수중', label: '검수중' },
  '완료':   { cls: 'qa-badge qa-완료',   label: '완료' },
  '이슈':   { cls: 'qa-badge qa-이슈',   label: '이슈' },
};

const PHASE_GROUP_META = {
  delivery:   { label: '납품 준비 중',    cls: 'delivery' },
  upload:     { label: '업로드 진행 중',  cls: 'upload' },
  settlement: { label: '정산 진행 중',    cls: 'settlement' },
  done:       { label: '전체 완료',       cls: 'done' },
  issue:      { label: '보류 · 홀딩',     cls: 'issue' },
  ongoing:    { label: '상시 진행',       cls: 'ongoing' },
};

// ── 3-PHASE MODEL ────────────────────────────────────────────
function phaseADone(c) {
  return ['4. 컨텐츠 업로드', '5. 캠페인 종료', '6. 입금 확인'].includes(c.status);
}

function phaseBDone(c) {
  // status 5/6: 수동 납품완료 처리 (force-complete)
  if (['5. 캠페인 종료', '6. 입금 확인'].includes(c.status)) return true;
  // status 4: 업로드 수량이 채워진 경우
  if (c.status === '4. 컨텐츠 업로드' && c.count_select > 0) {
    return (c.count_upload || 0) >= c.count_select;
  }
  return false;
}

function phaseCDone(c) {
  return c.pay_status === '입금완료';
}

function isFullyDone(c) {
  return phaseADone(c) && phaseBDone(c) && phaseCDone(c);
}

function getPhaseGroup(c) {
  if (c.status === '7. 상시 진행') return 'ongoing';
  if (c.status === '기타/이슈' || c.qa_status === '이슈') return 'issue';
  if (isFullyDone(c)) return 'done';
  if (phaseBDone(c))  return 'settlement';  // B완료, C미완료
  if (phaseADone(c))  return 'upload';      // A완료, B미완료
  return 'delivery';                         // A미완료
}

function isUrgent(c) {
  if (isFullyDone(c) || c.is_archived) return false;
  const nearDeadline = c._dday !== null && c._dday !== undefined && c._dday >= 0 && c._dday <= 2;
  const hasIssue     = c.qa_status === '이슈';  // status='기타/이슈'(보류)는 의도적 홀딩이므로 긴급 아님
  const unpaidDone   = phaseBDone(c) && !phaseCDone(c);
  return nearDeadline || hasIssue || unpaidDone;
}

// ── UTILS ─────────────────────────────────────────────────────
const fmt = {
  money:     n => n ? (n / 10000).toFixed(0) + '만' : '—',
  moneyFull: n => n ? n.toLocaleString('ko-KR') + '원' : '—',
  date:      s => s ? s.slice(0, 10) : '—',
  dateShort: s => s ? s.slice(5).replace('-', '/') : '—',
};

// KPI 카드용 콤마 포매터: { main:'6,662', unit:'만원' }
function fmtKpi(n) {
  if (!n) return { main: '—', unit: '' };
  return { main: Math.round(n / 10000).toLocaleString('ko-KR'), unit: '만원' };
}

function dday(c) {
  if (c._dday === null || c._dday === undefined) return '';
  if (c._dday < 0)   return `D+${Math.abs(c._dday)}`;
  if (c._dday === 0) return 'D-DAY';
  return `D-${c._dday}`;
}

function ddayCls(c) {
  if (c._dday === null || c._dday === undefined || c._dday < 0) return 'past';
  if (c._dday <= 2) return 'urgent';
  if (c._dday <= 7) return 'near';
  return 'ok';
}

function escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusBadge(status, clickable = false) {
  const m = STATUS_META[status] || { cls: 'sX', label: status };
  return `<span class="badge ${m.cls}"${clickable ? ' data-status-btn' : ''}><span class="badge-dot"></span>${m.label}</span>`;
}

function payBadge(pay, clickable = false) {
  if (!pay || pay === '해당없음') return clickable
    ? `<span class="pay-badge pay-na" style="cursor:pointer">—</span>`
    : `<span class="pay-na">—</span>`;
  const m = PAY_META[pay] || { cls: 'pay-na', label: pay };
  return `<span class="pay-badge ${m.cls}"${clickable ? '' : ''}>${m.label}</span>`;
}

function qaBadge(qa) {
  const m = QA_META[qa] || { cls: 'qa-badge qa-검수전', label: qa || '검수전' };
  return `<span class="${m.cls}">${m.label}</span>`;
}

function progressBar(sel, up) {
  if (!sel) return '<span class="text-muted text-sm">—</span>';
  const pct = Math.round(((up || 0) / sel) * 100);
  const cls = pct >= 100 ? 'full' : pct > 0 ? 'partial' : 'zero';
  return `<div class="progress-cell">
    <div class="progress-nums"><strong>${up || 0}</strong>/${sel} <span class="text-xs">(${pct}%)</span></div>
    <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${Math.min(pct,100)}%"></div></div>
  </div>`;
}

function linkBtn(href, label, cls = '') {
  if (!href) return '';
  return `<a href="${escHtml(href)}" target="_blank" rel="noopener" class="link-btn ${cls}">${label} ↗</a>`;
}

// ── STATE ──────────────────────────────────────────────────────
const State = {
  view:               'campaigns',  // 'home' | 'campaigns' | 'finance'
  selectedClient:     null,         // null = 전체 | '거래처명'
  selectedCampaignId: null,
  filters: {
    phase:     null,   // null | 'delivery' | 'upload' | 'settlement' | 'done' | 'issue' | 'ongoing'
    payStatus: null,   // null | '미입금' | '부분입금' | '입금완료'
    client:    null,   // null | '거래처명'
    search:    '',
  },
  collapsedGroups:   {},   // { groupKey: true/false }
  drawerSections:    {},
};

// ── FINANCE STATE ───────────────────────────────────────────────
const FinanceState = {
  period:  'all',        // 'thisMonth' | 'lastMonth' | 'quarter' | 'year' | 'all'
  dateKey: 'date_tax',   // 'date_tax' | 'date_end' | 'date_delivery'
  tab:     'summary',    // 'summary' | 'monthly' | 'client'
};

// ── TOAST ──────────────────────────────────────────────────────
function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

// ── ALERTS ────────────────────────────────────────────────────
function computeAlerts() {
  const campaigns = Store.getCampaigns().filter(c => !c.is_archived);
  const alerts = { urgent: [], warn: [], unpaid: [], qa: [], issue: [] };
  campaigns.forEach(c => {
    if (!isFullyDone(c)) {
      if (c._dday !== null && c._dday !== undefined && c._dday >= 0 && c._dday <= 2) alerts.urgent.push(c);
      else if (c._dday !== null && c._dday !== undefined && c._dday > 2 && c._dday <= 7) alerts.warn.push(c);
    }
    if (['미입금', '부분입금'].includes(c.pay_status) && c.revenue > 0) alerts.unpaid.push(c);
    if (c.qa_status === '이슈') alerts.qa.push(c);
    if (c.status === '기타/이슈') alerts.issue.push(c);
  });
  return alerts;
}

const Notif = {
  _renderDropdown() {
    const alerts = computeAlerts();
    const groups = [
      { key: 'urgent', label: '🔴 D-2 이내 마감', items: alerts.urgent, dot: 'urgent', meta: c => dday(c) },
      { key: 'warn',   label: '🟡 D-7 이내 마감', items: alerts.warn,   dot: 'warn',   meta: c => dday(c) },
      { key: 'unpaid', label: '💸 미입금',         items: alerts.unpaid, dot: 'warn',   meta: c => fmt.money(c.revenue) + '원' },
      { key: 'qa',     label: '⚠ QA 이슈',        items: alerts.qa,    dot: 'urgent', meta: () => 'QA 이슈' },
      { key: 'issue',  label: '🔧 기타/이슈',       items: alerts.issue, dot: 'info',   meta: () => '확인 필요' },
    ];
    const html = groups.filter(g => g.items.length > 0).map(g => `
      <div>
        <div class="alert-group-title">${g.label} (${g.items.length})</div>
        ${g.items.map(c => `
          <div class="alert-item" onclick="App.selectCampaign('${c.id}');Notif.close()">
            <span class="alert-dot ${g.dot}"></span>
            <span class="alert-name">${escHtml(c.name)}</span>
            <span class="alert-meta">${escHtml(g.meta(c))}</span>
          </div>`).join('')}
      </div>`).join('') || '<div class="alert-empty">알림 없음 ✓</div>';
    const body = document.getElementById('notifBody');
    if (body) body.innerHTML = html;
  },
  open() {
    this._renderDropdown();
    document.getElementById('notifDropdown')?.classList.add('open');
    document.addEventListener('click', Notif._outside, true);
  },
  close() {
    document.getElementById('notifDropdown')?.classList.remove('open');
    document.removeEventListener('click', Notif._outside, true);
  },
  toggle() {
    const dd = document.getElementById('notifDropdown');
    if (dd?.classList.contains('open')) this.close(); else this.open();
  },
  _outside(e) {
    const wrap = document.getElementById('notifWrap');
    if (wrap && !wrap.contains(e.target)) Notif.close();
  },
};

// ── STATUS DROPDOWN ────────────────────────────────────────────
const StatusDD = {
  _id: null,

  open(campaignId, anchorEl) {
    StatusDD._id = campaignId;
    const c = Store.getCampaignById(campaignId);
    const el = document.getElementById('statusDropdown');

    const groups = [
      { label: 'PHASE A — 납품 준비', items: ['1. 브랜드 소통', '2. 모집중', '3. 컨펌 단계'] },
      { label: 'PHASE B — 콘텐츠', items: ['4. 컨텐츠 업로드', '5. 캠페인 종료'] },
      { label: 'PHASE C — 정산', items: ['6. 입금 확인'] },
      { label: '특수', items: ['7. 상시 진행', '기타/이슈'] },
    ];

    el.innerHTML = groups.map(g => `
      <div class="status-dropdown-label">${g.label}</div>
      ${g.items.map(s => {
        const m = STATUS_META[s];
        return `<div class="status-option${s === c?.status ? ' current' : ''}" onclick="StatusDD.select('${s}')">
          <span class="badge ${m.cls}" style="pointer-events:none"><span class="badge-dot"></span>${m.label}</span>
        </div>`;
      }).join('')}
      <div class="status-dropdown-divider"></div>
    `).join('');

    const rect = anchorEl.getBoundingClientRect();
    el.style.top  = (rect.bottom + 4) + 'px';
    el.style.left = rect.left + 'px';
    el.classList.add('open');
    document.addEventListener('click', StatusDD._outside, true);
  },

  close() {
    document.getElementById('statusDropdown').classList.remove('open');
    document.removeEventListener('click', StatusDD._outside, true);
  },

  async select(newStatus) {
    const c = Store.getCampaignById(StatusDD._id);
    StatusDD.close();
    if (!c || c.status === newStatus) return;

    const FORWARD = STATUSES.indexOf(newStatus) > STATUSES.indexOf(c.status);
    const SPECIAL_BACK = !FORWARD && newStatus !== '기타/이슈' && newStatus !== '7. 상시 진행';

    if (SPECIAL_BACK) {
      Modal.prompt({
        title: '상태 역방향 전환',
        label: `${c.status} → ${newStatus} 사유를 입력하세요`,
        placeholder: '예: 제품 배송 지연으로 재모집',
        onConfirm: async (reason) => {
          await Store.updateStatus(StatusDD._id, newStatus, reason);
          App.renderAll();
          toast('상태 변경됨', 'ok');
        },
      });
    } else {
      await Store.updateStatus(StatusDD._id, newStatus);
      App.renderAll();
      toast('상태 변경됨', 'ok');
    }
  },

  _outside(e) {
    if (!document.getElementById('statusDropdown').contains(e.target)) StatusDD.close();
  },
};

// ── PAY DROPDOWN ───────────────────────────────────────────────
const PayDD = {
  _id: null,

  open(campaignId, anchorEl) {
    PayDD._id = campaignId;
    const c = Store.getCampaignById(campaignId);
    const el = document.getElementById('payDropdown');

    el.innerHTML = PAY_STATUSES.map(s => {
      const m = PAY_META[s];
      return `<div class="pay-option${s === c?.pay_status ? ' current' : ''}" onclick="PayDD.select('${s}')">
        <span class="pay-badge ${m.cls}" style="pointer-events:none">${m.label}</span>
      </div>`;
    }).join('');

    const rect = anchorEl.getBoundingClientRect();
    el.style.top  = (rect.bottom + 4) + 'px';
    el.style.left = rect.left + 'px';
    el.classList.add('open');
    document.addEventListener('click', PayDD._outside, true);
  },

  close() {
    document.getElementById('payDropdown').classList.remove('open');
    document.removeEventListener('click', PayDD._outside, true);
  },

  async select(newPay) {
    const id = PayDD._id;
    PayDD.close();
    await Store.updateCampaign(id, { pay_status: newPay });
    App.renderAll();
    toast('입금 상태 변경됨', 'ok');
  },

  _outside(e) {
    if (!document.getElementById('payDropdown').contains(e.target)) PayDD.close();
  },
};

// ── INLINE EDIT ────────────────────────────────────────────────
const InlineEdit = {
  start(el, campaignId, key, type) {
    if (el.dataset.editing) return;
    const c = Store.getCampaignById(campaignId);
    if (!c) return;

    const rawVal = c[key] ?? '';
    el.dataset.editing = '1';
    el.textContent = '';

    let input;
    if (type.startsWith('select:')) {
      const opts = type.slice(7).split(',');
      input = document.createElement('select');
      input.className = 'inline-input';
      opts.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o; opt.textContent = o;
        if (String(o) === String(rawVal)) opt.selected = true;
        input.appendChild(opt);
      });
    } else if (type === 'textarea') {
      input = document.createElement('textarea');
      input.className = 'inline-input';
      input.rows = 3; input.style.width = '100%';
      input.value = rawVal;
    } else {
      input = document.createElement('input');
      input.className = 'inline-input';
      input.type = type === 'url' ? 'text' : type;
      input.style.width = '100%';
      input.value = rawVal;
    }

    let done = false;
    const commit = async () => {
      if (done) return; done = true;
      let val = input.value;
      if (type === 'number') val = parseInt(val) || 0;
      if (!val && (type === 'date' || type === 'url')) val = null;
      el.removeAttribute('data-editing');
      el.textContent = val || '—';
      try {
        await Store.updateCampaign(campaignId, { [key]: val });
        const panel = document.getElementById('detailPanel');
        const scrollTop = panel?.scrollTop || 0;
        App._rerenderRow(campaignId);
        Detail.render(campaignId);
        if (panel) panel.scrollTop = scrollTop;
        toast('저장됨', 'ok');
      } catch (e) { toast('저장 실패', 'err'); }
    };
    const revert = () => {
      if (done) return; done = true;
      el.removeAttribute('data-editing');
      const fresh = Store.getCampaignById(campaignId);
      el.textContent = (fresh?.[key] ?? '') || '—';
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && type !== 'textarea') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { e.preventDefault(); input.removeEventListener('blur', commit); revert(); }
    });
    if (type.startsWith('select:')) input.addEventListener('change', () => input.blur());
    el.appendChild(input);
    requestAnimationFrame(() => input.focus());
  },
};

// ── MODAL ──────────────────────────────────────────────────────
const Modal = {
  show(html, opts = {}) {
    document.getElementById('modalTitle').textContent = opts.title || '';
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalFooter').innerHTML = '';
    document.getElementById('modalOverlay').classList.remove('hidden');
  },
  hide() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.getElementById('modalBody').innerHTML = '';
  },
  prompt({ title, label, placeholder, onConfirm }) {
    Modal.show(`
      <div class="field">
        <label>${escHtml(label)}</label>
        <textarea id="promptInput" rows="3" placeholder="${escHtml(placeholder)}"></textarea>
      </div>
    `, { title });
    document.getElementById('modalFooter').innerHTML = `
      <button class="btn" onclick="Modal.hide()">취소</button>
      <button class="btn btn-primary" onclick="Modal._confirmPrompt()">확인</button>
    `;
    Modal._onConfirm = onConfirm;
    setTimeout(() => document.getElementById('promptInput')?.focus(), 50);
  },
  async _confirmPrompt() {
    const val = document.getElementById('promptInput').value.trim();
    if (!val) { toast('사유를 입력해주세요', 'warn'); return; }
    Modal.hide();
    await Modal._onConfirm(val);
  },
  confirm({ title, message, danger, onConfirm }) {
    Modal.show(`<p style="font-size:13px;color:var(--ink70);line-height:1.6">${escHtml(message)}</p>`, { title });
    document.getElementById('modalFooter').innerHTML = `
      <button class="btn" onclick="Modal.hide()">취소</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" onclick="Modal._confirmAction()">확인</button>
    `;
    Modal._onConfirm = onConfirm;
  },
  async _confirmAction() {
    Modal.hide();
    await Modal._onConfirm();
  },
};

// ── DRAWER (detail panel content renderer) ─────────────────────
const Drawer = {
  toggleSection(key) {
    State.drawerSections[key] = !State.drawerSections[key];
    const body = document.getElementById(`ds-body-${key}`);
    const icon = document.getElementById(`ds-icon-${key}`);
    if (body) body.classList.toggle('collapsed', !State.drawerSections[key]);
    if (icon) icon.textContent = State.drawerSections[key] ? '▼' : '▶';
    if (key === 'log' && State.drawerSections.log) Drawer.loadLog();
  },

  renderQuickActions(c) {
    const links = [
      c.link_progress && linkBtn(c.link_progress, '진행시트', 'prog'),
      c.link_qa       && linkBtn(c.link_qa,       'QA시트',   'qa'),
      c.link_guide    && linkBtn(c.link_guide,     '가이드',   'guide'),
      c.link_recruit  && linkBtn(c.link_recruit,   '모집',     ''),
    ].filter(Boolean);
    return links.length ? `<div class="drawer-quick-actions">${links.join('')}</div>` : '';
  },

  renderBody(c) {
    const field = (label, key, val, type = 'text', hint = '') => `
      <div class="drawer-row">
        <span class="drawer-row-label"${hint ? ` title="${escHtml(hint)}"` : ''}>${label}${hint ? ' <span class="hint-icon">ⓘ</span>' : ''}</span>
        <span class="drawer-row-val">
          <span class="editable-val" onclick="InlineEdit.start(this,'${c.id}','${key}','${type}')">${escHtml(val !== null && val !== undefined ? String(val) : '—')}</span>
        </span>
      </div>`;

    const dsec = (key, title, content) => {
      const open = !!State.drawerSections[key];
      return `
        <div class="detail-section">
          <div class="detail-section-title detail-section-toggle" onclick="Drawer.toggleSection('${key}')">
            <span id="ds-icon-${key}" class="ds-arrow">${open ? '▼' : '▶'}</span> ${title}
          </div>
          <div id="ds-body-${key}" class="detail-section-body${open ? '' : ' collapsed'}">${content}</div>
        </div>`;
    };

    const coreContent = `
      ${field('거래처', 'client_name', c.client_name)}
      ${field('담당 채널', 'entity', c.entity, 'text', 'SIRIAI 직접 운영 vs 타 대행사')}
      <div class="drawer-row">
        <span class="drawer-row-label">기간</span>
        <span class="drawer-row-val" style="font-size:12px;color:var(--ink60)">${fmt.date(c.date_start)} → ${fmt.date(c.date_end)}</span>
      </div>
      ${field('납품 예정일', 'date_delivery', c.date_delivery, 'date')}
      ${field('국가', 'country', c.country, 'select:국내,해외')}
      ${field('캠페인 코드', 'uv', c.uv, 'text', '내부 관리용 고유 코드')}
      ${field('상세 내용', 'detail', c.detail, 'textarea')}
    `;

    const uploadContent = `
      ${field('제공 수', 'count_provide', c.count_provide, 'number', '브랜드 제공 가능 인원')}
      ${field('섭외 완료', 'count_select', c.count_select, 'number', '컨펌된 인플루언서 수')}
      ${field('업로드 완료', 'count_upload', c.count_upload, 'number', '콘텐츠 업로드 완료 인원')}
      ${c.count_select ? `<div style="padding:6px 0">${progressBar(c.count_select, c.count_upload)}</div>` : ''}
    `;

    const qaContent = `
      <div class="drawer-row">
        <span class="drawer-row-label">검수 상태</span>
        <span class="drawer-row-val">
          <span class="editable-val" onclick="InlineEdit.start(this,'${c.id}','qa_status','select:검수전,검수중,완료,이슈')">${qaBadge(c.qa_status)}</span>
        </span>
      </div>
      <div class="drawer-row" style="align-items:flex-start">
        <span class="drawer-row-label" style="padding-top:4px">검수 메모</span>
        <span class="drawer-row-val">
          <textarea id="qaNoteInput" rows="3" style="width:100%;padding:7px;border:1px solid var(--ink15);border-radius:6px;font-family:inherit;font-size:12px;resize:vertical;outline:none"
            placeholder="검수 내용, 이슈 사항…">${escHtml(c.qa_note || '')}</textarea>
          <button class="btn btn-sm btn-primary" style="margin-top:5px" onclick="Drawer.saveQANote('${c.id}')">저장</button>
        </span>
      </div>
    `;

    const financeContent = `
      ${field('매출', 'revenue', c.revenue ? c.revenue.toLocaleString() : null, 'number')}
      ${field('원고료', 'fee', c.fee ? c.fee.toLocaleString() : null, 'number')}
      <div class="drawer-row">
        <span class="drawer-row-label">순이익</span>
        <span class="drawer-row-val ${c._profit > 0 ? 'money pos' : ''}">${fmt.moneyFull(c._profit)}${c._margin ? ` <span class="text-muted text-xs">(${c._margin}%)</span>` : ''}</span>
      </div>
      <div class="drawer-row">
        <span class="drawer-row-label">입금 상태</span>
        <span class="drawer-row-val">
          <span class="${['미입금','부분입금'].includes(c.pay_status)?'unpaid-warn':''}"
                style="cursor:pointer" onclick="PayDD.open('${c.id}',this)">${payBadge(c.pay_status)}</span>
        </span>
      </div>
      ${field('견적서 발행일', 'date_quote', c.date_quote, 'date')}
      ${field('세금계산서 발행일', 'date_tax', c.date_tax, 'date')}
    `;

    const linksContent = `
      ${field('모집 링크', 'link_recruit', c.link_recruit, 'url')}
      ${field('진행 시트', 'link_progress', c.link_progress, 'url')}
      ${field('QA 시트', 'link_qa', c.link_qa, 'url')}
      ${field('캠페인 가이드', 'link_guide', c.link_guide, 'url')}
    `;

    return `
      <div class="detail-section">
        <div class="detail-section-title">핵심 정보</div>
        ${coreContent}
      </div>
      ${dsec('upload', '업로드 현황', uploadContent)}
      ${dsec('qa', 'QA 검수', qaContent)}
      ${dsec('finance', '재무', financeContent)}
      <div class="detail-section">
        <div class="detail-section-title">링크 모음</div>
        ${linksContent}
      </div>
      <div class="detail-section">
        <div class="detail-section-title">비고</div>
        ${field('비고', 'note', c.note, 'textarea')}
      </div>
      ${dsec('log', '변경 이력', '<div id="ds-log-content"><span class="text-muted text-sm" style="padding:4px 0;display:block">클릭해서 펼치면 로드됩니다</span></div>')}
    `;
  },

  async loadLog() {
    const logContent = document.getElementById('ds-log-content');
    if (!logContent || logContent.dataset.loaded) return;
    const c = Store.getCampaignById(State.selectedCampaignId);
    if (!c) return;
    logContent.innerHTML = '<div class="text-muted text-sm" style="padding:8px 0">로딩 중…</div>';
    const logs = await Store.getLogs(c.id, 40);
    logContent.dataset.loaded = '1';
    if (!logs.length) {
      logContent.innerHTML = '<div class="empty-state" style="padding:16px 0;font-size:12px">변경 이력 없음</div>';
      return;
    }
    logContent.innerHTML = `<div class="log-list">${logs.map(l => `
      <div class="log-item">
        <span class="log-time">${new Date(l.changed_at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
        <span class="log-msg"><strong>${escHtml(l.field)}</strong>${l.old_value ? `<span class="text-muted"> ${escHtml(l.old_value)} →</span>` : ''} ${escHtml(l.new_value || '')}</span>
      </div>`).join('')}</div>`;
  },

  async saveQANote(id) {
    const note = document.getElementById('qaNoteInput').value;
    await Store.updateCampaign(id, { qa_note: note, qa_updated_at: new Date().toISOString() });
    toast('QA 메모 저장됨', 'ok');
  },

  archiveConfirm(id) {
    const c = Store.getCampaignById(id);
    Modal.confirm({
      title: '아카이브',
      message: `"${c?.name}" 캠페인을 아카이브 하시겠습니까?`,
      onConfirm: async () => {
        await Store.archiveCampaign(id);
        State.selectedCampaignId = null;
        App.renderAll();
        toast('아카이브 완료', 'ok');
      },
    });
  },
};

// ── DETAIL PANEL ───────────────────────────────────────────────
const Detail = {
  render(id) {
    const panel = document.getElementById('detailPanel');
    if (!panel) return;

    if (!id) {
      panel.classList.remove('open');
      return;
    }

    const c = Store.getCampaignById(id);
    if (!c) { panel.classList.remove('open'); return; }

    // Auto-expand sections on first open
    if (!Object.keys(State.drawerSections).length) {
      State.drawerSections = {
        upload:  c.status === '4. 컨텐츠 업로드',
        qa:      !!(c.qa_status && c.qa_status !== '검수전'),
        finance: phaseADone(c) || ['미입금','부분입금'].includes(c.pay_status),
        log:     false,
      };
    }

    // Phase tracker content
    const pA = phaseADone(c);
    const pB = phaseBDone(c);
    const pC = phaseCDone(c);

    const aStatus = STATUS_META[c.status]?.label || c.status;
    const bStatus = pB
      ? '납품완료 ✓'
      : (c.status === '4. 컨텐츠 업로드' && c.count_select > 0)
        ? `${c.count_upload || 0}/${c.count_select}`
        : '—';
    const cStatus = c.pay_status ? (PAY_META[c.pay_status]?.label || c.pay_status) : '—';

    const phaseTracker = `
      <div class="phase-tracker">
        <div class="phase-block">
          <div class="phase-block-label">A 납품 준비</div>
          <div class="phase-block-status ${pA ? 'done' : 'active'}">${pA ? '완료 ✓' : aStatus}</div>
        </div>
        <div class="phase-arrow">→</div>
        <div class="phase-block">
          <div class="phase-block-label">B 콘텐츠</div>
          <div class="phase-block-status ${pB ? 'done' : pA ? 'active' : 'pending'}">${bStatus}</div>
        </div>
        <div class="phase-arrow">→</div>
        <div class="phase-block">
          <div class="phase-block-label">C 정산</div>
          <div class="phase-block-status ${pC ? 'done' : pB ? 'active' : 'pending'}">${cStatus}</div>
        </div>
      </div>`;

    const ddText = dday(c);
    const ddC = ddayCls(c);
    const meta = STATUS_META[c.status] || { cls: 'sX', label: c.status };

    panel.innerHTML = `
      <div class="detail-inner">
        <div class="detail-close-bar">
          <button class="detail-close-btn" onclick="App.closeDetail()">✕</button>
          <div style="display:flex;align-items:center;gap:8px">
            ${ddText ? `<span class="dday ${ddC}">${ddText}</span>` : ''}
            <button class="btn-ghost-danger" onclick="Drawer.archiveConfirm('${c.id}')">아카이브</button>
          </div>
        </div>
        <div class="detail-title-area">
          <div class="detail-campaign-name">${escHtml(c.name)}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap">
            <span class="badge ${meta.cls}" style="cursor:pointer" onclick="StatusDD.open('${c.id}',this)">
              <span class="badge-dot"></span>${meta.label}
            </span>
            ${c.client_name ? `<span style="font-size:11px;color:var(--ink50)">${escHtml(c.client_name)}</span>` : ''}
          </div>
        </div>
        ${phaseTracker}
        <div class="detail-links">${Drawer.renderQuickActions(c)}</div>
        <div class="detail-divider"></div>
        <div class="detail-body">${Drawer.renderBody(c)}</div>
      </div>
    `;

    panel.classList.add('open');
    if (State.drawerSections.log) Drawer.loadLog();
  },
};

// ── FILTERING ─────────────────────────────────────────────────
function applyFilters(campaigns) {
  let data = campaigns.filter(c => !c.is_archived);
  const f = State.filters;

  if (State.selectedClient) data = data.filter(c => c.client_name === State.selectedClient);
  if (f.phase) data = data.filter(c => getPhaseGroup(c) === f.phase);
  if (f.payStatus) data = data.filter(c => c.pay_status === f.payStatus);
  if (f.client) data = data.filter(c => c.client_name === f.client);
  if (f.search) {
    const q = f.search.toLowerCase();
    data = data.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.client_name || '').toLowerCase().includes(q) ||
      (c.detail || '').toLowerCase().includes(q)
    );
  }
  return data;
}

function hasActiveFilters() {
  const f = State.filters;
  return !!(f.phase || f.payStatus || f.client || f.search);
}

// ── RENDER: B-UPLOAD COLUMN ────────────────────────────────────
function renderBUpload(c) {
  if (['5. 캠페인 종료', '6. 입금 확인'].includes(c.status)) {
    return `<span class="b-upload-text done">납품완료 ✓</span>`;
  }
  if (c.status === '4. 컨텐츠 업로드') {
    if (c.count_select > 0) {
      const up = c.count_upload || 0;
      const sel = c.count_select;
      const pct = Math.round((up / sel) * 100);
      const cls = pct >= 100 ? 'full' : 'partial';
      return `
        <div>
          <div class="b-upload-count">${up}/${sel}</div>
          <div class="b-upload-bar"><div class="b-upload-fill ${cls}" style="width:${Math.min(pct,100)}%"></div></div>
        </div>`;
    }
    return `<span class="b-upload-text uploading">업로드중</span>`;
  }
  return `<span class="b-upload-text none">—</span>`;
}

// ── RENDER: CAMPAIGN ROW ──────────────────────────────────────
function renderCampaignRow(c) {
  const ddText = dday(c);
  const ddC = ddayCls(c);
  const isSelected = State.selectedCampaignId === c.id;
  const urgent = isUrgent(c);
  const done = isFullyDone(c);
  const meta = STATUS_META[c.status] || { cls: 'sX', label: c.status };

  const subParts = [];
  if (c.date_delivery) subParts.push('납품 ' + fmt.dateShort(c.date_delivery));
  else if (c.date_end)  subParts.push(fmt.dateShort(c.date_end) + ' 마감');

  return `
    <div class="camp-row${isSelected ? ' selected' : ''}${urgent ? ' urgent' : ''}${done ? ' is-done' : ''}"
         onclick="App.selectCampaign('${c.id}')">
      <div class="camp-col-check">
        <div class="camp-checkbox"></div>
      </div>
      <div class="camp-col-aphase">
        <span class="badge ${meta.cls}" style="font-size:9px;padding:2px 6px;cursor:pointer"
              onclick="event.stopPropagation();StatusDD.open('${c.id}',this)">
          <span class="badge-dot"></span>${meta.label}
        </span>
      </div>
      <div class="camp-col-name">
        <div class="camp-row-name">${escHtml(c.name)}</div>
        ${subParts.length ? `<div class="camp-row-sub">${escHtml(subParts.join(' · '))}</div>` : ''}
      </div>
      <div class="camp-col-client">${escHtml(c.client_name || '')}</div>
      <div class="camp-col-bupload">${renderBUpload(c)}</div>
      <div class="camp-col-cpay" onclick="event.stopPropagation();PayDD.open('${c.id}',this)">
        ${payBadge(c.pay_status, true)}
      </div>
      <div class="camp-col-dday">
        ${ddText ? `<span class="dday ${ddC}">${ddText}</span>` : ''}
      </div>
    </div>`;
}

// ── RENDER: PHASE GROUP ───────────────────────────────────────
function renderPhaseGroup(groupKey, campaigns) {
  if (!campaigns.length) return '';
  const meta = PHASE_GROUP_META[groupKey] || { label: groupKey, cls: groupKey };
  const collapsed = !!State.collapsedGroups[groupKey];
  // done group defaults to collapsed
  const isDefaultCollapsed = groupKey === 'done';
  const isCollapsed = State.collapsedGroups[groupKey] === undefined ? isDefaultCollapsed : collapsed;

  return `
    <div class="phase-group-header ${meta.cls}${isCollapsed ? ' collapsed' : ''}"
         onclick="App.toggleGroup('${groupKey}')">
      <span class="phase-group-name">${meta.label}</span>
      <span class="phase-group-count">${campaigns.length}</span>
      <span class="phase-group-toggle">▾</span>
    </div>
    <div class="phase-group-body${isCollapsed ? ' collapsed' : ''}">
      ${campaigns.map(c => renderCampaignRow(c)).join('')}
    </div>`;
}

// ── RENDER: FILTER BAR ────────────────────────────────────────
function renderFilterBar(total) {
  const f = State.filters;
  const chips = [];
  if (f.phase) chips.push({ key: 'phase', label: PHASE_GROUP_META[f.phase]?.label || f.phase });
  if (f.payStatus) chips.push({ key: 'payStatus', label: f.payStatus });
  if (f.client) chips.push({ key: 'client', label: f.client });

  const phaseActive  = !!f.phase;
  const payActive    = !!f.payStatus;
  const clientActive = !!f.client;

  return `
    <div class="main-header-top">
      <span class="main-header-title">${State.selectedClient || '전체 캠페인'}</span>
      <span class="main-header-count">${total}건</span>
      <button class="btn btn-sm btn-primary" onclick="showNewCampaignModal()">+ 캠페인</button>
    </div>
    <div class="filter-bar">
      <button class="filter-btn${phaseActive ? ' active' : ''}"
              onclick="FilterDD.openPhase(this)">
        Phase${f.phase ? ': ' + (PHASE_GROUP_META[f.phase]?.label || '') : ''} <span class="filter-btn-arrow">▾</span>
      </button>
      <button class="filter-btn${payActive ? ' active' : ''}"
              onclick="FilterDD.openPay(this)">
        정산${f.payStatus ? ': ' + f.payStatus : ''} <span class="filter-btn-arrow">▾</span>
      </button>
      <button class="filter-btn${clientActive ? ' active' : ''}"
              onclick="FilterDD.openClient(this)">
        거래처${f.client ? ': ' + escHtml(f.client) : ''} <span class="filter-btn-arrow">▾</span>
      </button>
      ${chips.map(ch => `
        <div class="filter-chip">
          ${escHtml(ch.label)}
          <button class="filter-chip-x" onclick="App.clearFilter('${ch.key}')">×</button>
        </div>`).join('')}
      ${hasActiveFilters() ? `<button class="filter-clear-btn" onclick="App.clearAllFilters()">초기화</button>` : ''}
      <div class="filter-search">
        <svg class="filter-search-icon" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6.5 1a5.5 5.5 0 1 0 3.594 9.714l3.596 3.596.707-.707-3.596-3.596A5.5 5.5 0 0 0 6.5 1zm0 1a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z"/>
        </svg>
        <input type="text" class="filter-search-input" placeholder="검색…"
               value="${escHtml(f.search)}"
               oninput="App.setSearch(this.value)">
      </div>
    </div>`;
}

// ── FILTER DROPDOWNS ──────────────────────────────────────────
const FilterDD = {
  _current: null,

  _open(el, content, key) {
    this.close();
    this._current = key;

    let dd = document.getElementById('_filterPopover');
    if (!dd) {
      dd = document.createElement('div');
      dd.id = '_filterPopover';
      dd.className = 'filter-popover';
      document.body.appendChild(dd);
    }
    dd.innerHTML = content;
    const rect = el.getBoundingClientRect();
    dd.style.top  = (rect.bottom + 4) + 'px';
    dd.style.left = rect.left + 'px';
    dd.classList.add('open');
    setTimeout(() => document.addEventListener('click', FilterDD._outside, true), 0);
  },

  close() {
    const dd = document.getElementById('_filterPopover');
    if (dd) dd.classList.remove('open');
    document.removeEventListener('click', FilterDD._outside, true);
    this._current = null;
  },

  _outside(e) {
    const dd = document.getElementById('_filterPopover');
    if (dd && !dd.contains(e.target)) FilterDD.close();
  },

  openPhase(btn) {
    const current = State.filters.phase;
    const options = [
      { val: null,         label: '전체' },
      { val: 'delivery',   label: '납품 준비 중' },
      { val: 'upload',     label: '업로드 진행 중' },
      { val: 'settlement', label: '정산 진행 중' },
      { val: 'done',       label: '전체 완료' },
      { val: 'ongoing',    label: '상시 진행' },
      { val: 'issue',      label: '보류 · 홀딩' },
    ];
    const content = `
      <div class="filter-popover-label">Phase</div>
      ${options.map(o => `
        <div class="filter-option${o.val === current ? ' selected' : ''}"
             onclick="App.setFilter('phase',${o.val ? `'${o.val}'` : 'null'});FilterDD.close()">
          <span class="filter-option-dot"></span>
          ${o.label}
        </div>`).join('')}`;
    this._open(btn, content, 'phase');
  },

  openPay(btn) {
    const current = State.filters.payStatus;
    const options = [
      { val: null,       label: '전체' },
      { val: '미입금',   label: '미입금' },
      { val: '부분입금', label: '부분입금' },
      { val: '입금완료', label: '입금완료' },
    ];
    const content = `
      <div class="filter-popover-label">정산 상태</div>
      ${options.map(o => `
        <div class="filter-option${o.val === current ? ' selected' : ''}"
             onclick="App.setFilter('payStatus',${o.val ? `'${o.val}'` : 'null'});FilterDD.close()">
          <span class="filter-option-dot"></span>
          ${o.label}
        </div>`).join('')}`;
    this._open(btn, content, 'pay');
  },

  _clientVals: [],

  openClient(btn) {
    const current = State.filters.client;
    const all = Store.getCampaigns().filter(c => !c.is_archived);
    const clients = [...new Set(
      all.map(c => c.client_name).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'ko'));

    this._clientVals = [null, ...clients];
    const options = [
      { idx: 0, label: '전체' },
      ...clients.map((v, i) => ({ idx: i + 1, label: v })),
    ];
    const content = `
      <div class="filter-popover-label">거래처</div>
      ${options.map(o => `
        <div class="filter-option${this._clientVals[o.idx] === current ? ' selected' : ''}"
             onclick="FilterDD._pickClient(${o.idx})">
          <span class="filter-option-dot"></span>
          ${escHtml(o.label)}
        </div>`).join('')}`;
    this._open(btn, content, 'client');
  },

  _pickClient(idx) {
    App.setFilter('client', this._clientVals[idx] ?? null);
    this.close();
  },
};

// ── RENDER: HOME VIEW ─────────────────────────────────────────
function renderHomeView() {
  const all = Store.getCampaigns().filter(c => !c.is_archived);
  const byGroup = { delivery: [], upload: [], settlement: [], done: [], issue: [], ongoing: [] };
  all.forEach(c => { const g = getPhaseGroup(c); if (byGroup[g]) byGroup[g].push(c); });

  // ── 이번 달 / 전월 KPI 계산 ────────────────────────────
  const now  = new Date();
  const y    = now.getFullYear();
  const mo   = now.getMonth();
  const thisMon = `${y}-${String(mo+1).padStart(2,'0')}`;
  const prevDate = new Date(y, mo - 1, 1);
  const prevMon  = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}`;

  const revAll = all.filter(c => c.revenue > 0);
  // 계산서 발행일 우선, 없으면 마감일 → 시작일 순서로 fallback
  const inMon  = (c, key) => { const d = c.date_tax || c.date_end || c.date_start || ''; return d.startsWith(key); };

  const thisMonC   = revAll.filter(c => inMon(c, thisMon));
  const prevMonC   = revAll.filter(c => inMon(c, prevMon));
  const thisRev    = thisMonC.reduce((s,c) => s+(c.revenue||0), 0);
  const thisProfit = thisMonC.reduce((s,c) => s+(c._profit||0), 0);
  const prevRev    = prevMonC.reduce((s,c) => s+(c.revenue||0), 0);
  const prevProfit = prevMonC.reduce((s,c) => s+(c._profit||0), 0);
  const thisMargin = thisRev ? Math.round(thisProfit / thisRev * 100) : 0;

  const unpaid      = all.filter(c => ['미입금','부분입금'].includes(c.pay_status) && c.revenue > 0);
  const unpaidTotal = unpaid.reduce((s,c) => s+(c.revenue||0), 0);
  const active      = all.filter(c => !['done','issue'].includes(getPhaseGroup(c)));

  function delta(curr, prev) {
    if (!prev || !curr) return '';
    const pct  = Math.round((curr - prev) / prev * 100);
    const sign = pct >= 0 ? '+' : '';
    const cls  = pct >= 0 ? 'pos' : 'neg';
    return `<span class="kpi-delta ${cls}">${sign}${pct}% vs 전월</span>`;
  }

  // ── 월별 매출 바 차트 (최근 6개월) ─────────────────────
  const months6 = [];
  for (let i = 5; i >= 0; i--) {
    const d   = new Date(y, mo - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const rev = revAll.filter(c => inMon(c, key)).reduce((s,c) => s+(c.revenue||0), 0);
    months6.push({ key, label: `${d.getMonth()+1}월`, rev });
  }
  const maxRev = Math.max(...months6.map(x => x.rev), 1);

  const barChartHtml = `
    <div class="mini-chart">
      <div class="mini-chart-bars">
        ${months6.map(mx => {
          const h   = Math.max(Math.round((mx.rev / maxRev) * 56), mx.rev ? 3 : 0);
          const cur = mx.key === thisMon;
          return `<div class="mini-bar-col${cur ? ' current' : ''}">
            <div class="mini-bar-val">${mx.rev ? fmt.money(mx.rev) : ''}</div>
            <div class="mini-bar-track">
              <div class="mini-bar-fill${cur ? ' current' : ''}" style="height:${h}px"></div>
            </div>
            <div class="mini-bar-label">${mx.label}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  // ── 긴급 / 업로드 / 정산 행 ────────────────────────────
  const urgentAll         = all.filter(c => isUrgent(c));
  const uploadActive      = byGroup.upload;
  const settlementPending = [...byGroup.settlement].filter(c => !phaseCDone(c));

  const urgentRowsHtml = urgentAll.length ? `
    <div class="home-row-wrap">
      ${urgentAll.slice(0,8).map(c => {
        const ddText = dday(c);
        const ddC    = ddayCls(c);
        const g      = getPhaseGroup(c);
        return `<div class="home-row" onclick="App.selectCampaign('${c.id}')">
          <span class="home-row-name">${escHtml(c.name)}</span>
          <span class="home-row-meta" style="color:var(--${g==='settlement'?'purple':'amber'})">${PHASE_GROUP_META[g]?.label||''}</span>
          ${ddText ? `<span class="home-row-dday dday ${ddC}">${ddText}</span>` : ''}
        </div>`;
      }).join('')}
    </div>` : `<div class="home-row-wrap"><div style="padding:14px;font-size:12px;color:var(--green);text-align:center">이슈 없음 ✓</div></div>`;

  const uploadRowsHtml = uploadActive.length ? `
    <div class="home-row-wrap">
      ${uploadActive.slice(0,6).map(c => {
        const up  = c.count_upload || 0;
        const sel = c.count_select || 0;
        const pct = sel ? Math.round((up/sel)*100) : 0;
        const barCls = pct >= 100 ? 'full' : pct >= 50 ? 'partial' : 'low';
        const ddText = dday(c);
        const ddC    = ddayCls(c);
        return `<div class="home-row" onclick="App.selectCampaign('${c.id}')">
          <span class="home-row-name">${escHtml(c.name)}</span>
          ${sel
            ? `<div class="home-progress-bar"><div class="home-progress-fill ${barCls}" style="width:${Math.min(pct,100)}%"></div></div>
               <span class="home-row-meta">${up}/${sel} (${pct}%)</span>`
            : `<span class="home-row-meta" style="color:var(--amber)">업로드중</span>`}
          ${ddText ? `<span class="home-row-dday dday ${ddC}">${ddText}</span>` : ''}
        </div>`;
      }).join('')}
    </div>` : '';

  const settlementRowsHtml = settlementPending.length ? `
    <div class="home-row-wrap">
      ${settlementPending.slice(0,6).map(c => `
        <div class="home-row" onclick="App.selectCampaign('${c.id}')">
          <span class="home-row-name">${escHtml(c.name)}</span>
          <span class="home-row-meta" style="color:var(--ink50)">${escHtml(c.client_name||'')}</span>
          <span class="home-row-meta" style="color:var(--${c.pay_status==='미입금'?'red':'amber'})">${c.pay_status||'—'}</span>
          ${c.revenue ? `<span class="home-row-meta money pos" style="font-size:11px">${fmt.money(c.revenue)}원</span>` : ''}
        </div>`).join('')}
    </div>` : '';

  const dateStr = now.toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' });

  const kR = fmtKpi(thisRev);
  const kP = fmtKpi(thisProfit);
  const kU = fmtKpi(unpaidTotal);

  return `
    <div class="home-view">

      <!-- 헤더 -->
      <div class="home-header">
        <span class="home-date">${dateStr}</span>
        <span class="home-period-badge">${mo+1}월 기준</span>
      </div>

      <!-- KPI 조인드 카드 -->
      <div class="kpi-strip">

        <div class="kpi-cell kpi-blue" onclick="App.setView('finance')">
          <div class="kpi-cell-label">이번 달 매출</div>
          <div class="kpi-cell-value">
            <span class="kpi-num">${kR.main}</span>
            ${kR.unit ? `<span class="kpi-unit">${kR.unit}</span>` : ''}
          </div>
          <div class="kpi-cell-foot">
            <span class="kpi-sub">${thisMonC.length}건 집계</span>
            ${delta(thisRev, prevRev)}
          </div>
        </div>

        <div class="kpi-sep"></div>

        <div class="kpi-cell kpi-green" onclick="App.setView('finance')">
          <div class="kpi-cell-label">이번 달 순이익</div>
          <div class="kpi-cell-value">
            <span class="kpi-num">${kP.main}</span>
            ${kP.unit ? `<span class="kpi-unit">${kP.unit}</span>` : ''}
          </div>
          <div class="kpi-cell-foot">
            <span class="kpi-sub">마진율 ${thisMargin}%</span>
            ${delta(thisProfit, prevProfit)}
          </div>
        </div>

        <div class="kpi-sep"></div>

        <div class="kpi-cell${unpaidTotal > 0 ? ' kpi-red' : ''}" onclick="App.setFilterAndView('settlement')">
          <div class="kpi-cell-label">미수금</div>
          <div class="kpi-cell-value">
            <span class="kpi-num">${kU.main}</span>
            ${kU.unit ? `<span class="kpi-unit">${kU.unit}</span>` : ''}
          </div>
          <div class="kpi-cell-foot">
            <span class="kpi-sub">${unpaid.length ? unpaid.length + '건 미입금' : '전부 정산 완료'}</span>
          </div>
        </div>

        <div class="kpi-sep"></div>

        <div class="kpi-cell" onclick="App.setView('campaigns')">
          <div class="kpi-cell-label">진행중 캠페인</div>
          <div class="kpi-cell-value">
            <span class="kpi-num">${active.length}</span>
            <span class="kpi-unit">건</span>
          </div>
          <div class="kpi-cell-foot">
            <span class="kpi-sub">전체 ${all.length}건 중</span>
          </div>
        </div>

      </div>

      <!-- 파이프라인 조인드 스트립 -->
      <div class="pipeline-strip">
        <div class="pipeline-cell" onclick="App.setFilterAndView('delivery')">
          <div class="pipeline-num blue">${byGroup.delivery.length}</div>
          <div class="pipeline-lbl">납품 준비</div>
        </div>
        <div class="pipeline-sep"></div>
        <div class="pipeline-cell" onclick="App.setFilterAndView('upload')">
          <div class="pipeline-num amber">${byGroup.upload.length}</div>
          <div class="pipeline-lbl">업로드</div>
        </div>
        <div class="pipeline-sep"></div>
        <div class="pipeline-cell" onclick="App.setFilterAndView('settlement')">
          <div class="pipeline-num purple">${byGroup.settlement.length}</div>
          <div class="pipeline-lbl">정산 대기</div>
        </div>
        <div class="pipeline-sep"></div>
        <div class="pipeline-cell" onclick="App.setFilterAndView('done')">
          <div class="pipeline-num green">${byGroup.done.length}</div>
          <div class="pipeline-lbl">완료</div>
        </div>
        ${byGroup.ongoing.length ? `
        <div class="pipeline-sep pipeline-sep-dashed"></div>
        <div class="pipeline-cell" onclick="App.setFilterAndView('ongoing')">
          <div class="pipeline-num teal">${byGroup.ongoing.length}</div>
          <div class="pipeline-lbl">상시</div>
        </div>` : ''}
      </div>

      <!-- 월별 매출 차트 -->
      <div class="home-section">
        <div class="home-section-header">
          <span class="home-section-title">월별 매출</span>
          <button class="home-section-link" onclick="App.setView('finance')">전체 정산 →</button>
        </div>
        ${barChartHtml}
      </div>

      <!-- 즉시 확인 필요 -->
      <div class="home-section">
        <div class="home-section-header">
          <span class="home-section-title urgent">즉시 확인 필요</span>
          ${urgentAll.length ? `<span class="home-section-count">${urgentAll.length}</span>` : ''}
        </div>
        ${urgentRowsHtml}
      </div>

      ${uploadActive.length ? `
      <div class="home-section">
        <div class="home-section-header">
          <span class="home-section-title">업로드 진행 중</span>
          <span class="home-section-count">${uploadActive.length}</span>
          <button class="home-section-link" onclick="App.setFilterAndView('upload')">전체 보기 →</button>
        </div>
        ${uploadRowsHtml}
      </div>` : ''}

      ${settlementPending.length ? `
      <div class="home-section">
        <div class="home-section-header">
          <span class="home-section-title">정산 대기</span>
          <span class="home-section-count">${settlementPending.length}</span>
          <button class="home-section-link" onclick="App.setFilterAndView('settlement')">전체 보기 →</button>
        </div>
        ${settlementRowsHtml}
      </div>` : ''}

    </div>`;
}

// ── RENDER: CAMPAIGN LIST ─────────────────────────────────────
function renderCampaignList() {
  const all = Store.getCampaigns();
  const filtered = applyFilters(all);

  const groupOrder = ['delivery', 'upload', 'settlement', 'ongoing', 'done', 'issue'];
  const byGroup = {};
  groupOrder.forEach(k => byGroup[k] = []);
  filtered.forEach(c => { const g = getPhaseGroup(c); if (byGroup[g]) byGroup[g].push(c); });

  // Sort each group by dday (ascending, null/past last)
  groupOrder.forEach(k => {
    byGroup[k].sort((a, b) => {
      const da = a._dday !== null && a._dday !== undefined ? a._dday : 9999;
      const db = b._dday !== null && b._dday !== undefined ? b._dday : 9999;
      return da - db;
    });
  });

  const listHtml = groupOrder
    .map(k => renderPhaseGroup(k, byGroup[k]))
    .filter(Boolean)
    .join('');

  return `<div class="camp-list-wrap">${listHtml || '<div class="empty-state">캠페인이 없습니다</div>'}</div>`;
}

// ── RENDER: SIDEBAR ───────────────────────────────────────────
function renderSidebar() {
  const campaigns = Store.getCampaigns().filter(c => !c.is_archived);
  const alerts = computeAlerts();
  const totalAlerts = alerts.urgent.length + alerts.warn.length +
                      alerts.unpaid.length + alerts.qa.length + alerts.issue.length;

  // Client stats
  const clientMap = {};
  campaigns.forEach(c => {
    const name = c.client_name || '(거래처 없음)';
    if (!clientMap[name]) clientMap[name] = { active: 0, hasIssue: false };
    const g = getPhaseGroup(c);
    if (g !== 'done') clientMap[name].active++;
    if (g === 'issue' || (c.pay_status === '미입금' && c.revenue > 0)) clientMap[name].hasIssue = true;
  });
  const clients = Object.entries(clientMap)
    .sort((a, b) => b[1].active - a[1].active || a[0].localeCompare(b[0], 'ko'));

  const navItems = [
    { key: 'home',      label: '홈',     icon: '🏠' },
    { key: 'campaigns', label: '캠페인',  icon: '☰' },
    { key: 'finance',   label: '정산',    icon: '📊' },
  ];

  return `
    <div class="sidebar-logo">
      <div class="sidebar-logo-text">SIRIAI</div>
      <div class="sidebar-logo-sub">PM</div>
    </div>

    <nav class="sidebar-nav">
      ${navItems.map(n => `
        <div class="nav-item${State.view === n.key ? ' active' : ''}" onclick="App.setView('${n.key}')">
          <span>${n.icon}</span>
          <span class="nav-item-label">${n.label}</span>
        </div>`).join('')}
    </nav>

    <div class="sidebar-section-label">거래처</div>
    <div class="sidebar-clients">
      <div class="client-item${!State.selectedClient && State.view === 'campaigns' ? ' selected' : ''}"
           onclick="App.selectClient(null)">
        <span class="client-dot active"></span>
        <span class="client-name">전체</span>
        <span class="client-count">${campaigns.filter(c => getPhaseGroup(c) !== 'done').length}</span>
      </div>
      ${clients.map(([name, stats]) => `
        <div class="client-item${State.selectedClient === name ? ' selected' : ''}"
             onclick="App.selectClient('${escHtml(name)}')">
          <span class="client-dot${stats.active > 0 ? ' active' : ''}"></span>
          <span class="client-name">${escHtml(name)}</span>
          ${stats.hasIssue ? '<span class="client-warn">⚠</span>' : ''}
          ${stats.active > 0 ? `<span class="client-count">${stats.active}</span>` : ''}
        </div>`).join('')}
      <button class="client-add-btn" onclick="showAddClientModal()">＋ 거래처 추가</button>
    </div>

    <div style="flex:1;min-height:8px"></div>

    <div style="padding:8px 8px;flex-shrink:0">
      <div class="notif-wrap" id="notifWrap">
        <button class="notif-btn" onclick="Notif.toggle()" title="알림" style="width:100%;border-radius:6px;justify-content:center;gap:6px;padding:6px">
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"/>
          </svg>
          <span class="nav-item-label" style="font-size:11px">알림</span>
          <span class="notif-count" id="notifCount" style="${totalAlerts > 0 ? 'position:static;background:var(--red);color:#fff;border-radius:10px;padding:0 5px;font-size:9px;font-weight:700' : 'display:none'}">${totalAlerts}</span>
        </button>
        <div class="notif-dropdown" id="notifDropdown">
          <div class="notif-header">알림</div>
          <div id="notifBody"></div>
        </div>
      </div>
    </div>`;
}

// ── RENDER: FINANCE VIEW ──────────────────────────────────────
function renderFinanceView() {
  const all = Store.getCampaigns().filter(c => !c.is_archived && c.revenue > 0);
  const now  = new Date();
  const y    = now.getFullYear();
  const mo   = now.getMonth();

  // 날짜 기준 키
  const dk  = FinanceState.dateKey;
  const getD = c => c[dk] || c.date_end || c.date_start || '';

  // 기간 필터 함수
  const filterByPeriod = (() => {
    switch (FinanceState.period) {
      case 'thisMonth': {
        const k = `${y}-${String(mo+1).padStart(2,'0')}`;
        return c => getD(c).startsWith(k);
      }
      case 'lastMonth': {
        const ld = new Date(y, mo - 1, 1);
        const k  = `${ld.getFullYear()}-${String(ld.getMonth()+1).padStart(2,'0')}`;
        return c => getD(c).startsWith(k);
      }
      case 'quarter': {
        const qStart = Math.floor(mo / 3) * 3;
        const keys = [0,1,2].map(i => `${y}-${String(qStart+i+1).padStart(2,'0')}`);
        return c => { const d = getD(c); return keys.some(k => d.startsWith(k)); };
      }
      case 'year':
        return c => getD(c).startsWith(String(y));
      default: // 'all'
        return () => true;
    }
  })();

  const campaigns = all.filter(filterByPeriod);

  // 집계
  const totalRev    = campaigns.reduce((s,c) => s+(c.revenue||0), 0);
  const totalProfit = campaigns.reduce((s,c) => s+(c._profit||0), 0);
  const totalMargin = totalRev ? Math.round(totalProfit/totalRev*100) : 0;
  const unpaid      = campaigns.filter(c => ['미입금','부분입금'].includes(c.pay_status));
  const unpaidTotal = unpaid.reduce((s,c) => s+(c.revenue||0), 0);

  // 날짜 기준 레이블
  const DK_LABEL = { date_tax:'계산서 발행일', date_end:'마감일', date_delivery:'납품 예정일' };

  // 기간 칩
  const PERIOD_OPTS = [
    { k:'thisMonth', label:'이번 달' },
    { k:'lastMonth', label:'지난 달' },
    { k:'quarter',   label:'이번 분기' },
    { k:'year',      label:`${y}년` },
    { k:'all',       label:'전체' },
  ];

  // 탭
  const TABS = [
    { k:'summary', label:'요약' },
    { k:'monthly', label:'월별' },
    { k:'client',  label:'거래처별' },
  ];

  // ── 탭 콘텐츠 ────────────────────────────────────────────
  let tabContent = '';

  // ── 요약 탭 ──────────────────────────────────────────────
  if (FinanceState.tab === 'summary') {
    const kR = fmtKpi(totalRev);
    const kP = fmtKpi(totalProfit);
    const kU = fmtKpi(unpaidTotal);

    const kpiHtml = `
      <div class="kpi-strip" style="margin-bottom:16px">
        <div class="kpi-cell kpi-blue">
          <div class="kpi-cell-label">총 매출</div>
          <div class="kpi-cell-value"><span class="kpi-num">${kR.main}</span><span class="kpi-unit">${kR.unit}</span></div>
          <div class="kpi-cell-foot"><span class="kpi-sub">${campaigns.length}건 집계</span></div>
        </div>
        <div class="kpi-sep"></div>
        <div class="kpi-cell kpi-green">
          <div class="kpi-cell-label">순이익</div>
          <div class="kpi-cell-value"><span class="kpi-num">${kP.main}</span><span class="kpi-unit">${kP.unit}</span></div>
          <div class="kpi-cell-foot"><span class="kpi-sub">마진율 ${totalMargin}%</span></div>
        </div>
        <div class="kpi-sep"></div>
        <div class="kpi-cell${unpaidTotal > 0 ? ' kpi-red' : ''}">
          <div class="kpi-cell-label">미수금</div>
          <div class="kpi-cell-value"><span class="kpi-num">${kU.main}</span><span class="kpi-unit">${kU.unit}</span></div>
          <div class="kpi-cell-foot"><span class="kpi-sub">${unpaid.length ? unpaid.length+'건 미입금' : '없음'}</span></div>
        </div>
        <div class="kpi-sep"></div>
        <div class="kpi-cell">
          <div class="kpi-cell-label">마진율</div>
          <div class="kpi-cell-value"><span class="kpi-num">${totalMargin}</span><span class="kpi-unit">%</span></div>
          <div class="kpi-cell-foot"><span class="kpi-sub">수익 ${kP.main}${kP.unit}</span></div>
        </div>
      </div>`;

    // 거래처별 매출 바
    const clientMap = {};
    campaigns.forEach(c => {
      const n = c.client_name || '(미분류)';
      if (!clientMap[n]) clientMap[n] = { rev:0, profit:0, count:0 };
      clientMap[n].rev    += c.revenue || 0;
      clientMap[n].profit += c._profit || 0;
      clientMap[n].count++;
    });
    const clientList = Object.entries(clientMap).sort((a,b) => b[1].rev - a[1].rev).slice(0,10);
    const maxCR = Math.max(...clientList.map(([,v]) => v.rev), 1);

    const clientBarsHtml = clientList.length ? `
      <div class="fin-section">
        <div class="fin-section-title">거래처별 매출</div>
        <div class="client-bar-list">
          ${clientList.map(([name, v]) => {
            const pct    = Math.round((v.rev / maxCR) * 100);
            const margin = v.rev ? Math.round(v.profit / v.rev * 100) : 0;
            return `
              <div class="client-bar-row">
                <div class="client-bar-name">${escHtml(name)}<span class="client-bar-count">${v.count}건</span></div>
                <div class="client-bar-track"><div class="client-bar-fill" style="width:${pct}%"></div></div>
                <div class="client-bar-val">
                  <span class="money pos">${fmt.money(v.rev)}원</span>
                  <span class="client-bar-margin">m ${margin}%</span>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>` : '';

    // 미수금 에이징
    const unpaidSorted = [...unpaid].sort((a,b) => {
      const dA = getD(a) || ''; const dB = getD(b) || '';
      return dA < dB ? -1 : dA > dB ? 1 : 0;
    });
    const agingHtml = unpaid.length ? `
      <div class="fin-section">
        <div class="fin-section-title">미수금 에이징</div>
        <div class="table-wrap">
          <table><thead><tr>
            <th>캠페인</th><th>거래처</th><th>금액</th><th>경과</th><th>기준일</th><th>입금상태</th>
          </tr></thead><tbody>
            ${unpaidSorted.map(c => {
              const dateStr  = getD(c);
              const days     = dateStr ? Math.floor((now - new Date(dateStr)) / 86400000) : null;
              const ageCls   = days === null ? '' : days >= 60 ? 'age-old' : days >= 30 ? 'age-warn' : 'age-ok';
              return `
                <tr class="row-hover" onclick="App.selectCampaign('${c.id}')">
                  <td class="fin-td-name">${escHtml(c.name)}</td>
                  <td class="text-muted">${escHtml(c.client_name||'')}</td>
                  <td class="nowrap"><span class="money neg">${fmt.money(c.revenue)}원</span></td>
                  <td>${days !== null ? `<span class="aging-badge ${ageCls}">D+${days}</span>` : '—'}</td>
                  <td class="text-muted" style="font-size:10px">${fmt.date(dateStr)||'—'}</td>
                  <td>${payBadge(c.pay_status)}</td>
                </tr>`;
            }).join('')}
          </tbody></table>
        </div>
      </div>` : `<div style="padding:24px;text-align:center;font-size:12px;color:var(--green)">미수금 없음 ✓</div>`;

    tabContent = kpiHtml + clientBarsHtml + agingHtml;

  // ── 월별 탭 ──────────────────────────────────────────────
  } else if (FinanceState.tab === 'monthly') {
    const byMonth = {};
    campaigns.forEach(c => {
      const d   = getD(c);
      const mon = d ? d.slice(0,7) : '미정';
      if (!byMonth[mon]) byMonth[mon] = [];
      byMonth[mon].push(c);
    });
    const months = Object.keys(byMonth).sort().reverse();

    if (!months.length) {
      tabContent = `<div class="fin-empty">해당 기간에 집계된 캠페인이 없습니다.</div>`;
    } else {
      tabContent = months.map(mon => {
        const rows    = byMonth[mon];
        const mRev    = rows.reduce((s,c) => s+(c.revenue||0), 0);
        const mProfit = rows.reduce((s,c) => s+(c._profit||0), 0);
        const mMargin = mRev ? Math.round(mProfit/mRev*100) : 0;
        return `
          <div class="fin-month-block">
            <div class="fin-month-header">
              <span class="fin-month-title">${mon}</span>
              <span class="fin-month-meta">매출 <strong>${fmt.money(mRev)}원</strong></span>
              <span class="fin-month-meta">순이익 <strong>${fmt.money(mProfit)}원</strong></span>
              <span class="fin-month-meta">마진 <strong>${mMargin}%</strong></span>
              <span class="fin-month-meta" style="margin-left:auto;color:var(--ink30)">${rows.length}건</span>
            </div>
            <div class="table-wrap">
              <table><thead><tr>
                <th>캠페인명</th><th>거래처</th><th>매출</th><th>원고료</th><th>순이익</th><th>마진</th><th>${DK_LABEL[dk]}</th><th>입금</th>
              </tr></thead><tbody>
                ${rows.map(c => `
                  <tr class="row-hover" onclick="App.selectCampaign('${c.id}')">
                    <td class="fin-td-name">${escHtml(c.name)}</td>
                    <td class="text-muted" style="font-size:11px">${escHtml(c.client_name||'')}</td>
                    <td class="nowrap"><span class="money pos">${fmt.money(c.revenue)}원</span></td>
                    <td class="nowrap text-muted">${fmt.money(c.fee)}원</td>
                    <td class="nowrap"><span class="money ${c._profit>0?'pos':'zero'}">${fmt.money(c._profit)}원</span></td>
                    <td style="font-size:11px;color:var(--ink50)">${c._margin}%</td>
                    <td style="font-size:11px;color:var(--ink40)">${fmt.date(c[dk])||'—'}</td>
                    <td>${payBadge(c.pay_status)}</td>
                  </tr>`).join('')}
              </tbody></table>
            </div>
          </div>`;
      }).join('');
    }

  // ── 거래처별 탭 ──────────────────────────────────────────
  } else {
    const clientSummary = {};
    campaigns.forEach(c => {
      const n = c.client_name || '(미분류)';
      if (!clientSummary[n]) clientSummary[n] = { rev:0, profit:0, count:0, unpaid:0 };
      clientSummary[n].rev    += c.revenue || 0;
      clientSummary[n].profit += c._profit || 0;
      clientSummary[n].count++;
      if (['미입금','부분입금'].includes(c.pay_status)) clientSummary[n].unpaid += c.revenue || 0;
    });
    const clientRows = Object.entries(clientSummary).sort((a,b) => b[1].rev - a[1].rev);

    tabContent = clientRows.length ? `
      <div class="table-wrap">
        <table><thead><tr>
          <th>거래처</th><th>캠페인</th><th>총매출</th><th>순이익</th><th>마진율</th><th>미수금</th>
        </tr></thead><tbody>
          ${clientRows.map(([name, v]) => {
            const margin = v.rev ? Math.round(v.profit/v.rev*100) : 0;
            return `
              <tr>
                <td style="font-weight:500;font-size:13px">${escHtml(name)}</td>
                <td class="text-muted">${v.count}건</td>
                <td class="nowrap"><span class="money pos">${fmt.money(v.rev)}원</span></td>
                <td class="nowrap"><span class="money ${v.profit>0?'pos':'zero'}">${fmt.money(v.profit)}원</span></td>
                <td style="font-size:11px;color:var(--ink50)">${margin}%</td>
                <td class="nowrap">${v.unpaid
                  ? `<span class="money neg">${fmt.money(v.unpaid)}원</span>`
                  : `<span style="color:var(--ink30)">—</span>`}</td>
              </tr>`;
          }).join('')}
        </tbody></table>
      </div>` : `<div class="fin-empty">집계된 데이터가 없습니다.</div>`;
  }

  return `
    <div class="fin-wrap">

      <!-- 컨트롤 바 -->
      <div class="fin-controls">
        <div class="fin-period-chips">
          ${PERIOD_OPTS.map(p => `
            <button class="fin-chip${FinanceState.period === p.k ? ' active' : ''}"
                    onclick="App.setFinancePeriod('${p.k}')">${p.label}</button>`).join('')}
        </div>
        <div class="fin-right-controls">
          <select class="fin-select" onchange="App.setFinanceDateKey(this.value)">
            ${Object.entries(DK_LABEL).map(([k,v]) => `
              <option value="${k}"${dk === k ? ' selected' : ''}>${v} 기준</option>`).join('')}
          </select>
          <button class="btn btn-sm" onclick="exportCSV()">CSV</button>
        </div>
      </div>

      <!-- 탭 바 -->
      <div class="fin-tabs">
        ${TABS.map(t => `
          <button class="fin-tab${FinanceState.tab === t.k ? ' active' : ''}"
                  onclick="App.setFinanceTab('${t.k}')">${t.label}</button>`).join('')}
      </div>

      <!-- 탭 콘텐츠 -->
      ${tabContent}

    </div>`;
}

// ── CSV EXPORT ────────────────────────────────────────────────
function exportCSV() {
  const data = Store.getCampaigns().filter(c => c.revenue > 0);
  const headers = ['UV','상태','캠페인명','거래처','진행사','매출','원고료','순이익','마진율','입금상태','견적서발행일','세금계산서발행일','마감일'];
  const rows = data.map(c => [
    c.uv||'', c.status, c.name, c.client_name||'', c.entity||'',
    c.revenue||0, c.fee||0, c._profit||0,
    c.revenue ? Math.round(c._profit/c.revenue*100)+'%' : '',
    c.pay_status||'', c.date_quote||'', c.date_tax||'', c.date_end||'',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `siriai-pm-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  toast('CSV 다운로드 완료', 'ok');
}

// ── NEW CAMPAIGN MODAL ────────────────────────────────────────
function showNewCampaignModal() {
  const clients = Store.getClients().map(c => c.name);
  const defaultClient = State.selectedClient || '';
  Modal.show(`
    <div class="form-grid">
      <div class="field form-full">
        <label>캠페인명 *</label>
        <input id="nf-name" type="text" placeholder="[캠페인] 브랜드명 26년 월">
      </div>
      <div class="field">
        <label>거래처</label>
        <input id="nf-client" list="clientList" type="text" placeholder="거래처명" value="${escHtml(defaultClient)}">
        <datalist id="clientList">${clients.map(c => `<option value="${escHtml(c)}">`).join('')}</datalist>
      </div>
      <div class="field">
        <label>상태</label>
        <select id="nf-status">
          ${STATUSES.map(s => `<option value="${s}">${STATUS_META[s]?.label || s}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>시작일</label>
        <input id="nf-start" type="date">
      </div>
      <div class="field">
        <label>마감일</label>
        <input id="nf-end" type="date">
      </div>
      <div class="field">
        <label>납품예정일</label>
        <input id="nf-delivery" type="date">
      </div>
      <div class="field">
        <label>담당 채널</label>
        <input id="nf-entity" type="text" value="SIRIAI">
      </div>
      <div class="field">
        <label>국가</label>
        <select id="nf-country">
          <option value="국내" selected>국내</option>
          <option value="해외">해외</option>
        </select>
      </div>
      <div class="field form-full">
        <label>진행시트 URL</label>
        <input id="nf-progress" type="text" placeholder="https://docs.google.com/…">
      </div>
      <div class="field form-full">
        <label>QA 시트 URL</label>
        <input id="nf-qa" type="text" placeholder="https://docs.google.com/…">
      </div>
    </div>
  `, { title: '새 캠페인 등록' });
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn" onclick="Modal.hide()">취소</button>
    <button class="btn btn-primary" onclick="submitNewCampaign()">등록</button>
  `;
  setTimeout(() => document.getElementById('nf-name')?.focus(), 50);
}

async function submitNewCampaign() {
  const name = document.getElementById('nf-name').value.trim();
  if (!name) { toast('캠페인명을 입력하세요', 'warn'); return; }

  const clientName = document.getElementById('nf-client').value.trim();
  const client = clientName ? await Store.ensureClient(clientName) : null;

  const data = {
    name,
    client_name: clientName || null,
    client_id:   client?.id || null,
    entity:      document.getElementById('nf-entity').value.trim() || 'SIRIAI',
    country:     document.getElementById('nf-country').value,
    status:      document.getElementById('nf-status').value,
    date_start:  document.getElementById('nf-start').value   || null,
    date_end:    document.getElementById('nf-end').value     || null,
    date_delivery: document.getElementById('nf-delivery').value || null,
    link_progress: document.getElementById('nf-progress').value.trim() || null,
    link_qa:     document.getElementById('nf-qa').value.trim() || null,
  };

  Modal.hide();
  try {
    const created = await Store.createCampaign(data);
    State.view = 'campaigns';
    State.selectedClient = clientName || null;
    State.selectedCampaignId = created.id;
    State.drawerSections = {};
    App.renderAll();
    toast('캠페인이 등록되었습니다', 'ok');
  } catch (e) {
    toast('등록 실패: ' + e.message, 'err');
  }
}

function showAddClientModal() {
  Modal.show(`
    <div class="field">
      <label>거래처명</label>
      <input id="nc-name" type="text" placeholder="예: 무신사">
    </div>
  `, { title: '거래처 추가' });
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn" onclick="Modal.hide()">취소</button>
    <button class="btn btn-primary" onclick="submitAddClient()">추가</button>
  `;
  setTimeout(() => document.getElementById('nc-name')?.focus(), 50);
}

async function submitAddClient() {
  const name = document.getElementById('nc-name').value.trim();
  if (!name) { toast('거래처명을 입력하세요', 'warn'); return; }
  Modal.hide();
  try {
    await Store.ensureClient(name);
    App.renderAll();
    toast('거래처가 추가되었습니다', 'ok');
  } catch (e) {
    toast('추가 실패: ' + e.message, 'err');
  }
}

// ── APP ────────────────────────────────────────────────────────
const App = {
  async init() {
    document.getElementById('sidebar').innerHTML =
      '<div style="padding:20px;font-size:12px;color:var(--ink40)">로딩 중…</div>';

    try {
      await Store.init();
    } catch (e) {
      document.getElementById('mainScroll').innerHTML = `
        <div class="empty-state">
          연결 실패<br><span style="font-size:11px;color:var(--ink50)">${escHtml(e.message)}</span>
        </div>`;
      return;
    }
    App.renderAll();
  },

  renderAll() {
    // Validate selected campaign
    if (State.selectedCampaignId) {
      const c = Store.getCampaignById(State.selectedCampaignId);
      if (!c || c.is_archived) State.selectedCampaignId = null;
    }

    document.getElementById('sidebar').innerHTML = renderSidebar();

    const mainHeader = document.getElementById('mainHeader');
    const mainScroll = document.getElementById('mainScroll');

    if (State.view === 'home') {
      mainHeader.innerHTML = `
        <div class="main-header-top">
          <span class="main-header-title">홈</span>
        </div>`;
      mainScroll.innerHTML = renderHomeView();
    } else if (State.view === 'finance') {
      mainHeader.innerHTML = `
        <div class="main-header-top">
          <span class="main-header-title">정산</span>
        </div>`;
      mainScroll.innerHTML = renderFinanceView();
    } else {
      // Campaigns view
      const all = Store.getCampaigns();
      const filtered = applyFilters(all);
      mainHeader.innerHTML = renderFilterBar(filtered.length);
      mainScroll.innerHTML = renderCampaignList();
    }

    if (State.selectedCampaignId) {
      Detail.render(State.selectedCampaignId);
    } else {
      document.getElementById('detailPanel').classList.remove('open');
      document.getElementById('detailPanel').innerHTML = '';
    }
  },

  // partial re-render for a single campaign row (after inline edit)
  _rerenderRow(id) {
    const existing = document.querySelector(`[onclick*="selectCampaign('${id}')"].camp-row`);
    if (!existing) return;
    const c = Store.getCampaignById(id);
    if (!c) return;
    const temp = document.createElement('div');
    temp.innerHTML = renderCampaignRow(c);
    existing.replaceWith(temp.firstElementChild);
  },

  // Called by store.js subscribeRealtime
  renderCurrentView() { App.renderAll(); },
  renderNotifications() { /* sidebar handles it */ App.renderAll(); },

  setView(v) {
    State.view = v;
    if (v !== 'campaigns') State.selectedClient = null;
    App.renderAll();
  },

  // ── Finance state setters ─────────────────────────────────
  setFinancePeriod(p) {
    FinanceState.period = p;
    this._refreshFinance();
  },
  setFinanceDateKey(k) {
    FinanceState.dateKey = k;
    this._refreshFinance();
  },
  setFinanceTab(t) {
    FinanceState.tab = t;
    this._refreshFinance();
  },
  _refreshFinance() {
    if (State.view === 'finance') {
      document.getElementById('mainScroll').innerHTML = renderFinanceView();
    }
  },

  selectClient(name) {
    State.selectedClient = name;
    State.view = 'campaigns';
    State.filters.client = null;
    App.renderAll();
  },

  selectCampaign(id) {
    if (State.selectedCampaignId === id) {
      // Toggle: close if same
      State.selectedCampaignId = null;
      document.getElementById('detailPanel').classList.remove('open');
      document.getElementById('detailPanel').innerHTML = '';
      // Update row selection
      document.querySelectorAll('.camp-row.selected').forEach(el => el.classList.remove('selected'));
      return;
    }
    State.selectedCampaignId = id;
    State.drawerSections = {};

    // Switch to campaigns view if in home
    if (State.view === 'finance') {
      State.view = 'campaigns';
      App.renderAll();
      return;
    }

    // Update row selection without full re-render
    document.querySelectorAll('.camp-row.selected').forEach(el => el.classList.remove('selected'));
    const newRow = document.querySelector(`.camp-row[onclick*="selectCampaign('${id}')"]`);
    if (newRow) newRow.classList.add('selected');

    Detail.render(id);
  },

  closeDetail() {
    State.selectedCampaignId = null;
    document.getElementById('detailPanel').classList.remove('open');
    document.getElementById('detailPanel').innerHTML = '';
    document.querySelectorAll('.camp-row.selected').forEach(el => el.classList.remove('selected'));
  },

  // Legacy alias
  openDrawer(id) { App.selectCampaign(id); },

  toggleGroup(key) {
    const defaultCollapsed = key === 'done';
    const current = State.collapsedGroups[key] === undefined ? defaultCollapsed : State.collapsedGroups[key];
    State.collapsedGroups[key] = !current;

    const header = document.querySelector(`.phase-group-header.${PHASE_GROUP_META[key]?.cls}`);
    const body   = header?.nextElementSibling;
    if (header) header.classList.toggle('collapsed', State.collapsedGroups[key]);
    if (body)   body.classList.toggle('collapsed',   State.collapsedGroups[key]);
  },

  setFilter(key, val) {
    State.filters[key] = val;
    const all = Store.getCampaigns();
    const filtered = applyFilters(all);
    document.getElementById('mainHeader').innerHTML = renderFilterBar(filtered.length);
    document.getElementById('mainScroll').innerHTML = renderCampaignList();
  },

  clearFilter(key) {
    State.filters[key] = null;
    App.setFilter(key, null);
  },

  clearAllFilters() {
    State.filters = { phase: null, payStatus: null, client: null, search: '' };
    const all = Store.getCampaigns();
    const filtered = applyFilters(all);
    document.getElementById('mainHeader').innerHTML = renderFilterBar(filtered.length);
    document.getElementById('mainScroll').innerHTML = renderCampaignList();
  },

  setSearch(val) {
    State.filters.search = val;
    const all = Store.getCampaigns();
    const filtered = applyFilters(all);
    document.getElementById('mainHeader').innerHTML = renderFilterBar(filtered.length);
    document.getElementById('mainScroll').innerHTML = renderCampaignList();
  },

  setFilterAndView(phase) {
    State.view = 'campaigns';
    State.filters.phase = phase;
    App.renderAll();
  },

  showFinance() {
    State.view = 'finance';
    State.selectedClient = null;
    App.renderAll();
  },
};

// ── BOOT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
