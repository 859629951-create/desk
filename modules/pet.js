/* ============================================
   宠物模块 v1
   - 多宠物档案（基础信息 / 头像）
   - 体重记录（带时间 + 趋势图）
   - 健康记录（疫苗 / 驱虫 / 洗澡 / 异常症状 / 手术 / 就医）
   - 喂养记录
   - 阶段照片（按成长阶段分类）
   - 宠物花销
   - 健康提醒（疫苗到期 / 驱虫周期）
   ============================================ */

const Pet = {
  /* 健康记录类型配置 */
  healthTypes: {
    vaccine:  { icon: '💉', label: '疫苗',     color: 'forest' },
    deworm:   { icon: '🛡️', label: '驱虫',     color: 'blue' },
    bath:     { icon: '🛁', label: '洗澡',     color: 'gold' },
    symptom:  { icon: '⚠️', label: '异常症状', color: 'red' },
    surgery:  { icon: '🏥', label: '手术',     color: 'red' },
    vet:      { icon: '🩺', label: '就医',     color: 'rust' },
    feeding:  { icon: '🍖', label: '喂养',     color: 'gold' }
  },

  /* 成长阶段 */
  stages: [
    { key: 'baby',      label: '幼年', icon: '🐣' },
    { key: 'juvenile',  label: '少年', icon: '🐥' },
    { key: 'adult',     label: '成年', icon: '🐓' },
    { key: 'senior',    label: '老年', icon: '🐾' }
  ],

  /* ===== 宠物列表页 ===== */
  async list() {
    App.setActiveNav('more');
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="fade-up">
        <div class="module-head">
          <div>
            <div class="mh-title"><span class="emoji">🐾</span> 宠物记录</div>
            <div class="mh-sub">健康与成长 · 陪伴每一天</div>
          </div>
        </div>
        <div id="petList"></div>
      </div>
    `;
    App.setFab(() => this.edit());

    const pets = await db.all(db.STORES.pet);
    pets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const el = document.getElementById('petList');

    if (pets.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">🐾</div><div class="hint">点击 + 添加你的第一只宠物</div></div>`;
      return;
    }

    // 并行加载每只宠物的最新体重和健康提醒
    const petCards = await Promise.all(pets.map(async (p) => {
      const weights = await db.all(db.STORES.petWeight);
      const petWeights = weights.filter((w) => w.petId === p.id).sort((a, b) => (a.date || 0) - (b.date || 0));
      const latestWeight = petWeights[petWeights.length - 1];
      const healths = await db.all(db.STORES.petHealth);
      const petHealths = healths.filter((h) => h.petId === p.id);
      const reminders = this.checkReminders(p, petHealths);
      const age = this.calcAge(p.birthday);

      return { pet: p, latestWeight, reminders, age, weightCount: petWeights.length, healthCount: petHealths.length };
    }));

    el.innerHTML = petCards
      .map(
        ({ pet: p, latestWeight, reminders, age, weightCount, healthCount }) => `
      <div class="list-item pet-card" data-id="${p.id}">
        <div class="tape ${p.gender === 'female' ? 'rust' : 'green'}" style="top:-8px;left:20px;"></div>
        <div class="pet-card-head">
          <div class="pet-avatar" data-act="open">
            ${p.photo ? `<img src="${p.photo}" alt="${p.name}">` : `<span class="pet-avatar-placeholder">${p.speciesIcon || '🐾'}</span>`}
          </div>
          <div style="flex:1;min-width:0" data-act="open">
            <div class="li-title">${p.name} ${p.gender === 'female' ? '♀' : p.gender === 'male' ? '♂' : ''}</div>
            <div class="li-sub">${p.species || '宠物'}${p.breed ? ' · ' + p.breed : ''}${age ? ' · ' + age : ''}</div>
            <div class="li-tags">
              ${latestWeight ? `<span class="chip green">⚖️ ${latestWeight.weight}kg</span>` : ''}
              ${weightCount ? `<span class="chip">📊 ${weightCount} 次记录</span>` : ''}
              ${healthCount ? `<span class="chip blue">💉 ${healthCount} 条健康</span>` : ''}
              ${reminders.length > 0 ? `<span class="chip red">⏰ ${reminders.length} 提醒</span>` : ''}
            </div>
          </div>
          <button class="icon-btn" data-act="menu" style="width:32px;height:32px;font-size:14px">⋯</button>
        </div>
      </div>`
      )
      .join('');

    el.querySelectorAll('.pet-card').forEach((card) => {
      const id = card.dataset.id;
      card.querySelector('[data-act="open"]').onclick = () => this.detail(id);
      const openArea = card.querySelectorAll('[data-act="open"]');
      if (openArea.length > 1) openArea[1].onclick = () => this.detail(id);
      card.querySelector('[data-act="menu"]').onclick = (e) => {
        e.stopPropagation();
        this.showMenu(id);
      };
    });
  },

  /* ===== 操作菜单 ===== */
  showMenu(id) {
    const body = `
      <div class="choice-grid">
        <button class="choice" data-act="edit">✏️ 编辑档案</button>
        <button class="choice" data-act="del" style="color:var(--cinnabar)">🗑 删除宠物</button>
      </div>`;
    UI.showSheet('操作', body, (root) => {
      root.querySelector('[data-act="edit"]').onclick = () => {
        UI.hideSheet();
        this.edit(id);
      };
      root.querySelector('[data-act="del"]').onclick = async () => {
        UI.hideSheet();
        if (await UI.confirm('删除这只宠物？所有相关记录将一并删除，此操作不可撤销。')) {
          await this.deleteAll(id);
          UI.toast('已删除');
          this.list();
        }
      };
    });
  },

  /* 删除宠物及其所有关联数据 */
  async deleteAll(petId) {
    const [weights, healths, medias, expenses] = await Promise.all([
      db.all(db.STORES.petWeight),
      db.all(db.STORES.petHealth),
      db.all(db.STORES.petMedia),
      db.all(db.STORES.petExpense)
    ]);
    for (const w of weights.filter((w) => w.petId === petId)) await db.remove(db.STORES.petWeight, w.id);
    for (const h of healths.filter((h) => h.petId === petId)) await db.remove(db.STORES.petHealth, h.id);
    for (const m of medias.filter((m) => m.petId === petId)) await db.remove(db.STORES.petMedia, m.id);
    for (const e of expenses.filter((e) => e.petId === petId)) await db.remove(db.STORES.petExpense, e.id);
    await db.remove(db.STORES.pet, petId);
  },

  /* ===== 添加/编辑宠物档案 ===== */
  edit(id) {
    const isEdit = !!id;
    const today = UI.todayStr();
    const body = `
      <div class="form-row">
        <label class="label">宠物头像</label>
        <div class="pet-avatar-picker" id="avatarPicker">
          <div class="pet-avatar-preview" id="avatarPreview">
            <span class="pet-avatar-placeholder">🐾</span>
          </div>
          <button type="button" class="btn btn-outline" id="avatarBtn" style="font-size:12px;padding:6px 14px;">📷 选择头像</button>
        </div>
      </div>
      <div class="form-row">
        <label class="label">名字</label>
        <input class="field" id="f_name" placeholder="如：小橘" maxlength="20">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">种类</label>
          <select class="field" id="f_species">
            <option value="">请选择</option>
            <option value="猫">🐱 猫</option>
            <option value="狗">🐶 狗</option>
            <option value="兔子">🐰 兔子</option>
            <option value="仓鼠">🐹 仓鼠</option>
            <option value="鸟">🐦 鸟</option>
            <option value="鱼">🐟 鱼</option>
            <option value="龟">🐢 龟</option>
            <option value="其他">🐾 其他</option>
          </select>
        </div>
        <div>
          <label class="label">品种</label>
          <input class="field" id="f_breed" placeholder="如：橘猫" maxlength="20">
        </div>
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">性别</label>
          <select class="field" id="f_gender">
            <option value="">未知</option>
            <option value="male">♂ 公</option>
            <option value="female">♀ 母</option>
          </select>
        </div>
        <div>
          <label class="label">生日</label>
          <input class="field" id="f_birthday" type="date" value="${today}">
        </div>
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">绝育状态</label>
          <select class="field" id="f_neutered">
            <option value="no">未绝育</option>
            <option value="yes">已绝育</option>
          </select>
        </div>
        <div>
          <label class="label">体长(可选)</label>
          <input class="field" id="f_length" type="number" step="0.1" placeholder="cm" min="0">
        </div>
      </div>
      <div class="form-row">
        <label class="label">备注</label>
        <textarea class="field" id="f_note" placeholder="性格、习惯、特殊说明..." maxlength="300"></textarea>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="f_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="f_save">${isEdit ? '保存' : '添加'}</button>
      </div>`;
    UI.showSheet(isEdit ? '编辑宠物档案' : '新建宠物档案', body, (root) => {
      let avatar = null;
      let loaded = false;
      const self = this;

      /* ===== 1. 同步绑定所有事件 ===== */
      // 头像选择
      root.querySelector('#avatarBtn').onclick = async () => {
        const img = await UI.pickImage();
        if (img) {
          avatar = img;
          root.querySelector('#avatarPreview').innerHTML = `<img src="${img}" alt="头像">`;
        }
      };

      // 种类变化时更新占位图标
      root.querySelector('#f_species').onchange = (e) => {
        if (!avatar) {
          const icons = { '猫': '🐱', '狗': '🐶', '兔子': '🐰', '仓鼠': '🐹', '鸟': '🐦', '鱼': '🐟', '龟': '🐢', '其他': '🐾' };
          root.querySelector('#avatarPreview').innerHTML = `<span class="pet-avatar-placeholder">${icons[e.target.value] || '🐾'}</span>`;
        }
      };

      // 保存
      root.querySelector('#f_save').onclick = async () => {
        if (isEdit && !loaded) {
          UI.toast('数据加载中，请稍候');
          return;
        }
        const name = root.querySelector('#f_name').value.trim();
        if (!name) return UI.toast('请输入宠物名字');
        const species = root.querySelector('#f_species').value;
        const speciesIcons = { '猫': '🐱', '狗': '🐶', '兔子': '🐰', '仓鼠': '🐹', '鸟': '🐦', '鱼': '🐟', '龟': '🐢', '其他': '🐾' };
        const payload = {
          name,
          species,
          speciesIcon: speciesIcons[species] || '🐾',
          breed: root.querySelector('#f_breed').value.trim(),
          gender: root.querySelector('#f_gender').value,
          birthday: root.querySelector('#f_birthday').value,
          neutered: root.querySelector('#f_neutered').value,
          length: parseFloat(root.querySelector('#f_length').value) || null,
          note: root.querySelector('#f_note').value.trim(),
          photo: avatar
        };
        if (isEdit) {
          const p = await db.get(db.STORES.pet, id);
          Object.assign(p, payload);
          await db.put(db.STORES.pet, p);
        } else {
          await db.add(db.STORES.pet, payload);
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加');
        self.list();
      };

      // 取消
      const cancelBtn = root.querySelector('#f_cancel');
      if (cancelBtn) cancelBtn.onclick = () => UI.hideSheet();

      /* ===== 2. 异步加载编辑数据 ===== */
      (async () => {
        if (isEdit) {
          try {
            const p = await db.get(db.STORES.pet, id);
            if (!p) {
              UI.toast('未找到该宠物');
              UI.hideSheet();
              return;
            }
            root.querySelector('#f_name').value = p.name || '';
            root.querySelector('#f_species').value = p.species || '';
            root.querySelector('#f_breed').value = p.breed || '';
            root.querySelector('#f_gender').value = p.gender || '';
            root.querySelector('#f_birthday').value = p.birthday || today;
            root.querySelector('#f_neutered').value = p.neutered || 'no';
            root.querySelector('#f_length').value = p.length || '';
            root.querySelector('#f_note').value = p.note || '';
            if (p.photo) {
              avatar = p.photo;
              root.querySelector('#avatarPreview').innerHTML = `<img src="${p.photo}" alt="头像">`;
            }
            loaded = true;
          } catch (err) {
            console.error('加载宠物档案失败', err);
            UI.toast('加载失败');
            UI.hideSheet();
          }
        } else {
          loaded = true;
        }
      })();
    });
  },

  /* ===== 宠物详情页 ===== */
  async detail(id) {
    const p = await db.get(db.STORES.pet, id);
    if (!p) return router.navigate('pet');
    App.setActiveNav('more');
    App.setFab(() => this.showAddMenu(id));
    const main = document.getElementById('appMain');
    const age = this.calcAge(p.birthday);
    const ageDays = p.birthday ? Math.floor((Date.now() - new Date(p.birthday).getTime()) / 86400000) : null;

    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" data-act="back">‹ 返回</button>

        <!-- 宠物档案卡 -->
        <div class="card pet-profile-card" style="padding:16px;margin-bottom:14px;">
          <div class="tape ${p.gender === 'female' ? 'rust' : 'green'}" style="top:-8px;left:20px;"></div>
          <div class="pet-profile-head">
            <div class="pet-avatar pet-avatar-lg" id="petAvatar">
              ${p.photo ? `<img src="${p.photo}" alt="${p.name}">` : `<span class="pet-avatar-placeholder">${p.speciesIcon || '🐾'}</span>`}
            </div>
            <div style="flex:1;min-width:0;">
              <h2 style="font-family:var(--font-display);font-size:22px;">${p.name}</h2>
              <div class="li-tags" style="margin-top:6px;">
                ${p.species ? `<span class="chip">${p.speciesIcon || '🐾'} ${p.species}</span>` : ''}
                ${p.breed ? `<span class="chip">${p.breed}</span>` : ''}
                ${p.gender === 'male' ? '<span class="chip blue">♂ 公</span>' : p.gender === 'female' ? '<span class="chip red">♀ 母</span>' : ''}
                ${p.neutered === 'yes' ? '<span class="chip green">✓ 已绝育</span>' : ''}
              </div>
            </div>
          </div>
          <div class="pet-profile-info">
            ${age ? `<div class="ppi-item"><span class="ppi-label">年龄</span><span class="ppi-value">${age}</span></div>` : ''}
            ${ageDays !== null ? `<div class="ppi-item"><span class="ppi-label">天数</span><span class="ppi-value">${ageDays} 天</span></div>` : ''}
            ${p.birthday ? `<div class="ppi-item"><span class="ppi-label">生日</span><span class="ppi-value">${p.birthday}</span></div>` : ''}
            ${p.length ? `<div class="ppi-item"><span class="ppi-label">体长</span><span class="ppi-value">${p.length} cm</span></div>` : ''}
          </div>
          ${p.note ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:10px;line-height:1.6;padding:8px 12px;background:var(--paper-deep);border-radius:8px;">📝 ${p.note}</div>` : ''}
          <button class="btn btn-ghost" id="editPetBtn" style="width:100%;margin-top:12px;font-size:13px;">✏️ 编辑档案</button>
        </div>

        <!-- Tab 切换 -->
        <div class="tabs tabs-scroll" id="petTabs">
          <div class="tab active" data-tab="weight">⚖️ 体重</div>
          <div class="tab" data-tab="health">💉 健康</div>
          <div class="tab" data-tab="feeding">🍖 喂养</div>
          <div class="tab" data-tab="photos">📷 照片</div>
          <div class="tab" data-tab="expense">💰 花销</div>
        </div>

        <!-- Tab 内容 -->
        <div id="petTabContent"></div>
      </div>
    `;

    main.querySelector('[data-act="back"]').onclick = () => router.navigate('pet');
    main.querySelector('#editPetBtn').onclick = () => this.edit(id);

    let currentTab = 'weight';
    const refreshTab = async () => {
      const content = document.getElementById('petTabContent');
      if (currentTab === 'weight') await this.renderWeightTab(id, content);
      else if (currentTab === 'health') await this.renderHealthTab(id, content);
      else if (currentTab === 'feeding') await this.renderFeedingTab(id, content);
      else if (currentTab === 'photos') await this.renderPhotosTab(id, content);
      else if (currentTab === 'expense') await this.renderExpenseTab(id, content);
    };

    main.querySelectorAll('#petTabs .tab').forEach((tab) => {
      tab.onclick = () => {
        main.querySelectorAll('#petTabs .tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        refreshTab();
      };
    });

    refreshTab();
  },

  /* ===== 添加菜单（FAB）===== */
  showAddMenu(petId) {
    const body = `
      <div class="choice-grid" style="grid-template-columns:1fr 1fr;">
        <button class="choice" data-act="weight">⚖️ 记体重</button>
        <button class="choice" data-act="vaccine">💉 打疫苗</button>
        <button class="choice" data-act="deworm">🛡️ 做驱虫</button>
        <button class="choice" data-act="bath">🛁 洗澡了</button>
        <button class="choice" data-act="feeding">🍖 喂养记录</button>
        <button class="choice" data-act="symptom">⚠️ 异常症状</button>
        <button class="choice" data-act="vet">🩺 就医记录</button>
        <button class="choice" data-act="photo">📷 上传照片</button>
        <button class="choice" data-act="expense">💰 记花销</button>
      </div>`;
    UI.showSheet('添加记录', body, (root) => {
      const actions = {
        weight: () => this.editWeight(petId),
        vaccine: () => this.editHealth(petId, 'vaccine'),
        deworm: () => this.editHealth(petId, 'deworm'),
        bath: () => this.editHealth(petId, 'bath'),
        feeding: () => this.editHealth(petId, 'feeding'),
        symptom: () => this.editHealth(petId, 'symptom'),
        vet: () => this.editHealth(petId, 'vet'),
        photo: () => this.addPhoto(petId),
        expense: () => this.editExpense(petId)
      };
      Object.keys(actions).forEach((act) => {
        root.querySelector(`[data-act="${act}"]`).onclick = () => {
          UI.hideSheet();
          actions[act]();
        };
      });
    });
  },

  /* ===== 体重 Tab ===== */
  async renderWeightTab(petId, el) {
    const weights = (await db.all(db.STORES.petWeight))
      .filter((w) => w.petId === petId)
      .sort((a, b) => (a.date || 0) - (b.date || 0));

    if (weights.length === 0) {
      el.innerHTML = `
        <div class="empty" style="padding:30px;">
          <div class="emoji" style="font-size:40px;">⚖️</div>
          <div class="hint">还没有体重记录</div>
          <button class="btn btn-primary" id="addWeightBtn" style="margin-top:14px;">⚖️ 记录第一次体重</button>
        </div>`;
      el.querySelector('#addWeightBtn').onclick = () => this.editWeight(petId);
      return;
    }

    const latest = weights[weights.length - 1];
    const first = weights[0];
    const minW = Math.min(...weights.map((w) => w.weight));
    const maxW = Math.max(...weights.map((w) => w.weight));
    const avgW = (weights.reduce((a, w) => a + w.weight, 0) / weights.length).toFixed(1);
    const change = (latest.weight - first.weight).toFixed(1);

    el.innerHTML = `
      <!-- 体重概览 -->
      <div class="pet-stats-row">
        <div class="pet-stat-box">
          <div class="psb-num green">${latest.weight}</div>
          <div class="psb-label">最新(kg)</div>
        </div>
        <div class="pet-stat-box">
          <div class="psb-num">${avgW}</div>
          <div class="psb-label">平均(kg)</div>
        </div>
        <div class="pet-stat-box">
          <div class="psb-num gold">${maxW}</div>
          <div class="psb-label">最高(kg)</div>
        </div>
        <div class="pet-stat-box">
          <div class="psb-num rust">${minW}</div>
          <div class="psb-label">最低(kg)</div>
        </div>
      </div>

      <!-- 体重趋势图 -->
      <div class="section-title">📈 体重趋势</div>
      <div class="chart-box" id="weightChartBox"></div>

      <!-- 记录列表 -->
      <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>📋 体重记录（${weights.length}）</span>
        <button class="btn btn-outline" id="addWeightBtn2" style="font-size:11px;padding:4px 12px;">＋ 记录</button>
      </div>
      <div id="weightList"></div>
    `;

    // 渲染图表
    this.renderWeightChart(el.querySelector('#weightChartBox'), weights);

    // 渲染记录列表
    const listEl = el.querySelector('#weightList');
    listEl.innerHTML = weights
      .slice()
      .reverse()
      .map(
        (w, i) => `
      <div class="list-item weight-record-item">
        <div class="li-row">
          <div style="flex:1">
            <div class="li-title">⚖️ ${w.weight} kg</div>
            <div class="li-sub">📅 ${w.date}${w.note ? ' · ' + w.note : ''}</div>
            ${i < weights.length - 1 ? `<div style="font-size:11px;color:var(--ink-mute);margin-top:3px;">${this.weightChangeText(w.weight, weights[weights.length - 2 - i].weight)}</div>` : '<div style="font-size:11px;color:var(--forest);margin-top:3px;">首次记录</div>'}
          </div>
          <div>
            <button class="icon-btn" data-act="edit-w" data-id="${w.id}" style="width:30px;height:30px;font-size:12px">✏️</button>
            <button class="icon-btn" data-act="del-w" data-id="${w.id}" style="width:30px;height:30px;font-size:12px">🗑</button>
          </div>
        </div>
      </div>`
      )
      .join('');

    listEl.querySelectorAll('[data-act="edit-w"]').forEach((b) => {
      b.onclick = () => this.editWeight(petId, b.dataset.id);
    });
    listEl.querySelectorAll('[data-act="del-w"]').forEach((b) => {
      b.onclick = async () => {
        if (await UI.confirm('删除这条体重记录？')) {
          await db.remove(db.STORES.petWeight, b.dataset.id);
          this.renderWeightTab(petId, el);
          UI.toast('已删除');
        }
      };
    });

    el.querySelector('#addWeightBtn2').onclick = () => this.editWeight(petId);
  },

  weightChangeText(current, prev) {
    const diff = (current - prev).toFixed(1);
    if (diff > 0) return `↑ 增重 ${diff} kg`;
    if (diff < 0) return `↓ 减重 ${Math.abs(diff)} kg`;
    return '→ 体重不变';
  },

  /* 体重趋势图（SVG） */
  renderWeightChart(box, weights) {
    if (weights.length < 2) {
      box.innerHTML = `<div style="text-align:center;padding:20px;font-size:12px;color:var(--ink-mute);">至少需要 2 条记录才能显示趋势图</div>`;
      return;
    }

    const W = 300, H = 140, P = 30;
    const minV = Math.min(...weights.map((w) => w.weight)) - 0.5;
    const maxV = Math.max(...weights.map((w) => w.weight)) + 0.5;
    const range = maxV - minV || 1;
    const stepX = (W - P * 2) / (weights.length - 1);

    const points = weights.map((w, i) => {
      const x = P + i * stepX;
      const y = H - P - ((w.weight - minV) / range) * (H - P * 2);
      return { x, y, w };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaD = pathD + ` L ${points[points.length - 1].x.toFixed(1)} ${H - P} L ${points[0].x.toFixed(1)} ${H - P} Z`;

    // Y 轴标签
    const yLabels = [maxV.toFixed(1), ((maxV + minV) / 2).toFixed(1), minV.toFixed(1)];

    box.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--forest-glow)" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="var(--forest-glow)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- 网格线 -->
        <line x1="${P}" y1="${P}" x2="${W - P}" y2="${P}" stroke="var(--ink-line)" stroke-dasharray="2,3"/>
        <line x1="${P}" y1="${H / 2}" x2="${W - P}" y2="${H / 2}" stroke="var(--ink-line)" stroke-dasharray="2,3"/>
        <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" stroke="var(--ink-line)"/>
        <!-- Y 轴标签 -->
        ${yLabels.map((v, i) => `<text x="${P - 6}" y="${P + i * (H - P * 2) / 2 + 4}" text-anchor="end" font-size="9" fill="var(--ink-mute)">${v}</text>`).join('')}
        <!-- 填充区域 -->
        <path d="${areaD}" fill="url(#weightArea)"/>
        <!-- 折线 -->
        <path d="${pathD}" fill="none" stroke="var(--forest)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <!-- 数据点 -->
        ${points.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="var(--forest)"/><text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" text-anchor="middle" font-size="8" fill="var(--ink-soft)" font-weight="600">${p.w.weight}</text>`).join('')}
      </svg>
    `;
  },

  /* 添加/编辑体重记录 */
  editWeight(petId, recordId) {
    const isEdit = !!recordId;
    const today = UI.todayStr();
    const body = `
      <div class="form-row">
        <label class="label">体重 (kg)</label>
        <input class="field" id="w_weight" type="number" step="0.01" placeholder="如：4.5" min="0" max="999">
      </div>
      <div class="form-row">
        <label class="label">记录日期</label>
        <input class="field" id="w_date" type="date" value="${today}">
      </div>
      <div class="form-row">
        <label class="label">备注（可选）</label>
        <input class="field" id="w_note" placeholder="如：体检称重" maxlength="50">
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="w_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="w_save">${isEdit ? '保存' : '添加'}</button>
      </div>`;
    UI.showSheet(isEdit ? '编辑体重记录' : '记录体重', body, (root) => {
      let loaded = false;

      root.querySelector('#w_save').onclick = async () => {
        if (isEdit && !loaded) {
          UI.toast('数据加载中，请稍候');
          return;
        }
        const weight = parseFloat(root.querySelector('#w_weight').value);
        if (!weight || weight <= 0) return UI.toast('请输入有效的体重');
        const date = root.querySelector('#w_date').value || today;
        const note = root.querySelector('#w_note').value.trim();
        const payload = { petId, weight, date, note };
        if (isEdit) {
          const rec = await db.get(db.STORES.petWeight, recordId);
          Object.assign(rec, payload);
          await db.put(db.STORES.petWeight, rec);
        } else {
          await db.add(db.STORES.petWeight, payload);
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已记录');
        const content = document.getElementById('petTabContent');
        if (content) this.renderWeightTab(petId, content);
      };

      const cancelBtn = root.querySelector('#w_cancel');
      if (cancelBtn) cancelBtn.onclick = () => UI.hideSheet();

      (async () => {
        if (isEdit) {
          try {
            const rec = await db.get(db.STORES.petWeight, recordId);
            if (!rec) {
              UI.toast('未找到该记录');
              UI.hideSheet();
              return;
            }
            root.querySelector('#w_weight').value = rec.weight || '';
            root.querySelector('#w_date').value = rec.date || today;
            root.querySelector('#w_note').value = rec.note || '';
            loaded = true;
          } catch (err) {
            UI.toast('加载失败');
            UI.hideSheet();
          }
        } else {
          loaded = true;
        }
      })();
    });
  },

  /* ===== 健康 Tab ===== */
  async renderHealthTab(petId, el) {
    const healths = (await db.all(db.STORES.petHealth))
      .filter((h) => h.petId === petId)
      .sort((a, b) => (b.date || 0) - (a.date || 0));

    // 检查提醒
    const pet = await db.get(db.STORES.pet, petId);
    const reminders = this.checkReminders(pet, healths);

    el.innerHTML = `
      ${reminders.length > 0 ? `
        <div class="pet-reminder-box">
          <div class="prb-title">⏰ 健康提醒</div>
          ${reminders.map((r) => `<div class="prb-item ${r.urgent ? 'urgent' : ''}">${r.icon} ${r.text}</div>`).join('')}
        </div>
      ` : ''}

      <!-- 快捷添加按钮 -->
      <div class="pet-quick-add">
        <button class="pet-qa-btn" data-type="vaccine">💉 疫苗</button>
        <button class="pet-qa-btn" data-type="deworm">🛡️ 驱虫</button>
        <button class="pet-qa-btn" data-type="bath">🛁 洗澡</button>
        <button class="pet-qa-btn" data-type="symptom">⚠️ 症状</button>
        <button class="pet-qa-btn" data-type="vet">🩺 就医</button>
        <button class="pet-qa-btn" data-type="surgery">🏥 手术</button>
      </div>

      <!-- 按类型分组统计 -->
      ${this.renderHealthSummary(healths)}

      <!-- 记录列表 -->
      <div class="section-title">📋 健康记录（${healths.length}）</div>
      <div id="healthList"></div>
    `;

    // 快捷按钮
    el.querySelectorAll('.pet-qa-btn').forEach((btn) => {
      btn.onclick = () => this.editHealth(petId, btn.dataset.type);
    });

    // 记录列表
    const listEl = el.querySelector('#healthList');
    if (healths.length === 0) {
      listEl.innerHTML = `<div class="empty" style="padding:24px;"><div class="emoji">💉</div><div class="hint">还没有健康记录</div></div>`;
      return;
    }

    // 按类型分组
    const grouped = {};
    healths.forEach((h) => {
      if (!grouped[h.type]) grouped[h.type] = [];
      grouped[h.type].push(h);
    });

    listEl.innerHTML = Object.keys(grouped)
      .map((type) => {
        const config = this.healthTypes[type] || { icon: '📋', label: type, color: '' };
        const items = grouped[type];
        return `
          <div class="section-title" style="font-size:14px;">${config.icon} ${config.label}（${items.length}）</div>
          ${items.map((h) => `
            <div class="list-item health-record-item">
              <div class="li-row">
                <div style="flex:1">
                  <div class="li-title">${h.title || config.label}</div>
                  <div class="li-sub">📅 ${h.date}</div>
                  ${h.description ? `<div style="font-size:12px;color:var(--ink-soft);margin-top:4px;line-height:1.5;">${h.description}</div>` : ''}
                  ${h.nextDate ? `<div style="font-size:11px;color:var(--gold);margin-top:4px;">🔁 下次：${h.nextDate}</div>` : ''}
                  ${h.cost ? `<div style="font-size:11px;color:var(--rust);margin-top:3px;">💰 ¥${h.cost}</div>` : ''}
                </div>
                <div>
                  <button class="icon-btn" data-act="edit-h" data-id="${h.id}" style="width:30px;height:30px;font-size:12px">✏️</button>
                  <button class="icon-btn" data-act="del-h" data-id="${h.id}" style="width:30px;height:30px;font-size:12px">🗑</button>
                </div>
              </div>
            </div>
          `).join('')}
        `;
      })
      .join('');

    listEl.querySelectorAll('[data-act="edit-h"]').forEach((b) => {
      b.onclick = () => this.editHealth(petId, null, b.dataset.id);
    });
    listEl.querySelectorAll('[data-act="del-h"]').forEach((b) => {
      b.onclick = async () => {
        if (await UI.confirm('删除这条记录？')) {
          await db.remove(db.STORES.petHealth, b.dataset.id);
          this.renderHealthTab(petId, el);
          UI.toast('已删除');
        }
      };
    });
  },

  renderHealthSummary(healths) {
    const types = ['vaccine', 'deworm', 'bath', 'symptom', 'surgery', 'vet'];
    const counts = types.map((t) => ({ type: t, count: healths.filter((h) => h.type === t).length })).filter((c) => c.count > 0);
    if (counts.length === 0) return '';
    return `
      <div class="section-title">📊 记录统计</div>
      <div class="pet-health-summary">
        ${counts.map((c) => {
          const config = this.healthTypes[c.type];
          return `<div class="phs-item"><span class="phs-icon">${config.icon}</span><span class="phs-count">${c.count}</span><span class="phs-label">${config.label}</span></div>`;
        }).join('')}
      </div>
    `;
  },

  /* 检查健康提醒 */
  checkReminders(pet, healths) {
    const reminders = [];
    if (!pet) return reminders;
    const today = new Date();
    const todayTs = today.getTime();

    // 疫苗提醒（每年一次）
    const vaccines = healths.filter((h) => h.type === 'vaccine').sort((a, b) => (b.date || 0) - (a.date || 0));
    if (vaccines.length > 0) {
      const last = vaccines[0];
      if (last.nextDate) {
        const nextTs = new Date(last.nextDate).getTime();
        const diff = Math.ceil((nextTs - todayTs) / 86400000);
        if (diff <= 30) {
          reminders.push({
            icon: '💉',
            text: diff < 0 ? `疫苗已过期 ${Math.abs(diff)} 天，请尽快补种` : `疫苗将在 ${diff} 天后到期`,
            urgent: diff <= 7
          });
        }
      } else {
        // 没有设置下次日期，按一年计算
        const lastTs = new Date(last.date).getTime();
        const nextTs = lastTs + 365 * 86400000;
        const diff = Math.ceil((nextTs - todayTs) / 86400000);
        if (diff <= 30) {
          reminders.push({
            icon: '💉',
            text: diff < 0 ? `疫苗已过期 ${Math.abs(diff)} 天，请尽快补种` : `疫苗将在 ${diff} 天后到期`,
            urgent: diff <= 7
          });
        }
      }
    } else if (pet.birthday) {
      // 没有疫苗记录，如果是幼宠提醒接种
      const ageMonths = Math.floor((todayTs - new Date(pet.birthday).getTime()) / (30 * 86400000));
      if (ageMonths < 6) {
        reminders.push({ icon: '💉', text: '还未记录任何疫苗，幼宠建议尽早接种', urgent: true });
      }
    }

    // 驱虫提醒（每3个月一次）
    const deworms = healths.filter((h) => h.type === 'deworm').sort((a, b) => (b.date || 0) - (a.date || 0));
    if (deworms.length > 0) {
      const last = deworms[0];
      if (last.nextDate) {
        const nextTs = new Date(last.nextDate).getTime();
        const diff = Math.ceil((nextTs - todayTs) / 86400000);
        if (diff <= 15) {
          reminders.push({
            icon: '🛡️',
            text: diff < 0 ? `驱虫已超期 ${Math.abs(diff)} 天` : `驱虫将在 ${diff} 天后到期`,
            urgent: diff <= 7
          });
        }
      }
    }

    // 洗澡提醒（每月一次）
    const baths = healths.filter((h) => h.type === 'bath').sort((a, b) => (b.date || 0) - (a.date || 0));
    if (baths.length > 0) {
      const last = baths[0];
      const lastTs = new Date(last.date).getTime();
      const nextTs = lastTs + 30 * 86400000;
      const diff = Math.ceil((nextTs - todayTs) / 86400000);
      if (diff <= 7) {
        reminders.push({
          icon: '🛁',
          text: diff < 0 ? `已 ${Math.abs(diff)} 天没洗澡了` : `建议在 ${diff} 天内洗澡`,
          urgent: false
        });
      }
    }

    return reminders;
  },

  /* 添加/编辑健康记录 */
  editHealth(petId, defaultType, recordId) {
    const isEdit = !!recordId;
    const today = UI.todayStr();
    const typeOptions = Object.keys(this.healthTypes)
      .map((t) => `<option value="${t}" ${defaultType === t ? 'selected' : ''}>${this.healthTypes[t].icon} ${this.healthTypes[t].label}</option>`)
      .join('');

    const body = `
      <div class="form-row">
        <label class="label">记录类型</label>
        <select class="field" id="h_type">${typeOptions}</select>
      </div>
      <div class="form-row">
        <label class="label">标题</label>
        <input class="field" id="h_title" placeholder="如：狂犬疫苗第一针" maxlength="30">
      </div>
      <div class="form-row">
        <label class="label">日期</label>
        <input class="field" id="h_date" type="date" value="${today}">
      </div>
      <div class="form-row" id="nextDateRow">
        <label class="label">下次日期（可选）</label>
        <input class="field" id="h_nextdate" type="date">
      </div>
      <div class="form-row">
        <label class="label">详细描述</label>
        <textarea class="field" id="h_desc" placeholder="如：接种了妙三多疫苗，无不良反应..." rows="3" maxlength="500"></textarea>
      </div>
      <div class="form-row">
        <label class="label">花费（可选）</label>
        <input class="field" id="h_cost" type="number" step="0.01" placeholder="元" min="0">
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="h_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="h_save">${isEdit ? '保存' : '添加'}</button>
      </div>`;
    UI.showSheet(isEdit ? '编辑健康记录' : '添加健康记录', body, (root) => {
      let loaded = false;

      // 类型变化时控制下次日期显示（疫苗/驱虫显示）
      const toggleNextDate = () => {
        const type = root.querySelector('#h_type').value;
        const row = root.querySelector('#nextDateRow');
        row.style.display = (type === 'vaccine' || type === 'deworm' || type === 'bath') ? '' : 'none';
      };
      root.querySelector('#h_type').onchange = toggleNextDate;
      toggleNextDate();

      root.querySelector('#h_save').onclick = async () => {
        if (isEdit && !loaded) {
          UI.toast('数据加载中，请稍候');
          return;
        }
        const type = root.querySelector('#h_type').value;
        const title = root.querySelector('#h_title').value.trim();
        const date = root.querySelector('#h_date').value || today;
        const description = root.querySelector('#h_desc').value.trim();
        const cost = parseFloat(root.querySelector('#h_cost').value) || null;
        const nextDate = root.querySelector('#h_nextdate').value || null;
        const payload = { petId, type, title, date, description, cost, nextDate };
        if (isEdit) {
          const rec = await db.get(db.STORES.petHealth, recordId);
          Object.assign(rec, payload);
          await db.put(db.STORES.petHealth, rec);
        } else {
          await db.add(db.STORES.petHealth, payload);
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已记录');
        const content = document.getElementById('petTabContent');
        if (content) {
          // 根据当前 tab 刷新
          if (type === 'feeding') this.renderFeedingTab(petId, content);
          else this.renderHealthTab(petId, content);
        }
      };

      const cancelBtn = root.querySelector('#h_cancel');
      if (cancelBtn) cancelBtn.onclick = () => UI.hideSheet();

      (async () => {
        if (isEdit) {
          try {
            const rec = await db.get(db.STORES.petHealth, recordId);
            if (!rec) {
              UI.toast('未找到该记录');
              UI.hideSheet();
              return;
            }
            root.querySelector('#h_type').value = rec.type || defaultType || 'vaccine';
            root.querySelector('#h_title').value = rec.title || '';
            root.querySelector('#h_date').value = rec.date || today;
            root.querySelector('#h_desc').value = rec.description || '';
            root.querySelector('#h_cost').value = rec.cost || '';
            root.querySelector('#h_nextdate').value = rec.nextDate || '';
            toggleNextDate();
            loaded = true;
          } catch (err) {
            UI.toast('加载失败');
            UI.hideSheet();
          }
        } else {
          loaded = true;
        }
      })();
    });
  },

  /* ===== 喂养 Tab ===== */
  async renderFeedingTab(petId, el) {
    const feedings = (await db.all(db.STORES.petHealth))
      .filter((h) => h.petId === petId && h.type === 'feeding')
      .sort((a, b) => (b.date || 0) - (a.date || 0));

    el.innerHTML = `
      <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>🍖 喂养记录（${feedings.length}）</span>
        <button class="btn btn-outline" id="addFeedingBtn" style="font-size:11px;padding:4px 12px;">＋ 记录</button>
      </div>
      <div id="feedingList"></div>
    `;

    el.querySelector('#addFeedingBtn').onclick = () => this.editHealth(petId, 'feeding');

    const listEl = el.querySelector('#feedingList');
    if (feedings.length === 0) {
      listEl.innerHTML = `<div class="empty" style="padding:24px;"><div class="emoji">🍖</div><div class="hint">还没有喂养记录</div></div>`;
      return;
    }

    listEl.innerHTML = feedings
      .map((h) => `
        <div class="list-item">
          <div class="li-row">
            <div style="flex:1">
              <div class="li-title">${h.title || '喂养记录'}</div>
              <div class="li-sub">📅 ${h.date}</div>
              ${h.description ? `<div style="font-size:12px;color:var(--ink-soft);margin-top:4px;line-height:1.5;">${h.description}</div>` : ''}
              ${h.cost ? `<div style="font-size:11px;color:var(--rust);margin-top:3px;">💰 ¥${h.cost}</div>` : ''}
            </div>
            <div>
              <button class="icon-btn" data-act="edit-f" data-id="${h.id}" style="width:30px;height:30px;font-size:12px">✏️</button>
              <button class="icon-btn" data-act="del-f" data-id="${h.id}" style="width:30px;height:30px;font-size:12px">🗑</button>
            </div>
          </div>
        </div>
      `)
      .join('');

    listEl.querySelectorAll('[data-act="edit-f"]').forEach((b) => {
      b.onclick = () => this.editHealth(petId, 'feeding', b.dataset.id);
    });
    listEl.querySelectorAll('[data-act="del-f"]').forEach((b) => {
      b.onclick = async () => {
        if (await UI.confirm('删除这条喂养记录？')) {
          await db.remove(db.STORES.petHealth, b.dataset.id);
          this.renderFeedingTab(petId, el);
          UI.toast('已删除');
        }
      };
    });
  },

  /* ===== 阶段照片 Tab ===== */
  async renderPhotosTab(petId, el) {
    const medias = (await db.all(db.STORES.petMedia))
      .filter((m) => m.petId === petId)
      .sort((a, b) => (b.date || 0) - (a.date || 0));

    // 按阶段分组
    const grouped = {};
    this.stages.forEach((s) => (grouped[s.key] = []));
    medias.forEach((m) => {
      const stage = m.stage || 'adult';
      if (!grouped[stage]) grouped[stage] = [];
      grouped[stage].push(m);
    });

    el.innerHTML = `
      <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>📷 阶段照片（${medias.length}）</span>
        <button class="btn btn-primary" id="addPhotoBtn" style="font-size:11px;padding:4px 12px;">＋ 上传</button>
      </div>
      ${this.stages.map((s) => {
        const photos = grouped[s.key] || [];
        if (photos.length === 0) return '';
        return `
          <div class="section-title" style="font-size:14px;">${s.icon} ${s.label}（${photos.length}）</div>
          <div class="img-grid" data-stage="${s.key}">
            ${photos.map((m) => `
              <div class="img-cell pet-photo-cell" data-id="${m.id}">
                <img src="${m.url}" alt="${m.note || '宠物照片'}">
                ${m.note ? `<div class="pet-photo-note">${m.note}</div>` : ''}
                <button class="del" data-act="del-photo" data-id="${m.id}">✕</button>
              </div>
            `).join('')}
          </div>
        `;
      }).join('')}
      ${medias.length === 0 ? `<div class="empty" style="padding:30px;"><div class="emoji">📷</div><div class="hint">上传宠物各阶段的照片，记录成长轨迹</div></div>` : ''}
    `;

    // 上传按钮 - 同步绑定
    const addBtn = el.querySelector('#addPhotoBtn');
    if (addBtn) {
      addBtn.onclick = () => this.addPhoto(petId);
    }

    // 删除按钮
    el.querySelectorAll('[data-act="del-photo"]').forEach((b) => {
      b.onclick = async (e) => {
        e.stopPropagation();
        if (await UI.confirm('删除这张照片？')) {
          await db.remove(db.STORES.petMedia, b.dataset.id);
          this.renderPhotosTab(petId, el);
          UI.toast('已删除');
        }
      };
    });

    // 点击照片查看大图
    el.querySelectorAll('.pet-photo-cell').forEach((cell) => {
      cell.onclick = () => {
        const img = cell.querySelector('img');
        if (img) this.viewPhoto(img.src);
      };
    });
  },

  /* 查看大图 */
  viewPhoto(src) {
    const body = `
      <div style="text-align:center;">
        <img src="${src}" style="width:100%;border-radius:12px;" alt="照片">
      </div>
      <div class="form-actions" style="margin-top:12px;">
        <button class="btn btn-primary" id="photoClose" style="flex:1;">关闭</button>
      </div>`;
    UI.showSheet('查看照片', body, (root) => {
      root.querySelector('#photoClose').onclick = () => UI.hideSheet();
    });
  },

  /* 上传照片 */
  async addPhoto(petId) {
    const imgs = await UI.pickImages(9);
    if (!imgs.length) return;

    // 选择阶段
    const stageOptions = this.stages
      .map((s) => `<button class="choice" data-stage="${s.key}">${s.icon} ${s.label}</button>`)
      .join('');

    const body = `
      <div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">已选择 ${imgs.length} 张照片，请选择成长阶段：</div>
      <div class="choice-grid">${stageOptions}</div>
      <div class="form-row" style="margin-top:14px;">
        <label class="label">备注（可选，对所有照片生效）</label>
        <input class="field" id="p_note" placeholder="如：第一次洗澡" maxlength="50">
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="p_cancel">取消</button>
        <button class="btn btn-primary" id="p_save">上传</button>
      </div>`;
    UI.showSheet('选择阶段', body, (root) => {
      let selectedStage = 'adult';
      root.querySelectorAll('.choice').forEach((c) => {
        c.onclick = () => {
          root.querySelectorAll('.choice').forEach((x) => x.classList.remove('active'));
          c.classList.add('active');
          selectedStage = c.dataset.stage;
        };
      });
      // 默认选中成年
      const defaultChoice = root.querySelector('.choice[data-stage="adult"]');
      if (defaultChoice) defaultChoice.classList.add('active');

      root.querySelector('#p_save').onclick = async () => {
        const note = root.querySelector('#p_note').value.trim();
        for (const url of imgs) {
          await db.add(db.STORES.petMedia, {
            petId,
            url,
            stage: selectedStage,
            note,
            date: UI.todayStr()
          });
        }
        UI.hideSheet();
        UI.toast(`已上传 ${imgs.length} 张照片`);
        const content = document.getElementById('petTabContent');
        if (content) this.renderPhotosTab(petId, content);
      };
      root.querySelector('#p_cancel').onclick = () => UI.hideSheet();
    });
  },

  /* ===== 花销 Tab ===== */
  async renderExpenseTab(petId, el) {
    const expenses = (await db.all(db.STORES.petExpense))
      .filter((e) => e.petId === petId)
      .sort((a, b) => (b.date || 0) - (a.date || 0));

    const total = expenses.reduce((a, e) => a + (e.amount || 0), 0);
    const thisMonth = expenses.filter((e) => (e.date || '').startsWith(UI.todayStr().slice(0, 7)));
    const monthTotal = thisMonth.reduce((a, e) => a + (e.amount || 0), 0);

    // 按类别统计
    const categories = {};
    expenses.forEach((e) => {
      const cat = e.category || '其他';
      if (!categories[cat]) categories[cat] = 0;
      categories[cat] += e.amount || 0;
    });
    const sortedCats = Object.keys(categories).sort((a, b) => categories[b] - categories[a]);

    el.innerHTML = `
      <!-- 花销概览 -->
      <div class="pet-expense-overview">
        <div class="peo-main">
          <div class="peo-num">¥${total.toFixed(2)}</div>
          <div class="peo-label">累计花费</div>
        </div>
        <div class="peo-sub">
          <div>本月 ¥${monthTotal.toFixed(2)}</div>
          <div>${expenses.length} 笔记录</div>
        </div>
      </div>

      <!-- 分类统计 -->
      ${sortedCats.length > 0 ? `
        <div class="section-title">📊 分类统计</div>
        <div class="pet-cat-list">
          ${sortedCats.map((cat) => {
            const pct = total > 0 ? (categories[cat] / total * 100).toFixed(0) : 0;
            return `
              <div class="rank-item">
                <span class="ri-name" style="width:auto;min-width:50px;">${cat}</span>
                <div class="ri-bar-wrap"><div class="ri-bar" style="width:${pct}%;background:var(--forest);"></div></div>
                <span class="ri-amount">¥${categories[cat].toFixed(0)}</span>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      <!-- 记录列表 -->
      <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>💰 花销记录（${expenses.length}）</span>
        <button class="btn btn-outline" id="addExpenseBtn" style="font-size:11px;padding:4px 12px;">＋ 记录</button>
      </div>
      <div id="expenseList"></div>
    `;

    el.querySelector('#addExpenseBtn').onclick = () => this.editExpense(petId);

    const listEl = el.querySelector('#expenseList');
    if (expenses.length === 0) {
      listEl.innerHTML = `<div class="empty" style="padding:24px;"><div class="emoji">💰</div><div class="hint">还没有花销记录</div></div>`;
      return;
    }

    listEl.innerHTML = expenses
      .map((e) => `
        <div class="list-item">
          <div class="li-row">
            <div style="flex:1">
              <div class="li-title">${e.title || '花销'}</div>
              <div class="li-sub">📅 ${e.date} · ${e.category || '其他'}</div>
              ${e.note ? `<div style="font-size:12px;color:var(--ink-soft);margin-top:4px;">${e.note}</div>` : ''}
            </div>
            <div style="text-align:right;">
              <div style="font-family:var(--font-num);font-size:16px;color:var(--rust);">¥${e.amount.toFixed(2)}</div>
              <div>
                <button class="icon-btn" data-act="edit-e" data-id="${e.id}" style="width:28px;height:28px;font-size:12px">✏️</button>
                <button class="icon-btn" data-act="del-e" data-id="${e.id}" style="width:28px;height:28px;font-size:12px">🗑</button>
              </div>
            </div>
          </div>
        </div>
      `)
      .join('');

    listEl.querySelectorAll('[data-act="edit-e"]').forEach((b) => {
      b.onclick = () => this.editExpense(petId, b.dataset.id);
    });
    listEl.querySelectorAll('[data-act="del-e"]').forEach((b) => {
      b.onclick = async () => {
        if (await UI.confirm('删除这条花销记录？')) {
          await db.remove(db.STORES.petExpense, b.dataset.id);
          this.renderExpenseTab(petId, el);
          UI.toast('已删除');
        }
      };
    });
  },

  /* 添加/编辑花销 */
  editExpense(petId, recordId) {
    const isEdit = !!recordId;
    const today = UI.todayStr();
    const body = `
      <div class="form-row">
        <label class="label">花费项目</label>
        <input class="field" id="e_title" placeholder="如：猫粮、猫砂、体检费" maxlength="30">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">金额</label>
          <input class="field" id="e_amount" type="number" step="0.01" placeholder="元" min="0">
        </div>
        <div>
          <label class="label">日期</label>
          <input class="field" id="e_date" type="date" value="${today}">
        </div>
      </div>
      <div class="form-row">
        <label class="label">分类</label>
        <div class="cat-grid" id="e_catGrid">
          <button class="cat-btn active" data-cat="食物">🍖 食物</button>
          <button class="cat-btn" data-cat="用品">🧴 用品</button>
          <button class="cat-btn" data-cat="医疗">🏥 医疗</button>
          <button class="cat-btn" data-cat="美容">✂️ 美容</button>
          <button class="cat-btn" data-cat="玩具">🎾 玩具</button>
          <button class="cat-btn" data-cat="其他">📦 其他</button>
        </div>
      </div>
      <div class="form-row">
        <label class="label">备注（可选）</label>
        <input class="field" id="e_note" placeholder="如：皇家猫粮 2kg" maxlength="50">
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="e_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="e_save">${isEdit ? '保存' : '添加'}</button>
      </div>`;
    UI.showSheet(isEdit ? '编辑花销' : '记一笔花销', body, (root) => {
      let loaded = false;
      let category = '食物';

      // 分类选择
      root.querySelectorAll('.cat-btn').forEach((btn) => {
        btn.onclick = () => {
          root.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          category = btn.dataset.cat;
        };
      });

      root.querySelector('#e_save').onclick = async () => {
        if (isEdit && !loaded) {
          UI.toast('数据加载中，请稍候');
          return;
        }
        const title = root.querySelector('#e_title').value.trim();
        const amount = parseFloat(root.querySelector('#e_amount').value);
        if (!amount || amount <= 0) return UI.toast('请输入有效金额');
        const date = root.querySelector('#e_date').value || today;
        const note = root.querySelector('#e_note').value.trim();
        const payload = { petId, title, amount, date, category, note };
        if (isEdit) {
          const rec = await db.get(db.STORES.petExpense, recordId);
          Object.assign(rec, payload);
          await db.put(db.STORES.petExpense, rec);
        } else {
          await db.add(db.STORES.petExpense, payload);
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已记录');
        const content = document.getElementById('petTabContent');
        if (content) this.renderExpenseTab(petId, content);
      };

      const cancelBtn = root.querySelector('#e_cancel');
      if (cancelBtn) cancelBtn.onclick = () => UI.hideSheet();

      (async () => {
        if (isEdit) {
          try {
            const rec = await db.get(db.STORES.petExpense, recordId);
            if (!rec) {
              UI.toast('未找到该记录');
              UI.hideSheet();
              return;
            }
            root.querySelector('#e_title').value = rec.title || '';
            root.querySelector('#e_amount').value = rec.amount || '';
            root.querySelector('#e_date').value = rec.date || today;
            root.querySelector('#e_note').value = rec.note || '';
            category = rec.category || '食物';
            root.querySelectorAll('.cat-btn').forEach((b) => {
              b.classList.toggle('active', b.dataset.cat === category);
            });
            loaded = true;
          } catch (err) {
            UI.toast('加载失败');
            UI.hideSheet();
          }
        } else {
          loaded = true;
        }
      })();
    });
  },

  /* ===== 工具函数 ===== */
  calcAge(birthday) {
    if (!birthday) return '';
    const birth = new Date(birthday);
    const now = new Date();
    if (birth > now) return '';
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    if (years === 0) {
      return months === 0 ? '刚出生' : `${months} 个月`;
    }
    return months === 0 ? `${years} 岁` : `${years} 岁 ${months} 个月`;
  }
};

router.register('pet', () => Pet.list());
router.register('pet/*', (param) => Pet.detail(param));
window.Pet = Pet;
