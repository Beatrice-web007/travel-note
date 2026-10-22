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

  function getTrips() {
    const list = read(TRIPS_KEY, []);
    return list.slice().sort((a, b) => {
      const byDate = (b.departureDate || '').localeCompare(a.departureDate || '');
      return byDate !== 0 ? byDate : (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  function getTrip(id) {
    return read(TRIPS_KEY, []).find((t) => t.id === id) || null;
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
    getLocations, rememberLocations, exportJSON, importJSON
  };
})(window);
