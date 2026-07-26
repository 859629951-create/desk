/* ============================================
   工作清单模块
   - 工作任务管理
   - 进度跟踪
   ============================================ */

const Work = {
  async list() {
    App.setActiveNav('more');
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="fade-up">
        <div class="stat-row" id="wStats"></div>
        <div class="tabs" id="wTabs">
          <div class="tab active" data-filter="doing">进行中</div>
          <div class="tab" data-filter="done">已完成</div>
          <div class="tab" data-filter="all">全部</div>
        </div>
        <div id="workList"></div>
      </div>
    `;
    App.setFab(() => this.edit());

    let filter = 'doing';
    const refresh = async () => {
      let all = await db.all(db.STORES.work);
      all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (filter === 'doing') all = all.filter((w) => (w.progress || 0) < 100);
      if (filter === 'done') all = all.filter((w) => (w.progress || 0) >= 100);

      // 统计
      const total = all.length;
      const avgProgress = total ? Math.round(all.reduce((a, w) => a + (w.progress || 0), 0) / total) : 0;
      const urgent = all.filter((w) => w.priority === 'high' && (w.progress || 0) < 100).length;
      document.getElementById('wStats').innerHTML = `
        <div class="stat-box"><div class="sb-num">${total}</div><div class="sb-label">任务数</div></div>
        <div class="stat-box"><div class="sb-num">${avgProgress}%</div><div class="sb-label">平均进度</div></div>
        <div class="stat-box"><div class="sb-num" style="color:var(--ochre)">${urgent}</div><div class="sb-label">紧急</div></div>
      `;

      const el = document.getElementById('workList');
      if (all.length === 0) {
        el.innerHTML = `<div class="empty"><div class="emoji">💼</div><div class="hint">点击 + 添加一项工作</div></div>`;
        return;
      }
      el.innerHTML = all
        .map(
          (w) => `
        <div class="list-item" data-id="${w.id}">
          <div class="li-row">
            <div style="flex:1" data-act="open">
              <div class="li-title">${w.title}</div>
              ${w.project ? `<div class="li-sub">${w.project}</div>` : ''}
              <div class="li-tags">
                ${w.priority === 'high' ? '<span class="chip red">🔥 紧急</span>' : ''}
                ${w.priority === 'mid' ? '<span class="chip yellow">📌 重要</span>' : ''}
                ${w.deadline ? `<span class="chip blue">📅 ${w.deadline}</span>` : ''}
                ${(w.progress || 0) >= 100 ? '<span class="chip green">✓ 完成</span>' : ''}
              </div>
              <div class="progress"><div class="progress-bar" style="width:${w.progress || 0}%"></div></div>
              <div style="font-size:11px;color:var(--ink-mute);margin-top:3px;">进度：${w.progress || 0}%</div>
            </div>
            <button class="icon-btn" data-act="menu" style="width:32px;height:32px;font-size:14px">⋯</button>
          </div>
        </div>`
        )
        .join('');

      el.querySelectorAll('.list-item').forEach((item) => {
        const id = item.dataset.id;
        item.querySelector('[data-act="open"]').onclick = () => this.detail(id);
        item.querySelector('[data-act="menu"]').onclick = (e) => {
          e.stopPropagation();
          this.showMenu(id);
        };
      });
    };

    document.querySelectorAll('#wTabs .tab').forEach((tab) => {
      tab.onclick = () => {
        document.querySelectorAll('#wTabs .tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        filter = tab.dataset.filter;
        refresh();
      };
    });
    refresh();
  },

  showMenu(id) {
    const body = `
      <div class="choice-grid">
        <button class="choice" data-act="edit">✏️ 编辑</button>
        <button class="choice" data-act="progress">📊 更新进度</button>
        <button class="choice" data-act="del" style="color:var(--cinnabar)">🗑 删除</button>
      </div>`;
    UI.showSheet('操作', body, (root) => {
      root.querySelector('[data-act="edit"]').onclick = () => {
        UI.hideSheet();
        this.edit(id);
      };
      root.querySelector('[data-act="progress"]').onclick = () => {
        UI.hideSheet();
        this.updateProgress(id);
      };
      root.querySelector('[data-act="del"]').onclick = async () => {
        UI.hideSheet();
        if (await UI.confirm('删除这项工作？')) {
          await db.remove(db.STORES.work, id);
          this.list();
        }
      };
    });
  },

  edit(id) {
    const isEdit = !!id;
    const body = `
      <div class="form-row">
        <label class="label">工作标题</label>
        <input class="field" id="f_title" placeholder="如：季度报告" maxlength="40">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">所属项目</label>
          <input class="field" id="f_proj" placeholder="如：Q3 项目" maxlength="20">
        </div>
        <div>
          <label class="label">截止日期</label>
          <input class="field" id="f_dl" type="date">
        </div>
      </div>
      <div class="form-row">
        <label class="label">优先级</label>
        <select class="field" id="f_pri">
          <option value="low">💡 普通</option>
          <option value="mid">📌 重要</option>
          <option value="high">🔥 紧急</option>
        </select>
      </div>
      <div class="form-row">
        <label class="label">备注</label>
        <textarea class="field" id="f_note" placeholder="工作内容、要求..." maxlength="200"></textarea>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="f_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="f_save">${isEdit ? '保存' : '添加'}</button>
      </div>`;
    UI.showSheet(isEdit ? '编辑工作' : '新建工作', body, (root) => {
      let loaded = false;
      const self = this;

      // 先同步绑定事件
      root.querySelector('#f_save').onclick = async () => {
        if (isEdit && !loaded) {
          UI.toast('数据加载中，请稍候');
          return;
        }
        const title = root.querySelector('#f_title').value.trim();
        if (!title) return UI.toast('请输入工作标题');
        const payload = {
          title,
          project: root.querySelector('#f_proj').value.trim(),
          deadline: root.querySelector('#f_dl').value,
          priority: root.querySelector('#f_pri').value,
          note: root.querySelector('#f_note').value.trim()
        };
        if (isEdit) {
          const w = await db.get(db.STORES.work, id);
          Object.assign(w, payload);
          await db.put(db.STORES.work, w);
        } else {
          await db.add(db.STORES.work, { ...payload, progress: 0 });
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加');
        self.list();
      };
      const cancelBtn = root.querySelector('#f_cancel');
      if (cancelBtn) cancelBtn.onclick = () => UI.hideSheet();

      // 再异步加载编辑数据
      (async () => {
        if (isEdit) {
          try {
            const w = await db.get(db.STORES.work, id);
            if (!w) {
              UI.toast('未找到该工作');
              UI.hideSheet();
              return;
            }
            root.querySelector('#f_title').value = w.title || '';
            root.querySelector('#f_proj').value = w.project || '';
            root.querySelector('#f_dl').value = w.deadline || '';
            root.querySelector('#f_pri').value = w.priority || 'low';
            root.querySelector('#f_note').value = w.note || '';
            loaded = true;
          } catch (err) {
            console.error('加载工作记录失败', err);
            UI.toast('加载失败：' + (err && err.message ? err.message : err));
            UI.hideSheet();
          }
        } else {
          loaded = true;
        }
      })();
    });
  },

  async detail(id) {
    const w = await db.get(db.STORES.work, id);
    if (!w) return router.navigate('work');
    App.setFab(() => this.updateProgress(id));
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" data-act="back">‹ 返回</button>
        <div class="card" style="padding:16px;margin-bottom:14px;">
          <div class="tape blue" style="top:-8px;left:20px;"></div>
          <h2 style="font-family:var(--font-display);font-size:22px;">${w.title}</h2>
          ${w.project ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">📂 ${w.project}</div>` : ''}
          <div class="li-tags" style="margin-top:8px">
            ${w.priority === 'high' ? '<span class="chip red">🔥 紧急</span>' : ''}
            ${w.priority === 'mid' ? '<span class="chip yellow">📌 重要</span>' : ''}
            ${w.deadline ? `<span class="chip blue">📅 ${w.deadline}</span>` : ''}
          </div>
          <div style="margin-top:14px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-mute);margin-bottom:6px;">
              <span>完成进度</span><span>${w.progress || 0}%</span>
            </div>
            <div class="progress" style="height:10px;"><div class="progress-bar" style="width:${w.progress || 0}%"></div></div>
          </div>
          ${w.note ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:14px;line-height:1.6;">${w.note}</div>` : ''}
          <button class="btn btn-primary" id="progBtn" style="width:100%;margin-top:14px;">📊 更新进度</button>
        </div>
      </div>
    `;
    main.querySelector('[data-act="back"]').onclick = () => router.navigate('work');
    main.querySelector('#progBtn').onclick = () => this.updateProgress(id);
  },

  async updateProgress(id) {
    const w = await db.get(db.STORES.work, id);
    const body = `
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:13px;color:var(--ink-soft);">${w.title}</div>
        <div style="font-family:var(--font-num);font-size:48px;color:var(--cinnabar);line-height:1;margin-top:8px;" id="progVal">${w.progress || 0}%</div>
      </div>
      <div class="form-row">
        <input class="field" id="f_prog" type="range" min="0" max="100" step="5" value="${w.progress || 0}" style="padding:0;">
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:14px;">
        ${[0, 25, 50, 75, 100].map((p) => `<button class="choice" data-p="${p}">${p}%</button>`).join('')}
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="p_cancel">取消</button>
        <button class="btn btn-primary" id="p_save">保存</button>
      </div>`;
    UI.showSheet('更新进度', body, (root) => {
      const slider = root.querySelector('#f_prog');
      const val = root.querySelector('#progVal');
      slider.oninput = () => (val.textContent = slider.value + '%');
      root.querySelectorAll('[data-p]').forEach((b) => {
        b.onclick = () => {
          slider.value = b.dataset.p;
          val.textContent = b.dataset.p + '%';
        };
      });
      root.querySelector('#p_save').onclick = async () => {
        w.progress = parseInt(slider.value);
        await db.put(db.STORES.work, w);
        UI.hideSheet();
        UI.toast('进度已更新');
        this.detail(id);
      };
      root.querySelector('#p_cancel').onclick = () => UI.hideSheet();
    });
  }
};

router.register('work', () => Work.list());
