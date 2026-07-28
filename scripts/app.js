/* ============================================
   应用主框架 - 导航 / 弹窗 / 工具函数
   ============================================ */

const App = {
  navItems: [
    { key: 'home', icon: '🏠', label: '首页' },
    { key: 'study', icon: '📚', label: '学习' },
    { key: 'punch', icon: '📍', label: '打卡' },
    { key: 'account', icon: '💰', label: '记账' },
    { key: 'travel', icon: '✈️', label: '旅游' },
    { key: 'more', icon: '☰', label: '更多' }
  ],

  // ====== 导航栏配置管理 ======
  navConfig: {
    order: null,   // null 表示使用默认顺序
    hidden: []     // 隐藏的 Tab key 列表
  },

  moreModules: [
    { key: 'knowledge', icon: '📖', label: '知识库', sub: '小红书收藏收集' },
    { key: 'pet', icon: '🐾', label: '宠物记录', sub: '健康与成长' },
    { key: 'recipe', icon: '🍳', label: '我会下厨', sub: '菜谱与买菜' },
    { key: 'museum', icon: '🏺', label: '博物馆掠影', sub: '文物识别' },
    { key: 'interest', icon: '💡', label: '兴趣清单', sub: '想做的事' },
    { key: 'work', icon: '💼', label: '工作清单', sub: '进度管理' },
    { key: 'settings', icon: '⚙️', label: '设置', sub: 'AI / 安装 / 提醒' }
  ],

  titles: {
    home: { title: '今日有雨', sub: '记录每一个想被珍藏的日子' },
    study: { title: '学习中心', sub: '日积月累 · 终有所成' },
    recipe: { title: '我会下厨', sub: '一饭一蔬皆是生活' },
    museum: { title: '博物馆掠影', sub: '一眼千年 · 文物留痕' },
    punch: { title: '打卡清单', sub: '城市漫步指南' },
    travel: { title: '旅游清单', sub: '此生必去的远方' },
    interest: { title: '兴趣清单', sub: '把生活过成想要的样子' },
    account: { title: '记账本', sub: '每一笔都有去处' },
    work: { title: '工作清单', sub: '今日事今日毕' },
    pet: { title: '宠物记录', sub: '健康与成长 · 陪伴每一天' },
    settings: { title: '设置', sub: '让手账更懂你' },
    more: { title: '更多模块', sub: '生活的方方面面' },
    knowledge: { title: '知识库', sub: '收集 · 分类 · 回顾' },

  init() {
    this.renderNav();
    this.bindEvents();
    this.checkInstall();
  },

  getVisibleNavItems() {
    // 从 localStorage 加载配置
    const config = localStorage.getItem('navConfig');
    let order = null, hidden = [];
    if (config) {
      try {
        const c = JSON.parse(config);
        order = c.order;
        hidden = c.hidden || [];
      } catch(e) {}
    }
    const all = this.navItems;
    const visible = all.filter(n => !hidden.includes(n.key) && n.key !== 'home'); // home 始终显示
    // home 始终在第一位
    const result = [all[0]];
    if (order) {
      order.filter(k => visible.some(v => v.key === k)).forEach(k => {
        const item = visible.find(v => v.key === k);
        if (item) result.push(item);
      });
      // 处理不在 order 中但可见的项
      visible.forEach(v => {
        if (!order.includes(v.key) && !result.some(r => r.key === v.key)) {
          result.push(v);
        }
      });
    } else {
      result.push(...visible);
    }
    return result;
  },

  renderNav() {
    const nav = document.getElementById('appNav');
    const items = this.getVisibleNavItems();
    nav.style.setProperty('--nav-count', items.length);
    nav.innerHTML = items
      .map(
        (i) => `
      <button class="nav-item" data-route="${i.key}">
        <span class="nav-icon">${i.icon}</span>
        <span>${i.label}</span>
      </button>`
      )
      .join('');
    nav.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => router.navigate(btn.dataset.route));
    });
  },

  bindEvents() {
    document.getElementById('sheetClose').addEventListener('click', () => UI.hideSheet());
    document.getElementById('overlay').addEventListener('click', () => UI.hideSheet());
    document.getElementById('searchBtn').addEventListener('click', () => UI.showSearch());
    document.getElementById('fab').addEventListener('click', () => {
      if (this.currentFab) this.currentFab();
    });
  },

  setActiveNav(route) {
    // 高亮底部导航中匹配的项（包括「更多」）
    const navKeys = this.navItems.map((n) => n.key);
    // more 页面及 moreModules 里的模块都高亮「更多」
    const moreKeys = ['more', ...this.moreModules.map((m) => m.key)];
    document.querySelectorAll('.nav-item').forEach((b) => {
      let active = b.dataset.route === route && navKeys.includes(route);
      if (moreKeys.includes(route) && b.dataset.route === 'more') active = true;
      b.classList.toggle('active', active);
    });
    const t = this.titles[route] || this.titles.home;
    document.getElementById('pageTitle').textContent = t.title;
    document.getElementById('pageSub').textContent = t.sub;
    // 新增：计算激活 Tab 的索引，设置 CSS 变量
    const keys = this.getVisibleNavItems().map(n => n.key);
    const activeIndex = keys.indexOf(route);
    const nav = document.getElementById('appNav');
    if (activeIndex >= 0 && nav) {
      nav.style.setProperty('--nav-slider-index', activeIndex);
    }
  },

  setFab(handler) {
    const fab = document.getElementById('fab');
    if (handler) {
      this.currentFab = handler;
      fab.style.display = 'flex';
    } else {
      this.currentFab = null;
      fab.style.display = 'none';
    }
  },

  /* PWA 安装 */
  deferredPrompt: null,
  checkInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallBanner();
    });
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      const banner = document.getElementById('installBanner');
      if (banner) banner.remove();
      UI.toast('已添加到桌面，随时打开使用');
    });
  },

  showInstallBanner() {
    if (document.getElementById('installBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'installBanner';
    banner.className = 'install-banner';
    banner.innerHTML = `📱 添加到手机桌面，像 App 一样使用<button id="installBtn">立即添加</button>`;
    document.getElementById('app').insertBefore(banner, document.querySelector('.app-main'));
    document.getElementById('installBtn').addEventListener('click', async () => {
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          this.deferredPrompt = null;
          banner.remove();
        }
      } else {
        UI.showInstallGuide();
      }
    });
  }
};

