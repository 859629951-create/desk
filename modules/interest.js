/* ============================================
   兴趣清单模块 - 想做的事
   ============================================ */

const Interest = {
  categories: ['技能学习', '运动健身', '艺术创作', '阅读观影', '社交活动', '生活体验', '其他'],

  async list() {
    App.setActiveNav('more');
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="fade-up">
        <div class="tabs" id="iTabs">
          <div class="tab active" data-filter="todo">想做</div>
          <div class="tab" data-filter="done">已做</div>
          <div class="tab" data-filter="all">全部</div>
        </div>
        <div id="interestList"></div>
      </div>
    `;
    App.setFab(() => this.edit());

    let filter = 'todo';
    const refresh = async () => {
      let all = await db.all(db.STORES.interest);
      all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      if (filter === 'todo') all = all.filter((i) => !i.done);
      if (filter === 'done') all = all.filter((i) => i.done);

      const el = document.getElementById('interestList');
      if (all.length === 0) {
        el.innerHTML = `<div class="empty"><div class="emoji">💡</div><div class="hint">点击 + 记录一件想做的事</div></div>`;
        return;
      }
      el.innerHTML = all
        .map(
          (i) => `
        <div class="list-item" data-id="${i.id}">
          <div class="li-row">
            <button class="check ${i.done ? 'done' : ''}" data-act="toggle">✓</button>
            <div style="flex:1">
              <div class="li-title" style="${i.done ? 'text-decoration:line-through;color:var(--ink-mute);' : ''}">${i.title}</div>
              ${i.note ? `<div class="li-sub">${i.note}</div>` : ''}
              <div class="li-tags">
                <span class="chip green">${i.category}</span>
                ${i.priority === '高' ? '<span class="chip red">🔥 重点</span>' : ''}
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
        item.querySelector('[data-act="menu"]').onclick = (e) => {
          e.stopPropagation();
          this.showMenu(id);
        };
      });
    };

    document.querySelectorAll('#iTabs .tab').forEach((tab) => {
      tab.onclick = () => {
        document.querySelectorAll('#iTabs .tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        filter = tab.dataset.filter;
        refresh();
      };
    });
    refresh();
  },

  async toggle(id) {
    const i = await db.get(db.STORES.interest, id);
    i.done = !i.done;
    if (i.done) i.doneDate = UI.todayStr();
    await db.put(db.STORES.interest, i);
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
        if (await UI.confirm('删除这条兴趣记录？')) {
          await db.remove(db.STORES.interest, id);
          this.list();
        }
      };
    });
  },

  edit(id) {
    const isEdit = !!id;
    const body = `
      <div class="form-row">
        <label class="label">想做的事</label>
        <input class="field" id="f_title" placeholder="如：学陶艺" maxlength="30">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">分类</label>
          <select class="field" id="f_cat">
            ${this.categories.map((c) => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="label">优先级</label>
          <select class="field" id="f_pri">
            <option value="低">💡 有空再做</option>
            <option value="中">📌 想尽快做</option>
            <option value="high">🔥 重点</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label class="label">备注</label>
        <textarea class="field" id="f_note" placeholder="为什么想做？怎么开始？" maxlength="200"></textarea>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="f_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="f_save">${isEdit ? '保存' : '添加'}</button>
      </div>`;
    UI.showSheet(isEdit ? '编辑兴趣' : '新建兴趣', body, async (root) => {
      if (isEdit) {
        const i = await db.get(db.STORES.interest, id);
        root.querySelector('#f_title').value = i.title || '';
        root.querySelector('#f_cat').value = i.category || this.categories[0];
        root.querySelector('#f_pri').value = i.priority || '低';
        root.querySelector('#f_note').value = i.note || '';
      }
      root.querySelector('#f_save').onclick = async () => {
        const title = root.querySelector('#f_title').value.trim();
        if (!title) return UI.toast('请输入内容');
        const payload = {
          title,
          category: root.querySelector('#f_cat').value,
          priority: root.querySelector('#f_pri').value,
          note: root.querySelector('#f_note').value.trim()
        };
        if (isEdit) {
          const i = await db.get(db.STORES.interest, id);
          Object.assign(i, payload);
          await db.put(db.STORES.interest, i);
        } else {
          await db.add(db.STORES.interest, { ...payload, done: false });
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加');
        this.list();
      };
      if (isEdit) root.querySelector('#f_cancel').onclick = () => UI.hideSheet();
    });
  }
};

router.register('interest', () => Interest.list());
