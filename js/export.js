/* 文字导出模块：多选旅行 → 生成 txt 行程文字 → 分享 / 下载 */
(function (global) {
  'use strict';

  const { el, num } = Util;
  const { fmtCN } = Dates;

  let allTrips = [];
  let selection = new Set();
  let mounted = false;

  function shortAddr(pt) {
    return (pt && ((pt.address || '').trim() || pt.label || '')) || '';
  }

  function transportPhrase(leg) {
    switch (leg.mode) {
      case '高铁': return '乘坐' + ((leg.trainNo || '').trim()) + '列车';
      case '飞机': return '乘坐' + ((leg.flightNo || '').trim()) + '航班';
      case '打车': return '打车';
      case '步行': return '步行';
      default: return '乘坐' + (((leg.note || '').trim()) || '其他');
    }
  }

  function yuan(v) {
    const n = Math.round(num(v) * 100) / 100;
    return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) + '元';
  }

  function buildTripText(trip) {
    const pts = trip.points || [];
    const legs = trip.legs || [];
    const start = shortAddr(pts[0]);
    const clauses = [];
    legs.forEach((leg, i) => {
      if (!leg.mode) return;
      const from = shortAddr(pts[i]);
      const to = shortAddr(pts[i + 1]);
      const isReturn = !!start && start === to;
      const date = leg.date || (isReturn && trip.returnDate ? trip.returnDate : trip.departureDate);
      clauses.push('于' + fmtCN(date) + transportPhrase(leg) + '由' + from + (isReturn ? '返回' : '至') + to);
    });
    const stayTotal = pts.reduce((s, p) => s + (p.stay && p.stay.has ? num(p.stay.amount) : 0), 0);
    const tail = stayTotal > 0 ? '。期间产生住宿费' + yuan(stayTotal) + '。' : '。';
    return clauses.join('，') + tail;
  }

  function render(container) {
    if (!mounted) {
      mounted = true;
      document.getElementById('export-select-all').addEventListener('click', selectAll);
      document.getElementById('export-do').addEventListener('click', doExport);
    }
    allTrips = Views.sortTrips(Store.getTrips(), Store.getSort());
    selection = new Set(allTrips.filter((t) => selection.has(t.id)).map((t) => t.id));

    container.innerHTML = '';
    if (!allTrips.length) {
      const e = el('div', 'empty');
      e.innerHTML =
        '<div class="stamp">文</div>' +
        '<h3>还没有旅行记录</h3>' +
        '<p>先在「行程」里新建旅行，再回来导出文字记录。</p>';
      container.appendChild(e);
      updateBar();
      return;
    }
    allTrips.forEach((t) => container.appendChild(row(t)));
    updateBar();
  }

  function row(t) {
    const r = el('label', 'export-row');
    const cb = el('input', 'export-row__check', { type: 'checkbox' });
    cb.dataset.id = t.id;
    cb.checked = selection.has(t.id);
    cb.onchange = () => {
      if (cb.checked) selection.add(t.id); else selection.delete(t.id);
      updateBar();
    };
    r.appendChild(cb);

    const body = el('div', 'export-row__body');
    const dates = el('div', 'export-row__dates');
    dates.textContent = fmtCN(t.departureDate) + ' → ' + fmtCN(t.returnDate);
    const route = el('div', 'export-row__route');
    route.textContent = (t.points || []).map(shortAddr).filter(Boolean).join(' → ');
    body.appendChild(dates);
    body.appendChild(route);
    r.appendChild(body);

    return r;
  }

  function updateBar() {
    document.getElementById('export-count').textContent = '已选 ' + selection.size + ' 段';
    document.getElementById('export-select-all').textContent =
      (allTrips.length && selection.size === allTrips.length) ? '取消全选' : '全选';
    document.getElementById('export-do').disabled = selection.size === 0;
  }

  function selectAll() {
    const allSelected = allTrips.length > 0 && selection.size === allTrips.length;
    selection = allSelected ? new Set() : new Set(allTrips.map((t) => t.id));
    document.querySelectorAll('#export-body .export-row__check').forEach((cb) => {
      cb.checked = selection.has(cb.dataset.id);
    });
    updateBar();
  }

  function doExport() {
    const chosen = allTrips.filter((t) => selection.has(t.id));
    if (!chosen.length) { AppUI.toast('请先选择要导出的旅行'); return; }
    const text = chosen.map(buildTripText).join('\n\n');
    const fileText = '﻿' + text; // 加 UTF-8 BOM，避免部分系统查看器直接打开乱码
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = '旅途记文字_' + stamp + '.txt';
    const file = new File([fileText], filename, { type: 'text/plain;charset=utf-8' });

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

    if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        navigator.share({ files: [file], title: '旅途记文字记录', text: text })
          .catch((err) => {
            if (err && err.name === 'AbortError') return; // 用户取消分享，不处理
            AppUI.download(filename, fileText, 'text/plain;charset=utf-8');
            AppUI.toast('已导出 txt');
          });
      } catch (e) {
        AppUI.download(filename, fileText, 'text/plain;charset=utf-8');
        AppUI.toast('已导出 txt');
      }
    } else {
      AppUI.download(filename, fileText, 'text/plain;charset=utf-8');
      AppUI.toast('已导出 txt');
    }
  }

  global.Export = { render: render };
})(window);
