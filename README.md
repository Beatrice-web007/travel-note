# 旅途记 · 旅行费用记录

一个可添加到手机主屏幕的 PWA，用「纵向长轴」记录每次旅行的路线、出行方式与费用。

## 功能

- **出发 / 返回日期**：年/月/日三列滚动选择，默认当天，返回日期下限锁定为出发日期。
- **地点链**：出发点 → 途径点1…n → 终点，纵向长线条连接；地址输入带历史自动补全；途径点可增删并自动重命名。
- **出行方式**：高铁 / 飞机 / 打车 / 步行 / 其他，横向滚动选择。
  - 高铁：车次 + 价格（**必填**）
  - 飞机：航班号 + 价格（**必填**）
  - 打车 / 步行 / 其他：时长 / 价格 / 备注（选填）
- **是否住宿**：开关，选"是"展开 酒店名称 / 入住日期 / 离店日期 / 住宿金额。
- **备份**：导出 / 导入 JSON 文件（按 id 合并去重）。

## 技术栈

纯前端 vanilla HTML/CSS/JS + PWA（manifest + Service Worker），数据存 localStorage，无需服务器与注册登录。

## 本地运行

```bash
cd 项目目录
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 添加到手机主屏幕

1. 用 Chrome 打开部署链接（需 HTTPS，如 GitHub Pages）。
2. Android Chrome：菜单 →「安装应用 / 添加到主屏幕」。
3. iOS Safari：分享 →「添加到主屏幕」。

## 文件结构

```
index.html         单页壳 + 三视图（列表/表单/详情）
css/styles.css     全部样式
js/                util / store / dates / form / views / app
manifest.json      PWA 清单
sw.js              Service Worker（离线缓存）
icons/             App 图标（SVG + PNG）
```
