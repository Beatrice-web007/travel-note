/* 日期工具 + 年/月/日三列滚动选择器 */
(function (global) {
  'use strict';

  const ITEM_H = 44;

  const pad = (n) => String(n).padStart(2, '0');

  function parseDate(s) {
    if (!s) return null;
    const parts = String(s).split('-').map(Number);
    return { y: parts[0], m: parts[1], d: parts[2] };
  }
  function toStr(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function todayStr() {
    const d = new Date();
    return toStr(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  function fmtCN(s) {
    const p = parseDate(s);
    return p ? p.y + '年' + p.m + '月' + p.d + '日' : '';
  }
  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

  /** 计算 b 相对 a 的天数差（可为负，跨天用 UTC 避免夏令时误差） */
  function diffDays(a, b) {
    const pa = parseDate(a), pb = parseDate(b);
    if (!pa || !pb) return 0;
    return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000);
  }

  /* ---------------- 滚轮列 ---------------- */
  function WheelColumn(el) {
    this.el = el;
    this.values = [];
    this.index = 0;
    this.onChange = null;
    this._silent = false;
    this._dragging = false;

    el.addEventListener('scroll', () => this._onScroll(), { passive: true });
    el.addEventListener('scrollend', () => this._snap());
    el.addEventListener('click', (e) => {
      const it = e.target.closest('.wheel-item');
      if (it) this.select(Number(it.dataset.i));
    });
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      this._dragging = true;
      this._startY = e.clientY;
      this._startScroll = el.scrollTop;
      el.classList.add('dragging');
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      if (!this._dragging) return;
      el.scrollTop = this._startScroll - (e.clientY - this._startY);
    });
    const endDrag = () => {
      if (!this._dragging) return;
      this._dragging = false;
      el.classList.remove('dragging');
      this._snap();
    };
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }

  WheelColumn.prototype.setValues = function (values, selectedValue) {
    this.values = values;
    let idx = values.indexOf(selectedValue);
    if (idx < 0) idx = 0;
    this._render(idx);
  };

  WheelColumn.prototype._render = function (centerIdx) {
    const h = ITEM_H;
    const items = this.values.map((v, i) =>
      '<div class="wheel-item" data-i="' + i + '">' + v + '</div>'
    ).join('');
    this.el.innerHTML =
      '<div class="wheel-pad" style="height:' + (h * 2) + 'px"></div>' +
      items +
      '<div class="wheel-pad" style="height:' + (h * 2) + 'px"></div>';
    this.index = Math.min(Math.max(centerIdx, 0), this.values.length - 1);
    this._silent = true;
    this.el.scrollTop = this.index * h;
    this._silent = false;
    this._syncActive();
  };

  WheelColumn.prototype._onScroll = function () {
    if (this._silent) return;
    const i = this._nearest();
    if (i !== this.index) {
      this.index = i;
      this._syncActive();
      if (this.onChange) this.onChange(this.values[i], i);
    }
  };

  WheelColumn.prototype._snap = function () {
    const i = this._nearest();
    this.index = i;
    this.el.scrollTop = i * ITEM_H;
    this._syncActive();
  };

  WheelColumn.prototype.select = function (i) {
    this.index = Math.min(Math.max(i, 0), this.values.length - 1);
    this.el.scrollTo({ top: this.index * ITEM_H, behavior: 'smooth' });
    this._syncActive();
    if (this.onChange) this.onChange(this.values[this.index], this.index);
  };

  WheelColumn.prototype._nearest = function () {
    const i = Math.round(this.el.scrollTop / ITEM_H);
    return Math.min(Math.max(i, 0), this.values.length - 1);
  };

  WheelColumn.prototype._syncActive = function () {
    const items = this.el.querySelectorAll('.wheel-item');
    for (let i = 0; i < items.length; i++) {
      items[i].classList.toggle('is-active', Number(items[i].dataset.i) === this.index);
    }
  };

  WheelColumn.prototype.getValue = function () { return this.values[this.index]; };

  /* ---------------- 选择器弹层 ---------------- */
  let picker = null;

  function ensurePicker() {
    if (picker) return picker;
    const mask = document.createElement('div');
    mask.className = 'picker-mask hidden';
    mask.innerHTML =
      '<div class="picker">' +
        '<div class="picker-head">' +
          '<button class="picker-cancel" type="button">取消</button>' +
          '<div class="picker-title"></div>' +
          '<button class="picker-ok" type="button">确定</button>' +
        '</div>' +
        '<div class="picker-body">' +
          '<div class="wheel-col"><div class="wheel" data-kind="year"></div><div class="wheel-unit">年</div></div>' +
          '<div class="wheel-col"><div class="wheel" data-kind="month"></div><div class="wheel-unit">月</div></div>' +
          '<div class="wheel-col"><div class="wheel" data-kind="day"></div><div class="wheel-unit">日</div></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', (e) => {
      if (e.target === mask) closePicker(null);
    });

    picker = {
      mask: mask,
      title: mask.querySelector('.picker-title'),
      ok: mask.querySelector('.picker-ok'),
      cancel: mask.querySelector('.picker-cancel'),
      cols: {
        year: new WheelColumn(mask.querySelector('[data-kind="year"]')),
        month: new WheelColumn(mask.querySelector('[data-kind="month"]')),
        day: new WheelColumn(mask.querySelector('[data-kind="day"]'))
      }
    };
    return picker;
  }

  let closePicker = function () {};

  /**
   * 打开日期选择器。
   * options: { value:'YYYY-MM-DD', min, max, title }
   * 返回 Promise<string|null>
   */
  function pickDate(options) {
    const opts = Object.assign({ value: todayStr(), min: null, max: null, title: '选择日期' }, options || {});
    return new Promise((resolve) => {
      const P = ensurePicker();
      const cur = parseDate(opts.value) || parseDate(todayStr());
      const nowY = new Date().getFullYear();
      const years = [];
      for (let y = nowY - 1; y <= nowY + 5; y++) years.push(y);
      const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

      const sel = { y: cur.y, m: cur.m, d: cur.d };

      function refreshDays() {
        const maxD = daysInMonth(sel.y, sel.m);
        const days = [];
        for (let d = 1; d <= maxD; d++) days.push(d);
        const dv = Math.min(sel.d, maxD);
        P.cols.day.setValues(days, dv);
        sel.d = dv;
      }

      P.title.textContent = opts.title;
      P.cols.year.onChange = (v) => { sel.y = v; refreshDays(); };
      P.cols.month.onChange = (v) => { sel.m = v; refreshDays(); };
      P.cols.day.onChange = (v) => { sel.d = v; };

      P.cols.year.setValues(years, sel.y);
      P.cols.month.setValues(months, sel.m);
      refreshDays();

      closePicker = function (val) {
        P.mask.classList.add('hidden');
        P.cols.year.onChange = P.cols.month.onChange = P.cols.day.onChange = null;
        resolve(val);
      };

      P.ok.onclick = function () {
        let out = toStr(sel.y, sel.m, sel.d);
        if (opts.min && out < opts.min) out = opts.min;
        if (opts.max && out > opts.max) out = opts.max;
        closePicker(out);
      };
      P.cancel.onclick = function () { closePicker(null); };

      P.mask.classList.remove('hidden');
    });
  }

  global.Dates = { pickDate, todayStr, fmtCN, parseDate, daysInMonth, diffDays, toStr };
})(window);
