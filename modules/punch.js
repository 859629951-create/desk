/* ============================================
   打卡清单模块 - 吃喝玩乐
   ============================================ */

const Punch = {
  categories: ['美食', '咖啡', '茶饮', '甜品', '景点', '展览', '书店', '酒吧', '其他'],

  async list() {
    App.setActiveNav('more');
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="fade-up">
        <div class="tabs" id="pTabs">
          <div class="tab active" data-filter="todo">想去</div>
          <div class="tab" data-filter="done">已去</div>
          <div class="tab" data-filter="all">全部</div>
        </div>
        <div id="punchList"></div>
      </div>
    `;
    App.setFab(() => this.edit());

    let filter = 'todo';
    const refresh = async () => {
      let all = await db.all(db.STORES.punch);
      all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (filter === 'todo') all = all.filter((p) => !p.done);
      if (filter === 'done') all = all.filter((p) => p.done);

      const el = document.getElementById('punchList');
      if (all.length === 0) {
        el.innerHTML = `<div class="empty"><div class="emoji">📍</div><div class="hint">点击 + 记录一个想去的地方</div></div>`;
        return;
      }
      el.innerHTML = all
        .map(
          (p) => `
        <div class="list-item" data-id="${p.id}">
          <div class="li-row">
            <button class="check ${p.done ? 'done' : ''}" data-act="toggle">✓</button>
            <div style="flex:1" data-act="open">
              <div class="li-title">${p.name}</div>
              ${p.location ? `<div class="li-sub">📍 ${p.location}</div>` : ''}
              <div class="li-tags">
                <span class="chip red">${p.category}</span>
                ${p.done ? '<span class="chip green">已打卡</span>' : ''}
                ${p.rating ? `<span class="chip yellow">${'★'.repeat(p.rating)}</span>` : ''}
              </div>
            </div>
            <button class="icon-btn" data-act="menu" style="width:32px;height:32px;font-size:14px">⋯</button>
          </div>
        </div>`
        )
        .join('');

      el.querySelectorAll('.list-item').forEach((item) => {
        const id = item.dataset.id;
        item.querySelector('[data-act="toggle"]').onclick = (e) => {
          e.stopPropagation();
          this.toggle(id);
        };
        item.querySelector('[data-act="open"]').onclick = () => this.detail(id);
        item.querySelector('[data-act="menu"]').onclick = (e) => {
          e.stopPropagation();
          this.showMenu(id);
        };
      });
    };

    document.querySelectorAll('#pTabs .tab').forEach((tab) => {
      tab.onclick = () => {
        document.querySelectorAll('#pTabs .tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        filter = tab.dataset.filter;
        refresh();
      };
    });
    refresh();
  },

  async toggle(id) {
    const p = await db.get(db.STORES.punch, id);
    p.done = !p.done;
    if (p.done) p.doneDate = UI.todayStr();
    await db.put(db.STORES.punch, p);
    this.list();
  },

  showMenu(id) {
    const body = `
      <div class="choice-grid">
        <button class="choice" data-act="edit">✏️ 编辑</button>
        <button class="choice" data-act="del" style="color:var(--cinnabar)">🗑 删除</button>
      </div>`;
    UI.showSheet('操作', body, (root) => {
      root.querySelector('[data-act="edit"]').onclick = () => {
        UI.hideSheet();
        this.edit(id);
      };
      root.querySelector('[data-act="del"]').onclick = async () => {
        UI.hideSheet();
        if (await UI.confirm('删除这条打卡记录？')) {
          await db.remove(db.STORES.punch, id);
          this.list();
        }
      };
    });
  },

  edit(id) {
    const isEdit = !!id;
    const body = `
      <div class="form-row">
        <label class="label">地点名称</label>
        <input class="field" id="f_name" placeholder="如：某家咖啡馆" maxlength="30">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">分类</label>
          <select class="field" id="f_cat">
            ${this.categories.map((c) => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="label">评分（1-5）</label>
          <input class="field" id="f_rate" type="number" min="1" max="5" placeholder="5">
        </div>
      </div>
      <div class="form-row">
        <label class="label">位置</label>
        <input class="field" id="f_loc" placeholder="如：朝阳区三里屯" maxlength="40">
      </div>
      <div class="form-row">
        <label class="label">备注</label>
        <textarea class="field" id="f_note" placeholder="推荐菜品、亮点..." maxlength="200"></textarea>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="f_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="f_save">${isEdit ? '保存' : '添加'}</button>
      </div>`;
    UI.showSheet(isEdit ? '编辑打卡' : '新建打卡', body, async (root) => {
      if (isEdit) {
        const p = await db.get(db.STORES.punch, id);
        root.querySelector('#f_name').value = p.name || '';
        root.querySelector('#f_cat').value = p.category || this.categories[0];
        root.querySelector('#f_rate').value = p.rating || '';
        root.querySelector('#f_loc').value = p.location || '';
        root.querySelector('#f_note').value = p.note || '';
      }
      root.querySelector('#f_save').onclick = async () => {
        const name = root.querySelector('#f_name').value.trim();
        if (!name) return UI.toast('请输入地点名称');
        const payload = {
          name,
          category: root.querySelector('#f_cat').value,
          rating: parseInt(root.querySelector('#f_rate').value) || 0,
          location: root.querySelector('#f_loc').value.trim(),
          note: root.querySelector('#f_note').value.trim()
        };
        if (isEdit) {
          const p = await db.get(db.STORES.punch, id);
          Object.assign(p, payload);
          await db.put(db.STORES.punch, p);
        } else {
          await db.add(db.STORES.punch, { ...payload, done: false });
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加');
        this.list();
      };
      if (isEdit) root.querySelector('#f_cancel').onclick = () => UI.hideSheet();
    });
  },

  async detail(id) {
    const p = await db.get(db.STORES.punch, id);
    if (!p) return router.navigate('punch');
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" data-act="back">‹ 返回</button>
        <div class="card" style="padding:16px;margin-bottom:14px;">
          <div class="tape red" style="top:-8px;left:20px;"></div>
          <h2 style="font-family:var(--font-display);font-size:22px;">${p.name}</h2>
          <div class="li-tags" style="margin-top:8px">
            <span class="chip red">${p.category}</span>
            ${p.rating ? `<span class="chip yellow">${'★'.repeat(p.rating)}</span>` : ''}
            ${p.done ? `<span class="chip green">✓ 已打卡 ${p.doneDate || ''}</span>` : '<span class="chip">未打卡</span>'}
          </div>
          ${p.location ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:10px;">📍 ${p.location}</div>` : ''}
          ${p.note ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:8px;line-height:1.6;">${p.note}</div>` : ''}
          <button class="btn ${p.done ? 'btn-ghost' : 'btn-primary'}" id="toggleBtn" style="width:100%;margin-top:14px;">
            ${p.done ? '↩️ 标记为未去' : '✓ 标记为已打卡'}
          </button>
        </div>
      </div>
    `;
    main.querySelector('[data-act="back"]').onclick = () => router.navigate('punch');
    main.querySelector('#toggleBtn').onclick = async () => {
      p.done = !p.done;
      if (p.done) p.doneDate = UI.todayStr();
      await db.put(db.STORES.punch, p);
      this.detail(id);
    };
  }
};

router.register('punch', () => Punch.list());
