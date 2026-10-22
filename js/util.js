/* 通用工具 */
(function (global) {
  'use strict';

  /** 创建 DOM 元素 */
  function el(tag, cls, attrs) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach((k) => n.setAttribute(k, attrs[k]));
    return n;
  }

  /** 按点路径设置对象值，如 "points.0.stay.has" */
  function setPath(obj, path, value) {
    const keys = path.split('.');
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (o[keys[i]] == null) o[keys[i]] = {};
      o = o[keys[i]];
    }
    o[keys[keys.length - 1]] = value;
  }

  /** 读取点路径值 */
  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  function num(v) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  function money(v) {
    const n = num(v);
    return '¥' + (Math.round(n * 100) / 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  }

  global.Util = { el, setPath, getPath, num, money };
})(window);
