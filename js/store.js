/* 数据层：localStorage 增删改查 + 导出/导入 + 地点历史 */
(function (global) {
  'use strict';

  const TRIPS_KEY = 'travel_note_trips_v1';
  const LOC_KEY = 'travel_note_locations_v1';

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  const SORT_KEY = 'travel_note_sort_v1';
  const DEFAULT_SORT = 'date-desc';
  const DRAFT_KEY = 'travel_note_draft_v1';
  const FILTER_KEY = 'travel_note_filter_v1';

  function getSort() { return read(SORT_KEY, DEFAULT_SORT); }
  function setSort(key) { write(SORT_KEY, key); }

  function getFilter() {
    const f = read(FILTER_KEY, []);
    return Array.isArray(f) ? f : [];
  }
  function setFilter(names) { write(FILTER_KEY, names || []); }

  /* ---- 草稿（表单未保存状态，防误刷新丢失） ---- */
  function saveDraft(trip) {
    if (!trip) return;
    write(DRAFT_KEY, { id: trip.id, trip: trip, savedAt: Date.now() });
  }
  function getDraft() {
    const d = read(DRAFT_KEY, null);
    return (d && d.trip) ? d : null;
  }
  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  function normToggle(v) {
    return { has: !!(v && v.has), note: (v && v.note) || '' };
  }

  /** 补齐旧数据缺失字段（date / 报销开关），返回原地修正后的 trip。 */
  function normalizeTrip(t) {
    if (!t) return t;
    if (!Array.isArray(t.travelers)) t.travelers = [];
    (t.points || []).forEach((p) => {
      const s = (p.stay = p.stay || {});
      s.invoice = normToggle(s.invoice);
      s.waterBill = normToggle(s.waterBill);
    });
    (t.legs || []).forEach((l) => {
      if (l.date == null) l.date = '';
      if (l.mode === '高铁') {
        l.invoice = normToggle(l.invoice);
      } else if (l.mode === '飞机') {
        l.invoice = normToggle(l.invoice);
        l.boardingPass = normToggle(l.boardingPass);
        l.payScreenshot = normToggle(l.payScreenshot);
      }
    });
    return t;
  }

  function getTrips() {
    return read(TRIPS_KEY, []).map(normalizeTrip);
  }

  function getTrip(id) {
    const t = read(TRIPS_KEY, []).find((x) => x.id === id);
    return t ? normalizeTrip(t) : null;
  }

  function saveTrip(trip) {
    const list = read(TRIPS_KEY, []);
    const idx = list.findIndex((t) => t.id === trip.id);
    if (idx >= 0) list[idx] = trip;
    else list.unshift(trip);
    write(TRIPS_KEY, list);
    return trip;
  }

  function deleteTrip(id) {
    const list = read(TRIPS_KEY, []).filter((t) => t.id !== id);
    write(TRIPS_KEY, list);
  }

  function newId(prefix) {
    return (prefix || 't') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---- 地点历史（地址输入 autocomplete） ---- */
  function getLocations() {
    return read(LOC_KEY, []);
  }

  function rememberLocations(addrs) {
    const list = getLocations();
    (addrs || []).forEach((a) => {
      if (a && list.indexOf(a) < 0) list.push(a);
    });
    if (list.length > 200) list.splice(0, list.length - 200);
    write(LOC_KEY, list);
  }

  /* ---- 导出 / 导入 ---- */
  function exportJSON() {
    const data = {
      app: '旅途记',
      version: 1,
      exportedAt: new Date().toISOString(),
      trips: read(TRIPS_KEY, [])
    };
    return JSON.stringify(data, null, 2);
  }

  function importJSON(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('文件不是有效的 JSON');
    }
    const incoming = Array.isArray(data) ? data : (data && Array.isArray(data.trips) ? data.trips : null);
    if (!incoming) throw new Error('未找到 trips 数据');

    const byId = new Map(read(TRIPS_KEY, []).map((t) => [t.id, t]));
    let added = 0, updated = 0;
    incoming.forEach((t) => {
      if (!t || !t.id) return;
      if (byId.has(t.id)) updated++;
      else added++;
      byId.set(t.id, t);
    });
    write(TRIPS_KEY, Array.from(byId.values()));
    return { added: added, updated: updated, total: byId.size };
  }

  global.Store = {
    getTrips, getTrip, saveTrip, deleteTrip, newId,
    getLocations, rememberLocations, exportJSON, importJSON,
    getSort, setSort, getFilter, setFilter, saveDraft, getDraft, clearDraft
  };
})(window);
