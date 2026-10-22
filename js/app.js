/* 入口：hash 路由 + 视图切换 + 事件绑定 */
(function () {
  'use strict';

  const { el } = Util;

  const $list = document.getElementById('view-list');
  const $form = document.getElementById('view-form');
  const $detail = document.getElementById('view-detail');
  const $listBody = document.getElementById('trip-list');
  const $formBody = document.getElementById('form-body');
  const $detailBody = document.getElementById('detail-body');
  const $formTitle = document.getElementById('form-title');

  let formCtl = null;
  let currentDetailId = null;

  /* ---------------- Toast ---------------- */
  let toastTimer = null;
  function toast(msg, isErr) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast' + (isErr ? ' toast--err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  /* ---------------- 视图切换 ---------------- */
  function showView(name) {
    $list.classList.toggle('hidden', name !== 'list');
    $form.classList.toggle('hidden', name !== 'form');
    $detail.classList.toggle('hidden', name !== 'detail');
  }

  function refreshLocHistory() {
    const dl = document.getElementById('loc-history');
    dl.innerHTML = '';
    Store.getLocations().forEach((l) => {
      const o = document.createElement('option');
      o.value = l;
      dl.appendChild(o);
    });
  }

  /* ---------------- 各视图 ---------------- */
  function showList() {
    showView('list');
    refreshLocHistory();
    Views.renderList($listBody, Store.getTrips(), (id) => { location.hash = '#/view/' + id; });
  }

  function showForm(id) {
    showView('form');
    refreshLocHistory();
    const trip = id
      ? JSON.parse(JSON.stringify(Store.getTrip(id)))
      : Form.newTrip();
    if (!trip) { location.hash = '#/'; return; }
    $formTitle.textContent = id ? '编辑旅行' : '新建旅行';
    formCtl = Form.mountForm($formBody, trip);
  }

  function showDetail(id) {
    showView('detail');
    const trip = Store.getTrip(id);
    if (!trip) { location.hash = '#/'; return; }
    currentDetailId = id;
    Views.renderDetail($detailBody, trip);
  }

  /* ---------------- 保存 / 删除 ---------------- */
  function save() {
    if (!formCtl) return;
    const trip = formCtl.trip;
    const errs = Form.validate(trip);
    if (errs.length) {
      toast('请完善：' + errs.slice(0, 3).join('、') + (errs.length > 3 ? ' 等' : ''), true);
      return;
    }
    Store.saveTrip(trip);
    Store.rememberLocations((trip.points || []).map((p) => (p.address || '').trim()).filter(Boolean));
    toast('已保存');
    location.hash = '#/';
  }

  function removeTrip() {
    if (!currentDetailId) return;
    if (!confirm('确定删除这条旅行记录？此操作不可撤销。')) return;
    Store.deleteTrip(currentDetailId);
    toast('已删除');
    location.hash = '#/';
  }

  /* ---------------- 导出 / 导入 ---------------- */
  function download(filename, text) {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function doExport() {
    const text = Store.exportJSON();
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    download('旅途记备份_' + stamp + '.json', text);
    toast('已导出备份');
  }

  function doImport(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const r = Store.importJSON(String(reader.result));
        toast('导入完成：新增 ' + r.added + ' 条，更新 ' + r.updated + ' 条');
        showList();
      } catch (e) {
        toast(e.message || '导入失败', true);
      }
    };
    reader.onerror = () => toast('读取文件失败', true);
    reader.readAsText(file);
  }

  /* ---------------- 路由 ---------------- */
  function route() {
    const hash = location.hash || '#/';
    const parts = hash.replace(/^#\//, '').split('/');
    const seg = parts[0] || '';
    const id = parts[1] || '';
    if (seg === 'new') showForm(null);
    else if (seg === 'edit' && id) showForm(id);
    else if (seg === 'view' && id) showDetail(id);
    else showList();
  }

  /* ---------------- 事件绑定 ---------------- */
  document.getElementById('btn-new').addEventListener('click', () => { location.hash = '#/new'; });
  document.getElementById('btn-back').addEventListener('click', () => { location.hash = '#/'; });
  document.getElementById('btn-save').addEventListener('click', save);
  document.getElementById('btn-detail-back').addEventListener('click', () => { location.hash = '#/'; });
  document.getElementById('btn-edit').addEventListener('click', () => { location.hash = '#/edit/' + currentDetailId; });
  document.getElementById('btn-delete').addEventListener('click', removeTrip);
  document.getElementById('btn-export').addEventListener('click', doExport);
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('file-import').click();
  });
  document.getElementById('file-import').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) doImport(f);
    e.target.value = '';
  });

  window.addEventListener('hashchange', route);

  /* ---------------- Service Worker ---------------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  route();
})();
