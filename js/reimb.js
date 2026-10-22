/* 报销模块：汇总高铁/飞机的发票·登机牌·支付截图 与住宿的发票·水单 */
(function (global) {
  'use strict';

  const { el, money, num } = Util;
  const { fmtCN } = Dates;

  function shortAddr(pt) {
    return (pt && ((pt.address || '').trim() || pt.label || '')) || '';
  }

  function render(container) {
    container.innerHTML = '';
    const trips = Views.sortTrips(
      Views.filterByTravelers(Store.getTrips(), Store.getFilter()),
      Store.getSort()
    );
    if (!trips.length) {
      const e = el('div', 'empty');
      e.innerHTML =
        '<div class="stamp">票</div>' +
        '<h3>还没有旅行记录</h3>' +
        '<p>先在「行程」里新建旅行，发票、登机牌、水单会在这里汇总。</p>';
      container.appendChild(e);
      return;
    }
    trips.forEach((t) => container.appendChild(tripBlock(t)));
  }

  function tripBlock(trip) {
    const card = el('section', 'reimb-card');

    const head = el('div', 'reimb-head');
    const dates = el('div', 'reimb-head__dates');
    dates.textContent = fmtCN(trip.departureDate) + ' — ' + fmtCN(trip.returnDate);
    const route = el('div', 'reimb-head__route');
    route.textContent = (trip.points || []).map(shortAddr).filter(Boolean).join(' → ');
    head.appendChild(dates);
    head.appendChild(route);
    card.appendChild(head);

    const trans = (trip.legs || []).map((leg, i) => ({ leg: leg, i: i }))
      .filter((x) => x.leg.mode === '高铁' || x.leg.mode === '飞机');
    if (trans.length) {
      const sec = el('div', 'reimb-section');
      sec.appendChild(sectionTitle('交通'));
      trans.forEach(({ leg, i }) => sec.appendChild(legBlock(trip, leg, i)));
      card.appendChild(sec);
    }

    const stays = (trip.points || []).filter((p) => p.stay && p.stay.has);
    if (stays.length) {
      const sec = el('div', 'reimb-section');
      sec.appendChild(sectionTitle('住宿'));
      stays.forEach((p) => sec.appendChild(stayBlock(trip, p)));
      card.appendChild(sec);
    }

    return card;
  }

  function sectionTitle(text) {
    const t = el('div', 'reimb-section__title');
    t.textContent = text;
    return t;
  }

  function legBlock(trip, leg, i) {
    const item = el('div', 'reimb-item');

    const line = el('div', 'reimb-item__line');
    const mode = el('span', 'reimb-item__mode');
    mode.textContent = leg.mode;
    const date = el('span', 'reimb-item__sub');
    date.textContent = leg.date ? fmtCN(leg.date) : '日期未填';
    const no = el('span', 'reimb-item__sub');
    no.textContent = leg.mode === '高铁' ? (leg.trainNo || '—') : (leg.flightNo || '—');
    const amount = el('span', 'reimb-item__amount');
    amount.textContent = money(leg.price);
    line.appendChild(mode);
    line.appendChild(date);
    line.appendChild(no);
    line.appendChild(amount);
    item.appendChild(line);

    const route = el('div', 'reimb-item__route');
    route.textContent = shortAddr(trip.points[i]) + ' → ' + shortAddr(trip.points[i + 1]);
    item.appendChild(route);

    const save = () => { trip.updatedAt = Date.now(); Store.saveTrip(trip); };

    if (leg.mode === '高铁') {
      item.appendChild(toggleRow('申请发票', leg.invoice, save));
    } else {
      item.appendChild(toggleRow('获得登机牌', leg.boardingPass, save));
      item.appendChild(toggleRow('申请发票', leg.invoice, save));
      if (num(leg.price) > 1000) {
        item.appendChild(toggleRow('获得支付截图', leg.payScreenshot, save));
      }
    }

    return item;
  }

  function stayBlock(trip, p) {
    const item = el('div', 'reimb-item');

    const line = el('div', 'reimb-item__line');
    const mode = el('span', 'reimb-item__mode');
    mode.textContent = p.label + '住宿';
    const hotel = el('span', 'reimb-item__sub');
    hotel.textContent = p.stay.hotel || '—';
    const amount = el('span', 'reimb-item__amount');
    amount.textContent = money(p.stay.amount);
    line.appendChild(mode);
    line.appendChild(hotel);
    line.appendChild(amount);
    item.appendChild(line);

    const route = el('div', 'reimb-item__route');
    route.textContent = '入住 ' + fmtCN(p.stay.checkIn) + ' · 离店 ' + fmtCN(p.stay.checkOut);
    item.appendChild(route);

    const save = () => { trip.updatedAt = Date.now(); Store.saveTrip(trip); };
    item.appendChild(toggleRow('申请发票', p.stay.invoice, save));
    item.appendChild(toggleRow('申请水单', p.stay.waterBill, save));

    return item;
  }

  function toggleRow(label, obj, onChange) {
    obj = obj || { has: false, note: '' };

    const row = el('div', 'toggle-row');

    const lab = el('span', 'toggle-row__label');
    lab.textContent = label;
    row.appendChild(lab);

    const seg = el('div', 'seg');
    ['是', '否'].forEach((v) => {
      const b = el('button', 'seg-btn', { type: 'button' });
      b.textContent = v;
      if ((v === '是') === !!obj.has) b.classList.add('seg-btn--on');
      b.onclick = () => {
        obj.has = (v === '是');
        seg.querySelectorAll('.seg-btn').forEach((x) => x.classList.remove('seg-btn--on'));
        b.classList.add('seg-btn--on');
        if (onChange) onChange();
      };
      seg.appendChild(b);
    });
    row.appendChild(seg);

    const note = el('input', 'toggle-note', { type: 'text', placeholder: '备注', value: obj.note || '', autocomplete: 'off' });
    note.addEventListener('input', () => { obj.note = note.value; if (onChange) onChange(); });
    row.appendChild(note);

    return row;
  }

  global.Reimb = { render: render };
})(window);