/* ===== UI 工具 ===== */
const UI = {
  sheetEl: document.getElementById('sheet'),
  overlayEl: document.getElementById('overlay'),
  sheetTitleEl: document.getElementById('sheetTitle'),
  sheetBodyEl: document.getElementById('sheetBody'),

  showSheet(title, bodyHtml, onMount) {
    this.sheetTitleEl.textContent = title;
    this.sheetBodyEl.innerHTML = bodyHtml;
    this.overlayEl.classList.add('show');
    this.sheetEl.classList.add('show');
    if (onMount) onMount(this.sheetBodyEl);
    this.sheetBodyEl.scrollTop = 0;
  },

  hideSheet() {
    this.overlayEl.classList.remove('show');
    this.sheetEl.classList.remove('show');
  },

  toast(msg, duration = 2000) {
    const t = document.createElement('div');
    t.style.cssText = `
      position: fixed; left: 50%; top: 50%; transform: translate(-50%,-50%);
      background: rgba(43,38,34,0.9); color: #faf5ec; padding: 10px 18px;
      border-radius: 10px; font-size: 13px; z-index: 9999;
      animation: popIn 0.3s ease; max-width: 80%; text-align: center;
    `;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity 0.3s';
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 300);
    }, duration);
  },

  confirm(msg) {
    return new Promise((resolve) => {
      const body = `
        <div style="font-size:14px; color: var(--ink-soft); line-height:1.6; margin-bottom: 16px;">${msg}</div>
        <div class="form-actions">
          <button class="btn btn-ghost" id="confirmNo">取消</button>
          <button class="btn btn-primary" id="confirmYes">确定</button>
        </div>`;
      this.showSheet('请确认', body, (root) => {
        root.querySelector('#confirmNo').onclick = () => {
          this.hideSheet();
          resolve(false);
        };
        root.querySelector('#confirmYes').onclick = () => {
          this.hideSheet();
          resolve(true);
        };
      });
    });
  },

  /* 图片选择与压缩 */
  pickImages(maxCount = 9) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = maxCount > 1;
      input.onchange = async () => {
        const files = Array.from(input.files).slice(0, maxCount);
        const results = [];
        for (const f of files) {
          const dataUrl = await this.compressImage(f, 1200, 0.8);
          results.push(dataUrl);
        }
        resolve(results);
      };
      input.click();
    });
  },

  pickImage() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const f = input.files[0];
        if (!f) return resolve(null);
        const dataUrl = await this.compressImage(f, 1400, 0.85);
        resolve(dataUrl);
      };
      input.click();
    });
  },

  compressImage(file, maxSize, quality) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height * maxSize) / width;
              width = maxSize;
            } else {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  formatDate(ts, withTime = false) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (!withTime) return date;
    return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  relativeDate(ts) {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return `${min} 分钟前`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} 小时前`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d} 天前`;
    return this.formatDate(ts);
  },

  todayStr() {
    return this.formatDate(Date.now());
  },

  /* 全局搜索 */
  showSearch() {
    const body = `
      <div class="search-bar">
        <span>🔍</span>
        <input id="searchInput" placeholder="搜索学习/打卡/旅游/工作..." />
      </div>
      <div id="searchResults" style="min-height: 200px;"></div>
    `;
    this.showSheet('搜索', body, (root) => {
      const input = root.querySelector('#searchInput');
      const results = root.querySelector('#searchResults');
      input.focus();
      let timer;
      input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const q = input.value.trim();
          if (!q) {
            results.innerHTML = '<div class="empty"><div class="emoji">🔎</div><div class="hint">输入关键词开始搜索</div></div>';
            return;
          }
          results.innerHTML = '<div style="text-align:center;padding:30px;"><div class="spinner" style="margin:0 auto;"></div></div>';
          const items = await App.search(q);
          if (items.length === 0) {
            results.innerHTML = '<div class="empty"><div class="emoji">📭</div><div class="hint">没有找到相关内容</div></div>';
            return;
          }
          results.innerHTML = items
            .map(
              (i) => `
            <div class="list-item" data-action="goto" data-route="${i.route}">
              <div class="li-row">
                <span style="font-size:20px">${i.icon}</span>
                <div style="flex:1">
                  <div class="li-title">${i.title}</div>
                  <div class="li-sub">${i.sub || ''}</div>
                </div>
                <span class="chip">${i.type}</span>
              </div>
            </div>`
            )
            .join('');
          results.querySelectorAll('[data-action="goto"]').forEach((el) => {
            el.addEventListener('click', () => {
              this.hideSheet();
              router.navigate(el.dataset.route);
            });
          });
        }, 300);
      });
      results.innerHTML = '<div class="empty"><div class="emoji">🔎</div><div class="hint">输入关键词开始搜索</div></div>';
    });
  },

  showInstallGuide() {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const body = `
      <div style="font-size:13px; color: var(--ink-soft); line-height:1.8;">
        ${
          isIOS
            ? `<p><b>iPhone / iPad 添加到桌面：</b></p>
               <p>1. 点击 Safari 底部的 <b>分享按钮</b> ⬆️</p>
               <p>2. 选择 <b>「添加到主屏幕」</b></p>
               <p>3. 点击 <b>「添加」</b> 即可</p>
               <p style="margin-top:10px;color:var(--ink-mute);font-size:12px">※ 需使用 Safari 打开本页面</p>`
            : `<p><b>Android 添加到桌面：</b></p>
               <p>1. 点击浏览器菜单 <b>⋮</b></p>
               <p>2. 选择 <b>「添加到主屏幕」</b> 或 <b>「安装应用」</b></p>
               <p>3. 确认添加即可</p>`
        }
      </div>
      <div class="form-actions" style="margin-top:16px">
        <button class="btn btn-primary" id="guideClose" style="flex:1">我知道了</button>
      </div>`;
    this.showSheet('添加到手机桌面', body, (root) => {
      root.querySelector('#guideClose').onclick = () => this.hideSheet();
    });
  }
};

