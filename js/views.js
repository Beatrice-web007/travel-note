/* 列表视图 + 详情视图 */
(function (global) {
  'use strict';

  const { el, num, money } = Util;
  const { fmtCN, diffDays } = Dates;

  function computeTotal(trip) {
    let s = 0;
    (trip.points || []).forEach((p) => {
      if (p.stay && p.stay.has) s += num(p.stay.amount);
    });
    (trip.legs || []).forEach((l) => { s += num(l.price); });
    return s;
  }

  function tripDays(trip) {
    if (!trip.departureDate || !trip.returnDate) return 0;
    return (diffDays(trip.departureDate, trip.returnDate) || 0) + 1;
  }

  function sortTrips(list, key) {
    const cmps = {
      'date-asc':    (a, b) => (a.departureDate || '').localeCompare(b.departureDate || ''),
      'date-desc':   (a, b) => (b.departureDate || '').localeCompare(a.departureDate || ''),
      'days-desc':   (a, b) => tripDays(b) - tripDays(a),
      'days-asc':    (a, b) => tripDays(a) - tripDays(b),
      'amount-desc': (a, b) => computeTotal(b) - computeTotal(a),
      'amount-asc':  (a, b) => computeTotal(a) - computeTotal(b)
    };
    const cmp = cmps[key] || cmps['date-desc'];
    return (list || []).slice().sort((a, b) => {
      const c = cmp(a, b);
      return c !== 0 ? c : (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  function daysNights(trip) {
    const d = tripDays(trip);
    if (d <= 0) return '';
    const n = d - 1;
    return n > 0 ? d + '天' + n + '晚' : d + '天';
  }

  function allTravelers(trips) {
    const set = [];
    (trips || []).forEach((t) => {
      (t.travelers || []).forEach((n) => {
        n = (n || '').trim();
        if (n && set.indexOf(n) < 0) set.push(n);
      });
    });
    return set.sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }

  function filterByTravelers(trips, names) {
    names = names || [];
    if (!names.length) return (trips || []).slice();
    return (trips || []).filter((t) => (t.travelers || []).some((n) => names.indexOf(n) >= 0));
  }

  function shortAddr(pt) {
    pt = pt || {};
    return (pt.address || '').trim() || pt.label || '';
  }

  function modeList(trip) {
    const modes = (trip.legs || []).map((l) => l.mode).filter(Boolean);
    return modes.length ? modes : null;
  }

  /* ---------------- 列表 ---------------- */
  function renderList(container, trips, onOpen) {
    container.innerHTML = '';
    if (!trips.length) {
      const e = el('div', 'empty');
      e.innerHTML =
        '<div class="stamp">途</div>' +
        '<h3>还没有旅行记录</h3>' +
        '<p>点击下方「新建旅行」，记录你的第一段旅程。</p>';
      container.appendChild(e);
      return;
    }
    trips.forEach((t) => container.appendChild(tripCard(t, onOpen)));
  }

  function tripCard(t, onOpen) {
    const pts = t.points || [];
    const total = computeTotal(t);

    const card = el('article', 'trip-card');
    card.setAttribute('role', 'button');
    card.tabIndex = 0;

    const top = el('div', 'trip-card__top');
    const dates = el('span', 'trip-card__dates');
    dates.textContent = fmtCN(t.departureDate) + ' → ' + fmtCN(t.returnDate);
    const totalEl = el('span', 'trip-card__total');
    totalEl.innerHTML = '<small>合计</small>' + money(total);
    top.appendChild(dates);
    top.appendChild(totalEl);
    card.appendChild(top);

    const info = el('div', 'trip-card__info');
    const bits = [];
    if (t.travelers && t.travelers.length) bits.push(t.travelers.join('、'));
    const dn = daysNights(t);
    if (dn) bits.push(dn);
    if (bits.length) info.textContent = bits.join(' · ');
    card.appendChild(info);

    const route = el('div', 'trip-card__route trip-card__route--chain');
    route.appendChild(el('span', 'dot dot--s'));
    const chain = el('span', 'chain-names');
    chain.textContent = pts.map(shortAddr).filter(Boolean).join('  →  ');
    route.appendChild(chain);
    route.appendChild(el('span', 'dot dot--e'));
    card.appendChild(route);

    const meta = el('div', 'trip-card__meta');
    const modes = el('div', 'trip-card__modes');
    const ms = modeList(t);
    if (ms) {
      ms.forEach((m) => {
        const tag = el('span', 'mode-tag');
        tag.textContent = m;
        modes.appendChild(tag);
      });
    } else {
      const none = el('span', 'mode-tag');
      none.textContent = '未填交通';
      modes.appendChild(none);
    }
    meta.appendChild(modes);
    card.appendChild(meta);

    const go = () => onOpen(t.id);
    card.addEventListener('click', go);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });

    return card;
  }

  /* ---------------- 详情 ---------------- */
  function renderDetail(container, trip) {
    container.innerHTML = '';

    const sum = el('div', 'detail-summary');
    const d = el('div', 'detail-summary__dates');
    d.textContent = fmtCN(trip.departureDate) + ' → ' + fmtCN(trip.returnDate);
    const info = el('div', 'detail-summary__info');
    const bits = [];
    if (trip.travelers && trip.travelers.length) bits.push(trip.travelers.join('、'));
    const dn = daysNights(trip);
    if (dn) bits.push(dn);
    if (bits.length) info.textContent = bits.join(' · ');
    const tot = el('div', 'detail-summary__total');
    tot.innerHTML = money(computeTotal(trip)) + ' <small>合计</small>';
    sum.appendChild(d);
    if (bits.length) sum.appendChild(info);
    sum.appendChild(tot);
    container.appendChild(sum);

    const axis = el('div', 'axis');
    axis.appendChild(el('div', 'rail'));

    const pts = trip.points || [];
    const legs = trip.legs || [];
    pts.forEach((pt, i) => {
      axis.appendChild(roNode(pt));
      if (i < pts.length - 1) axis.appendChild(roLeg(legs[i]));
    });
    container.appendChild(axis);
  }

  function roNode(pt) {
    const node = el('div', 'node node--' + pt.role + ' ro-node');
    node.appendChild(el('span', 'node-dot'));

    const card = el('div', 'ro-card');
    const badge = el('span', 'node-badge');
    badge.textContent = pt.label;
    card.appendChild(badge);

    const addr = el('div', 'ro-addr' + (pt.address ? '' : ' is-empty'));
    addr.textContent = pt.address || '未填写地址';
    card.appendChild(addr);

    if (pt.stay && pt.stay.has) {
      const stay = el('div', 'ro-stay');
      stay.appendChild(roLine('酒店', pt.stay.hotel || '—'));
      stay.appendChild(roLine('入住', pt.stay.checkIn ? fmtCN(pt.stay.checkIn) : '—'));
      stay.appendChild(roLine('离店', pt.stay.checkOut ? fmtCN(pt.stay.checkOut) : '—'));
      stay.appendChild(roLine('住宿金额', pt.stay.amount ? money(pt.stay.amount) : '—'));
      card.appendChild(stay);
    } else {
      const none = el('div', 'ro-stay');
      const n = el('div', 'ro-stay__none');
      n.textContent = '不住宿';
      none.appendChild(n);
      card.appendChild(none);
    }

    node.appendChild(card);
    return node;
  }

  function roLine(k, v) {
    const line = el('div', 'ro-stay-line');
    const kk = el('span', 'k'); kk.textContent = k;
    const vv = el('span', 'v'); vv.textContent = v;
    line.appendChild(kk);
    line.appendChild(vv);
    return line;
  }

  function roLeg(leg) {
    const seg = el('div', 'ro-leg');
    if (!leg || !leg.mode) {
      const none = el('div', 'ro-leg-none');
      none.textContent = '未填写出行方式';
      seg.appendChild(none);
      return seg;
    }
    const line = el('div', 'ro-leg-line');
    const mode = el('span', 'ro-leg-mode'); mode.textContent = leg.mode;
    line.appendChild(mode);
    const detail = el('span', 'ro-leg-detail');
    detail.textContent = legDetail(leg);
    line.appendChild(detail);
    seg.appendChild(line);
    return seg;
  }

  function legDetail(leg) {
    const parts = [];
    if (leg.mode === '高铁' && leg.trainNo) parts.push(leg.trainNo);
    if (leg.mode === '飞机' && leg.flightNo) parts.push(leg.flightNo);
    if ((leg.mode === '打车' || leg.mode === '步行') && leg.duration) parts.push(leg.duration);
    if (leg.mode === '其他' && leg.note) parts.push(leg.note);
    if (leg.price) parts.push(money(leg.price));
    return parts.join(' · ') || '—';
  }

  global.Views = { renderList, renderDetail, computeTotal, shortAddr, sortTrips, tripDays, daysNights, allTravelers, filterByTravelers };
})(window);
