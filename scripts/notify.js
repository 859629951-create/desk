/* ============================================
   每日提醒推送 v1
   - 基于 Notification API
   - 支持学习打卡 / 记账 / 买菜 多类提醒
   - 使用 localStorage 存储提醒配置
   ============================================ */

const Notify = {
  /* 默认提醒配置 */
  defaults: [
    { key: 'study', label: '学习打卡提醒', icon: '📚', time: '08:30', enabled: false, text: '今天还没学习打卡哦，坚持就是胜利！' },
    { key: 'account', label: '记账提醒', icon: '💰', time: '21:00', enabled: false, text: '别忘了记录今天的收支～' },
    { key: 'recipe', label: '买菜提醒', icon: '🛒', time: '17:30', enabled: false, text: '下班顺路买点菜吧，看看待买清单～' },
    { key: 'review', label: '每日复盘', icon: '🌙', time: '22:00', enabled: false, text: '今天过得怎么样？花一分钟回顾一下吧。' }
  ],

  STORAGE_KEY: 'desk_notify_config',

  /* 读取配置 */
  getConfig() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 合并默认值（防止新增提醒项缺失）
        return this.defaults.map((d) => {
          const found = parsed.find((p) => p.key === d.key);
          return found ? { ...d, ...found } : d;
        });
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(this.defaults));
  },

  /* 保存配置 */
  saveConfig(config) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
  },

  /* 更新单个提醒 */
  updateItem(key, patch) {
    const config = this.getConfig();
    const item = config.find((c) => c.key === key);
    if (item) {
      Object.assign(item, patch);
      this.saveConfig(config);
    }
  },

  /* 请求通知权限 */
  async requestPermission() {
    if (!('Notification' in window)) {
      UI.toast('当前浏览器不支持通知');
      return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      UI.toast('通知权限已被拒绝，请在浏览器设置中开启');
      return false;
    }
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      UI.toast('通知权限已开启');
      return true;
    }
    UI.toast('未获得通知权限');
    return false;
  },

  /* 立即发送一条测试通知 */
  sendTest() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      UI.toast('请先开启通知权限');
      return;
    }
    new Notification('今日有雨 · 测试通知', {
      body: '如果你看到了这条消息，说明提醒功能工作正常 🎉',
      icon: 'icons/icon-192.png',
      tag: 'desk-test',
      vibrate: [100, 50, 100]
    });
  },

  /* 发送指定提醒 */
  send(key) {
    const config = this.getConfig();
    const item = config.find((c) => c.key === key);
    if (!item || !item.enabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const lastKey = `desk_notify_sent_${key}_${UI.todayStr()}`;
    if (localStorage.getItem(lastKey)) return; // 今日已发

    new Notification(`今日有雨 · ${item.label}`, {
      body: item.text,
      icon: 'icons/icon-192.png',
      tag: `desk-${key}`,
      vibrate: [100, 50, 100]
    });
    localStorage.setItem(lastKey, '1');
  },

  /* 检查并发起到期提醒（每次打开 App 时调用） */
  check() {
    const config = this.getConfig();
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    config.forEach((item) => {
      if (!item.enabled) return;
      // 当前时间已过设定时间，且今日未发送，则补发
      if (hhmm >= item.time) {
        this.send(item.key);
      }
    });
  },

  /* 启动定时检查（每分钟检查一次） */
  timer: null,
  start() {
    this.check();
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.check(), 60000);
  },

  /* 渲染设置面板 */
  renderSettings(container) {
    const config = this.getConfig();
    const hasPermission = 'Notification' in window && Notification.permission === 'granted';

    container.innerHTML = `
      <div class="card" style="padding:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="font-size:13px;color:var(--ink-soft);">
            ${hasPermission ? '✅ 通知权限已开启' : '⚠️ 需开启通知权限才能接收提醒'}
          </div>
          <button class="btn btn-outline" id="notifyPermBtn" style="font-size:12px;padding:6px 12px;">
            ${hasPermission ? '发送测试' : '开启权限'}
          </button>
        </div>
        <div id="notifyList" style="display:flex;flex-direction:column;gap:10px;"></div>
        <div style="font-size:11px;color:var(--ink-mute);margin-top:10px;line-height:1.5;">
          💡 提示：需保持「今日有雨」在后台运行或添加到桌面后才能收到提醒。浏览器关闭后定时提醒将暂停。
        </div>
      </div>
    `;

    const listEl = container.querySelector('#notifyList');
    listEl.innerHTML = config
      .map(
        (item) => `
      <div class="notify-item" data-key="${item.key}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--paper-light);border-radius:var(--radius-sm);border:1px solid var(--ink-line);">
        <span style="font-size:18px;">${item.icon}</span>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;color:var(--ink);">${item.label}</div>
          <input type="time" class="notify-time" data-key="${item.key}" value="${item.time}" style="font-size:11px;color:var(--ink-mute);margin-top:2px;background:none;border:none;padding:0;">
        </div>
        <label class="switch" style="position:relative;display:inline-block;width:40px;height:22px;flex-shrink:0;">
          <input type="checkbox" class="notify-toggle" data-key="${item.key}" ${item.enabled ? 'checked' : ''} style="opacity:0;width:0;height:0;">
          <span class="slider-track" style="position:absolute;cursor:pointer;inset:0;background:${item.enabled ? 'var(--forest)' : 'var(--ink-line)'};border-radius:999px;transition:0.3s;"></span>
          <span class="slider-thumb" style="position:absolute;height:16px;width:16px;left:${item.enabled ? '21px' : '3px'};bottom:3px;background:#fff;border-radius:50%;transition:0.3s;"></span>
        </label>
      </div>
    `
      )
      .join('');

    // 权限按钮
    container.querySelector('#notifyPermBtn').onclick = async () => {
      if (hasPermission) {
        this.sendTest();
      } else {
        await this.requestPermission();
        this.renderSettings(container);
      }
    };

    // 开关切换
    listEl.querySelectorAll('.notify-toggle').forEach((toggle) => {
      toggle.onchange = async () => {
        const key = toggle.dataset.key;
        const enabled = toggle.checked;
        if (enabled) {
          const ok = await this.requestPermission();
          if (!ok) {
            toggle.checked = false;
            return;
          }
        }
        this.updateItem(key, { enabled });
        this.renderSettings(container);
        UI.toast(enabled ? '已开启提醒' : '已关闭提醒');
      };
    });

    // 时间修改
    listEl.querySelectorAll('.notify-time').forEach((input) => {
      input.onchange = () => {
        const key = input.dataset.key;
        this.updateItem(key, { time: input.value });
        UI.toast('提醒时间已更新');
      };
    });
  }
};

/* App 启动时检查提醒 */
window.addEventListener('load', () => {
  setTimeout(() => Notify.start(), 2000);
});

window.Notify = Notify;
