/* ============================================
   设置模块
   - AI 配置（在线/离线）
   - PWA 安装指引
   - 数据管理（导出/导入/清空）
   ============================================ */

router.register('settings', () => {
  App.setActiveNav('more');
  App.setFab(null);
  const main = document.getElementById('appMain');

  const cfg = AI.config;

  main.innerHTML = `
    <div class="fade-up">
      <div class="section-title">📱 添加到手机桌面</div>
      <div class="card" style="padding:14px;">
        <div style="font-size:13px;color:var(--ink-soft);line-height:1.6;margin-bottom:10px;">
          把「今日有雨」添加到手机桌面，像 App 一样全屏使用，离线也能访问。
        </div>
        <button class="btn btn-primary" id="installBtn" style="width:100%;">📱 添加到桌面</button>
      </div>

      <div class="section-title">🤖 AI 助手配置</div>
      <div class="card" style="padding:14px;">
        <div class="form-row">
          <label class="label">AI 模式</label>
          <div class="choice-grid">
            <button class="choice ${cfg.provider === 'local' ? 'active' : ''}" data-prov="local">📋 离线模式</button>
            <button class="choice ${cfg.provider === 'online' ? 'active' : ''}" data-prov="online">🌐 在线模式</button>
          </div>
          <div style="font-size:11px;color:var(--ink-mute);margin-top:6px;">
            离线模式：使用本地规则，无需联网，功能有限<br>
            在线模式：接入大模型 API，支持文物识别、菜谱提取、智能辅导
          </div>
        </div>
        <div id="onlineConfig" style="${cfg.provider === 'online' ? '' : 'display:none;'}">
          <div class="form-row">
            <label class="label">服务商预设</label>
            <div class="choice-grid">
              <button class="choice ${cfg.preset === 'deepseek' ? 'active' : ''}" data-preset="deepseek">🔮 DeepSeek</button>
            </div>
            <div style="font-size:11px;color:var(--ink-mute);margin-top:6px;">
              已预置 DeepSeek 配置，开箱即用。
            </div>
          </div>
          <div class="form-row">
            <label class="label">API Key</label>
            <input class="field" id="ai_key" type="password" value="${cfg.apiKey}" placeholder="输入 API Key">
          </div>
          <div class="form-row">
            <label class="label">模型名称</label>
            <input class="field" id="ai_model" value="${cfg.model || 'deepseek-chat'}" placeholder="deepseek-chat">
          </div>
          <div class="form-row">
            <label class="label">API 地址（可选）</label>
            <input class="field" id="ai_ep" value="${cfg.endpoint}" placeholder="https://api.deepseek.com/v1/chat/completions">
          </div>
          <button class="btn btn-jade" id="ai_save" style="width:100%;">保存 AI 配置</button>
          <button class="btn btn-ghost" id="ai_test" style="width:100%;margin-top:8px;">🧪 测试连接</button>
          <div id="ai_test_result" style="font-size:12px;margin-top:8px;"></div>
        </div>
      </div>

      <div class="section-title">🧭 导航栏管理</div>
      <div class="card" style="padding:12px;margin-bottom:16px;">
        <div style="font-size:11px;color:var(--ink-mute);margin-bottom:10px;">拖拽调整顺序，开关控制显示</div>
        <div id="navManager"></div>
      </div>

      <div class="section-title">🔔 每日提醒</div>
      <div id="notifySettings"></div>

      <div class="section-title">💾 数据管理</div>
      <div class="card" style="padding:14px;">
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button class="btn btn-ghost" id="exportBtn" style="width:100%;">📤 导出全部数据</button>
          <button class="btn btn-ghost" id="importBtn" style="width:100%;">📥 导入数据</button>
          <button class="btn btn-ghost" id="clearBtn" style="width:100%;color:var(--cinnabar);">🗑 清空所有数据</button>
        </div>
        <div style="font-size:11px;color:var(--ink-mute);margin-top:10px;line-height:1.5;">
          数据存储在你的设备本地，不会上传服务器。建议定期导出备份。
        </div>
      </div>

      <div class="section-title">ℹ️ 关于</div>
      <div class="card" style="padding:14px;text-align:center;">
        <div style="font-family:var(--font-display);font-size:20px;color:var(--forest);">今日有雨</div>
        <div style="font-size:12px;color:var(--ink-mute);margin-top:4px;">v1.0 · 一个温暖的生活记录工作台</div>
        <div style="font-family:var(--font-hand);font-size:13px;color:var(--ink-soft);margin-top:10px;">"记录每一个想被珍藏的日子"</div>
      </div>

      <div style="height:30px"></div>
    </div>
  `;

  main.querySelector('#installBtn').onclick = () => {
    if (App.deferredPrompt) {
      App.deferredPrompt.prompt();
    } else {
      UI.showInstallGuide();
    }
  };

  // 渲染提醒设置
  Notify.renderSettings(main.querySelector('#notifySettings'));

  // 渲染导航栏管理
  (function renderNavManager() {
    const allNavItems = App.navItems;
    const config = localStorage.getItem('navConfig');
    let order = null, hidden = [];
    if (config) {
      try {
        const c = JSON.parse(config);
        order = c.order;
        hidden = c.hidden || [];
      } catch(e) {}
    }

    const sorted = order
      ? [...allNavItems].sort((a, b) => {
          const ai = order.indexOf(a.key);
          const bi = order.indexOf(b.key);
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        })
      : [...allNavItems];

    const navManagerEl = document.getElementById('navManager');
    if (!navManagerEl) return;

    function renderList(items) {
      navManagerEl.innerHTML = items.map((item) => {
        const isHome = item.key === 'home';
        const isHidden = hidden.includes(item.key);
        return `
          <div class="sc-nav-item ${isHome ? 'fixed' : ''}" draggable="true" data-key="${item.key}" style="display:flex;align-items:center;gap:10px;padding:10px 8px;border-radius:8px;margin-bottom:4px;background:var(--paper-card);border:1px solid var(--ink-line);">
            <span style="cursor:grab;font-size:16px;opacity:0.5;">⠿</span>
            <span style="font-size:16px;">${item.icon}</span>
            <span style="flex:1;font-size:14px;">${item.label}</span>
            <label class="toggle-switch ${isHidden ? '' : 'active'}" style="${isHome ? 'opacity:0.4;pointer-events:none;' : ''}">
              <input type="checkbox" class="nav-toggle" data-key="${item.key}" ${isHidden ? '' : 'checked'}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        `;
      }).join('');
    }

    renderList(sorted);

    // 拖拽排序
    let dragItem = null;
    navManagerEl.querySelectorAll('.sc-nav-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        dragItem = item;
        item.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', () => {
        if (dragItem) dragItem.style.opacity = '1';
        dragItem = null;
        const newOrder = [...navManagerEl.querySelectorAll('.sc-nav-item')].map(el => el.dataset.key);
        saveNavConfig(newOrder, hidden);
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (dragItem && dragItem !== item) {
          const rect = item.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            navManagerEl.insertBefore(dragItem, item);
          } else {
            navManagerEl.insertBefore(dragItem, item.nextSibling);
          }
        }
      });
    });

    // 显示/隐藏开关
    navManagerEl.querySelectorAll('.nav-toggle').forEach(toggle => {
      toggle.addEventListener('change', () => {
        const key = toggle.dataset.key;
        if (toggle.checked) {
          hidden = hidden.filter(k => k !== key);
        } else {
          if (!hidden.includes(key)) hidden.push(key);
        }
        const newOrder = [...navManagerEl.querySelectorAll('.sc-nav-item')].map(el => el.dataset.key);
        saveNavConfig(newOrder, hidden);
      });
    });

    function saveNavConfig(order, hidden) {
      localStorage.setItem('navConfig', JSON.stringify({ order, hidden }));
      if (App.renderNav) App.renderNav();
    }
  })();

  main.querySelectorAll('[data-prov]').forEach((b) => {
    b.onclick = () => {
      main.querySelectorAll('[data-prov]').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      const prov = b.dataset.prov;
      AI.saveConfig({ provider: prov });
      main.querySelector('#onlineConfig').style.display = prov === 'online' ? '' : 'none';
      UI.toast(prov === 'online' ? '已切换为在线模式' : '已切换为离线模式');
    };
  });

  // 服务商预设切换
  main.querySelectorAll('[data-preset]').forEach((b) => {
    b.onclick = () => {
      main.querySelectorAll('[data-preset]').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      const presetKey = b.dataset.preset;
      AI.applyPreset(presetKey);
      const preset = AI.presets[presetKey];
      if (preset) {
        main.querySelector('#ai_model').value = preset.model;
        main.querySelector('#ai_ep').value = preset.endpoint;
      }
      UI.toast(`已切换为 ${AI.presets[presetKey]?.label || presetKey} 预设`);
    };
  });

  main.querySelector('#ai_save').onclick = () => {
    AI.saveConfig({
      apiKey: main.querySelector('#ai_key').value.trim(),
      model: main.querySelector('#ai_model').value.trim(),
      endpoint: main.querySelector('#ai_ep').value.trim()
    });
    UI.toast('AI 配置已保存');
  };

  // 测试连接
  main.querySelector('#ai_test').onclick = async () => {
    const resultEl = main.querySelector('#ai_test_result');
    // 先保存当前输入的配置再测试
    AI.saveConfig({
      apiKey: main.querySelector('#ai_key').value.trim(),
      model: main.querySelector('#ai_model').value.trim(),
      endpoint: main.querySelector('#ai_ep').value.trim()
    });
    resultEl.innerHTML = '<span style="color:var(--ink-mute)">⏳ 正在测试连接...</span>';
    try {
      const reply = await AI.generate('请回复"连接成功"四个字。', '');
      resultEl.innerHTML = `<span style="color:var(--forest)">✓ 连接成功</span><br><span style="color:var(--ink-soft)">${reply.slice(0, 80)}</span>`;
    } catch (e) {
      resultEl.innerHTML = `<span style="color:var(--cinnabar)">✗ 连接失败</span><br><span style="color:var(--ink-soft)">${e.message.slice(0, 120)}</span>`;
    }
  };

  main.querySelector('#exportBtn').onclick = async () => {
    const data = {};
    for (const k in db.STORES) {
      data[k] = await db.all(db.STORES[k]);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `今日有雨_备份_${UI.todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    UI.toast('已导出备份文件');
  };

  main.querySelector('#importBtn').onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const f = input.files[0];
      if (!f) return;
      try {
        const text = await f.text();
        const data = JSON.parse(text);
        if (await UI.confirm('导入将覆盖现有数据，确定继续？')) {
          for (const k in db.STORES) {
            await db.clear(db.STORES[k]);
            if (data[k]) {
              for (const item of data[k]) await db.put(db.STORES[k], item);
            }
          }
          UI.toast('导入成功');
          router.navigate('home');
        }
      } catch (e) {
        UI.toast('导入失败：文件格式错误');
      }
    };
    input.click();
  };

  main.querySelector('#clearBtn').onclick = async () => {
    if (await UI.confirm('确定清空所有数据？此操作不可恢复！')) {
      if (await UI.confirm('再次确认：所有学习、菜谱、文物、记账等数据将全部删除！')) {
        for (const k in db.STORES) await db.clear(db.STORES[k]);
        UI.toast('已清空所有数据');
        router.navigate('home');
      }
    }
  };
});