/* 全局搜索实现 */
App.search = async (q) => {
  q = q.toLowerCase();
  const results = [];
  const push = (route, icon, type, title, sub) => {
    if (title.toLowerCase().includes(q) || (sub && sub.toLowerCase().includes(q))) {
      results.push({ route, icon, type, title, sub });
    }
  };

  const [studies, punchs, travels, interests, recipes, works, museums, pets] = await Promise.all([
    db.all(db.STORES.study),
    db.all(db.STORES.punch),
    db.all(db.STORES.travel),
    db.all(db.STORES.interest),
    db.all(db.STORES.recipe),
    db.all(db.STORES.work),
    db.all(db.STORES.museum),
    db.all(db.STORES.pet)
  ]);

  studies.forEach((s) => push('study', '📚', '学习', s.title, s.subject));
  punchs.forEach((p) => push('punch', '📍', '打卡', p.name, p.category));
  travels.forEach((t) => push('travel', '✈️', '旅游', t.name, t.location));
  interests.forEach((i) => push('interest', '💡', '兴趣', i.title, i.category));
  recipes.forEach((r) => push('recipe', '🍳', '下厨', r.name, r.cuisine));
  works.forEach((w) => push('work', '💼', '工作', w.title, w.project));
  museums.forEach((m) => push('museum', '🏺', '博物馆', m.name, m.location));
  pets.forEach((p) => push('pet', '🐾', '宠物', p.name, p.species));

  return results;
};

document.addEventListener('DOMContentLoaded', () => App.init());
window.App = App;
window.UI = UI;
