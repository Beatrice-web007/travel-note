/* 纵向长轴表单：地点节点 + 出行方式腿 + 住宿展开 */
(function (global) {
  'use strict';

  const { el, setPath } = Util;
  const { pickDate, todayStr, fmtCN } = Dates;

  const MODES = ['高铁', '飞机', '打车', '步行', '其他'];

  function emptyStay() {
    return { has: false, hotel: '', checkIn: '', checkOut: '', amount: '' };
  }
  function emptyLeg() {
    return { id: Store.newId('l'), mode: '', trainNo: '', flightNo: '', price: '', duration: '', note: '', date: '' };
  }

  /** 新建一趟旅行（默认：今天出发今天返回，出发点 + 终点） */
  function newTrip() {
    const today = todayStr();
    return {
      id: Store.newId('t'),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      departureDate: today,
      returnDate: today,
      travelers: [],
      points: [
        { id: Store.newId('p'), role: 'start', label: '出发点', address: '', stay: emptyStay() },
        { id: Store.newId('p'), role: 'end', label: '终点', address: '', stay: emptyStay() }
      ],
      legs: [emptyLeg()]
    };
  }

  function relabelWaypoints(trip) {
    let k = 0;
    trip.points.forEach((p) => {
      if (p.role === 'waypoint') p.label = '途径点' + (++k);
    });
  }

  function addWaypoint(trip) {
    const n = trip.points.filter((p) => p.role === 'waypoint').length;
    const wp = { id: Store.newId('p'), role: 'waypoint', label: '途径点' + (n + 1), address: '', stay: emptyStay() };
    const endIdx = trip.points.length - 1;
    trip.points.splice(endIdx, 0, wp);
    trip.legs.splice(endIdx, 0, emptyLeg());
    relabelWaypoints(trip);
  }

  function removeWaypoint(trip, idx) {
    trip.points.splice(idx, 1);
    trip.legs.splice(idx, 1);
    relabelWaypoints(trip);
  }

  /* ---------------- 字段构建 ---------------- */
  function inputText(path, value, placeholder, inputmode) {
    const inp = el('input', 'input', { type: 'text', placeholder: placeholder || '', value: value || '', autocomplete: 'off' });
    if (inputmode) inp.setAttribute('inputmode', inputmode);
    inp.dataset.path = path;
    return inp;
  }

  function inputAddress(path, value) {
    const inp = inputText(path, value, '城市 / 详细地址');
    inp.setAttribute('list', 'loc-history');
    return inp;
  }

  function field(label, control, required) {
    const f = el('label', 'field');
    const l = el('span', 'field-label');
    l.innerHTML = (required ? '<span class="req">*</span> ' : '') + label;
    f.appendChild(l);
    f.appendChild(control);
    return f;
  }

  function dateButton(label, value, path) {
    const f = el('div', 'field');
    const l = el('span', 'field-label');
    l.textContent = label;
    const btn = el('button', 'date-field', { type: 'button' });
    const val = el('span', 'df-value');
    val.textContent = value ? fmtCN(value) : '选择日期';
    const arrow = el('span', 'df-arrow');
    arrow.textContent = '▾';
    btn.appendChild(val);
    btn.appendChild(arrow);
    btn.dataset.path = path;
    btn.onclick = async function () {
      const v = await pickDate({ value: value || todayStr(), title: label });
      if (v) {
        setPath(tripRef.current, path, v);
        val.textContent = fmtCN(v);
        if (onChange) onChange(tripRef.current);
      }
    };
    f.appendChild(l);
    f.appendChild(btn);
    return f;
  }

  // 表单渲染期间用到的当前 trip 引用
  let tripRef = { current: null };
  let onChange = null;

  /* ---------------- 节点 ---------------- */
  function renderNode(trip, pt, idx, rerender) {
    const node = el('div', 'node node--' + pt.role);
    node.appendChild(el('span', 'node-dot'));

    const card = el('div', 'node-card');

    const head = el('div', 'node-head');
    const badge = el('span', 'node-badge');
    badge.textContent = pt.label;
    head.appendChild(badge);
    if (pt.role === 'waypoint') {
      const rm = el('button', 'node-remove', { type: 'button' });
      rm.textContent = '移除';
      rm.onclick = () => { removeWaypoint(trip, idx); rerender(); };
      head.appendChild(rm);
    }
    card.appendChild(head);

    card.appendChild(field('地点（地址）', inputAddress('points.' + idx + '.address', pt.address)));

    // 是否住宿
    const stayRow = el('div', 'stay-row');
    stayRow.appendChild((function () { const l = el('span', 'field-label'); l.textContent = '是否住宿'; return l; })());
    const sw = el('label', 'switch');
    const cb = el('input', null, { type: 'checkbox' });
    cb.checked = !!pt.stay.has;
    cb.onchange = () => { setPath(trip, 'points.' + idx + '.stay.has', cb.checked); rerender(); };
    sw.appendChild(cb);
    sw.appendChild(el('span', 'switch-track'));
    stayRow.appendChild(sw);
    card.appendChild(stayRow);

    if (pt.stay.has) {
      const sf = el('div', 'stay-fields');
      sf.appendChild(field('酒店名称', inputText('points.' + idx + '.stay.hotel', pt.stay.hotel, '酒店 / 民宿名称')));
      sf.appendChild(dateButton('入住日期', pt.stay.checkIn, 'points.' + idx + '.stay.checkIn'));
      sf.appendChild(dateButton('离店日期', pt.stay.checkOut, 'points.' + idx + '.stay.checkOut'));
      sf.appendChild(field('住宿金额', inputText('points.' + idx + '.stay.amount', pt.stay.amount, '¥ 金额', 'decimal')));
      card.appendChild(sf);
    }

    node.appendChild(card);
    return node;
  }

  /* ---------------- 腿 ---------------- */
  function renderLeg(trip, leg, idx, rerender) {
    const seg = el('div', 'leg');

    const chips = el('div', 'mode-chips');
    MODES.forEach((m) => {
      const chip = el('button', 'chip' + (leg.mode === m ? ' chip--on is-transport' : ''), { type: 'button' });
      chip.textContent = m;
      chip.onclick = () => { leg.mode = m; rerender(); };
      chips.appendChild(chip);
    });
    seg.appendChild(chips);

    if (leg.mode) {
      const wrap = el('div', 'leg-fields');
      const p = 'legs.' + idx + '.';
      wrap.appendChild(dateButton('乘坐日期', leg.date, p + 'date'));
      if (leg.mode === '高铁') {
        wrap.appendChild(field('车次', inputText(p + 'trainNo', leg.trainNo, '如 G1234'), true));
        wrap.appendChild(field('价格', inputText(p + 'price', leg.price, '¥ 金额', 'decimal'), true));
      } else if (leg.mode === '飞机') {
        wrap.appendChild(field('航班号', inputText(p + 'flightNo', leg.flightNo, '如 CA1234'), true));
        wrap.appendChild(field('价格', inputText(p + 'price', leg.price, '¥ 金额', 'decimal'), true));
      } else if (leg.mode === '打车' || leg.mode === '步行') {
        wrap.appendChild(field('时长（选填）', inputText(p + 'duration', leg.duration, '如 30分钟')));
        wrap.appendChild(field('价格（选填）', inputText(p + 'price', leg.price, '¥ 金额', 'decimal')));
      } else if (leg.mode === '其他') {
        wrap.appendChild(field('备注（选填）', inputText(p + 'note', leg.note, '说明')));
      }
      seg.appendChild(wrap);
    }

    return seg;
  }

  function renderTravelers(trip, rerender) {
    const box = el('div', 'travelers-box');
    const lab = el('span', 'field-label');
    lab.textContent = '出行人';
    box.appendChild(lab);

    const chips = el('div', 'traveler-chips');
    (trip.travelers || []).forEach((name, i) => {
      const c = el('span', 'traveler-chip');
      const nm = el('span', 'traveler-chip__name'); nm.textContent = name;
      const x = el('button', 'traveler-chip__x', { type: 'button' }); x.textContent = '×';
      x.onclick = () => { trip.travelers.splice(i, 1); rerender(); };
      c.appendChild(nm); c.appendChild(x);
      chips.appendChild(c);
    });
    box.appendChild(chips);

    const row = el('div', 'traveler-input-row');
    const inp = el('input', 'input', { type: 'text', placeholder: '姓名，可添加多人', autocomplete: 'off' });
    const add = el('button', 'traveler-add', { type: 'button' });
    add.textContent = '添加';
    const addName = () => {
      const v = inp.value.trim();
      if (!v) return;
      trip.travelers = trip.travelers || [];
      if (trip.travelers.indexOf(v) < 0) trip.travelers.push(v);
      inp.value = '';
      rerender();
    };
    add.onclick = addName;
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addName(); } });
    row.appendChild(inp);
    row.appendChild(add);
    box.appendChild(row);

    return box;
  }

  /* ---------------- 主渲染 ---------------- */
  function renderFormBody(container, trip, rerender) {
    container.innerHTML = '';

    // 出行人
    container.appendChild(renderTravelers(trip, rerender));

    // 出发 / 返回日期
    const head = el('div', 'form-head');
    head.appendChild(dateTicket('出发日期', trip.departureDate, 'departureDate', rerender));
    head.appendChild(dateTicket('返回日期', trip.returnDate, 'returnDate', rerender));
    container.appendChild(head);

    // 纵向长轴
    const axis = el('div', 'axis');
    axis.appendChild(el('div', 'rail'));
    trip.points.forEach((pt, i) => {
      axis.appendChild(renderNode(trip, pt, i, rerender));
      if (i < trip.points.length - 1) {
        axis.appendChild(renderLeg(trip, trip.legs[i], i, rerender));
      }
    });

    const addBtn = el('button', 'add-way', { type: 'button' });
    addBtn.innerHTML = '<span>＋</span> 添加途径点';
    addBtn.onclick = () => { addWaypoint(trip); rerender(); };
    axis.appendChild(addBtn);

    container.appendChild(axis);
  }

  function dateTicket(label, value, path, rerender) {
    const t = el('button', 'date-ticket', { type: 'button' });
    const l = el('span', 'dt-label'); l.textContent = label;
    const v = el('span', 'dt-value' + (value ? '' : ' is-empty'));
    v.textContent = value ? fmtCN(value) : '选择日期';
    t.appendChild(l);
    t.appendChild(v);
    t.onclick = async function () {
      const min = path === 'returnDate' ? tripRef.current.departureDate : null;
      const out = await pickDate({ value: value || todayStr(), min: min, title: label });
      if (out) {
        setPath(tripRef.current, path, out);
        rerender();
      }
    };
    return t;
  }

  /**
   * 挂载表单到容器。
   * 返回 { trip, rerender }，onChanged 在每次结构变化后触发（用于上层保存草稿）。
   */
  let inputBound = false;

  function mountForm(container, trip, onChanged) {
    tripRef.current = trip;
    onChange = onChanged || null;

    if (!inputBound) {
      inputBound = true;
      container.addEventListener('input', (e) => {
        if (e.target && e.target.dataset && e.target.dataset.path) {
          setPath(tripRef.current, e.target.dataset.path, e.target.value);
          tripRef.current.updatedAt = Date.now();
          if (onChange) onChange(tripRef.current);
        }
      });
    }

    function rerender() {
      trip.updatedAt = Date.now();
      renderFormBody(container, trip, rerender);
      if (onChanged) onChanged(trip);
    }

    rerender();
    return { trip: trip, rerender: rerender };
  }

  /* ---------------- 校验 ---------------- */
  function validate(trip) {
    const errs = [];
    if (!trip.departureDate) errs.push('出发日期');
    if (!trip.returnDate) errs.push('返回日期');
    if (trip.departureDate && trip.returnDate && trip.returnDate < trip.departureDate) {
      errs.push('返回日期不能早于出发日期');
    }
    trip.legs.forEach((leg, i) => {
      const seg = '第' + (i + 1) + '段';
      if (leg.mode === '高铁') {
        if (!(leg.trainNo || '').trim()) errs.push(seg + '高铁车次');
        if (!(leg.price || '').trim()) errs.push(seg + '高铁价格');
      } else if (leg.mode === '飞机') {
        if (!(leg.flightNo || '').trim()) errs.push(seg + '航班号');
        if (!(leg.price || '').trim()) errs.push(seg + '航班价格');
      }
    });
    return errs;
  }

  global.Form = { newTrip, mountForm, validate, addWaypoint, removeWaypoint };
})(window);
