/* ============================================
   博物馆掠影模块
   - 新建博物馆项目
   - 上传文物图片
   - AI 自动识别文物名称与简介
   ============================================ */

const Museum = {
  async list() {
    App.setActiveNav('museum');
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="fade-up">
        <div style="text-align:center;padding:10px 0 16px;">
          <div style="font-size:36px">🏺</div>
          <div style="font-family:var(--font-hand);font-size:14px;color:var(--ink-mute);margin-top:4px">一眼千年 · 文物留痕</div>
        </div>
        <div id="museumList"></div>
      </div>
    `;
    App.setFab(() => this.edit());

    const all = await db.all(db.STORES.museum);
    all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const el = document.getElementById('museumList');
    if (all.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">🏛️</div><div class="hint">点击 + 新建一个博物馆项目</div></div>`;
      return;
    }

    // 统计每个博物馆的文物数
    const relics = await db.all(db.STORES.relic);
    el.innerHTML = all
      .map((m) => {
        const count = relics.filter((r) => r.museumId === m.id).length;
        return `
        <div class="list-item" data-id="${m.id}">
          <div class="li-row">
            <span style="font-size:24px">🏛️</span>
            <div style="flex:1" data-act="open">
              <div class="li-title">${m.name}</div>
              ${m.location ? `<div class="li-sub">📍 ${m.location}</div>` : ''}
              <div class="li-tags">
                <span class="chip yellow">🏺 ${count} 件文物</span>
                ${m.visitDate ? `<span class="chip green">📅 ${m.visitDate}</span>` : ''}
              </div>
            </div>
            <button class="icon-btn" data-act="menu" style="width:32px;height:32px;font-size:14px">⋯</button>
          </div>
        </div>`;
      })
      .join('');

    el.querySelectorAll('.list-item').forEach((item) => {
      const id = item.dataset.id;
      item.querySelector('[data-act="open"]').onclick = () => router.navigate('museum/detail/' + id);
      item.querySelector('[data-act="menu"]').onclick = (e) => {
        e.stopPropagation();
        this.showMenu(id);
      };
    });
  },

  showMenu(id) {
    const body = `
      <div class="choice-grid">
        <button class="choice" data-act="edit">✏️ 编辑</button>
        <button class="choice" data-act="del" style="color:var(--cinnabar)">🗑 删除</button>
      </div>
    `;
    UI.showSheet('操作', body, (root) => {
      root.querySelector('[data-act="edit"]').onclick = () => {
        UI.hideSheet();
        this.edit(id);
      };
      root.querySelector('[data-act="del"]').onclick = async () => {
        UI.hideSheet();
        if (await UI.confirm('删除这个博物馆项目？所有文物记录也将删除。')) {
          await db.remove(db.STORES.museum, id);
          const relics = await db.query(db.STORES.relic, (r) => r.museumId === id);
          for (const r of relics) await db.remove(db.STORES.relic, r.id);
          this.list();
        }
      };
    });
  },

  edit(id) {
    const isEdit = !!id;
    const body = `
      <div class="form-row">
        <label class="label">博物馆名称</label>
        <input class="field" id="f_name" placeholder="如：故宫博物院" maxlength="30">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">所在城市</label>
          <input class="field" id="f_loc" placeholder="如：北京" maxlength="20">
        </div>
        <div>
          <label class="label">参观日期</label>
          <input class="field" id="f_date" type="date">
        </div>
      </div>
      <div class="form-row">
        <label class="label">备注</label>
        <textarea class="field" id="f_note" placeholder="参观感受、印象深刻的展厅..." maxlength="200"></textarea>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="f_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="f_save">${isEdit ? '保存' : '新建项目'}</button>
      </div>
    `;
    UI.showSheet(isEdit ? '编辑博物馆' : '新建博物馆项目', body, (root) => {
      let loaded = false;
      const self = this;

      // 先同步绑定事件
      root.querySelector('#f_save').onclick = async () => {
        if (isEdit && !loaded) {
          UI.toast('数据加载中，请稍候');
          return;
        }
        const name = root.querySelector('#f_name').value.trim();
        if (!name) {
          UI.toast('请输入博物馆名称');
          return;
        }
        const payload = {
          name,
          location: root.querySelector('#f_loc').value.trim(),
          visitDate: root.querySelector('#f_date').value,
          note: root.querySelector('#f_note').value.trim()
        };
        if (isEdit) {
          const m = await db.get(db.STORES.museum, id);
          Object.assign(m, payload);
          await db.put(db.STORES.museum, m);
        } else {
          await db.add(db.STORES.museum, payload);
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已新建');
        self.list();
      };
      const cancelBtn = root.querySelector('#f_cancel');
      if (cancelBtn) cancelBtn.onclick = () => UI.hideSheet();

      // 再异步加载编辑数据
      (async () => {
        if (isEdit) {
          try {
            const m = await db.get(db.STORES.museum, id);
            if (!m) {
              UI.toast('未找到该博物馆');
              UI.hideSheet();
              return;
            }
            root.querySelector('#f_name').value = m.name || '';
            root.querySelector('#f_loc').value = m.location || '';
            root.querySelector('#f_date').value = m.visitDate || '';
            root.querySelector('#f_note').value = m.note || '';
            loaded = true;
          } catch (err) {
            console.error('加载博物馆失败', err);
            UI.toast('加载失败：' + (err && err.message ? err.message : err));
            UI.hideSheet();
          }
        } else {
          loaded = true;
        }
      })();
    });
  },

  /* 朝代排序表（按历史先后顺序） */
  dynastyOrder: [
    '石器时代', '新石器时代', '夏', '商', '西周', '东周', '春秋', '战国',
    '秦', '西汉', '汉', '东汉', '三国', '魏晋', '南北朝', '隋', '唐',
    '五代', '十国', '北宋', '辽', '南宋', '金', '元', '明', '清', '民国', '近代', '现代', '当代'
  ],

  getDynastyOrder(dynasty) {
    if (!dynasty) return 999;
    // 处理类似"明代"、"唐朝"等带朝代字的写法
    const cleaned = dynasty.replace(/[朝代时期]/g, '').trim();
    const idx = this.dynastyOrder.findIndex((d) => d.includes(cleaned));
    return idx === -1 ? 999 : idx;
  },

  groupRelicsByDynasty(relics) {
    const withDynasty = relics.filter((r) => r.dynasty && r.dynasty.trim());
    const noDynasty = relics.filter((r) => !r.dynasty || !r.dynasty.trim());
    const groups = {};
    withDynasty.forEach((r) => {
      const d = r.dynasty.trim();
      if (!groups[d]) groups[d] = [];
      groups[d].push(r);
    });
    const sorted = Object.entries(groups).sort(
      ([d1], [d2]) => this.getDynastyOrder(d1) - this.getDynastyOrder(d2)
    );
    if (noDynasty.length > 0) sorted.push(['未分类', noDynasty]);
    return sorted;
  },

  renderDynastyTimeline(groups) {
    if (groups.length === 0) {
      return `<div class="empty" style="padding:24px 0;"><div class="emoji" style="font-size:32px;">⏳</div><div class="hint">为文物填入「年代」后，这里将生成朝代时间轴</div></div>`;
    }
    return groups
      .map(([dynasty, relics]) => `
        <div class="tl-era">
          <div class="tl-name">${dynasty} <span class="tl-count">${relics.length} 件</span></div>
          <div class="tl-relics">
            ${relics
              .map(
                (r) => `
              <div class="tl-relic" data-id="${r.id}">
                <div class="tl-relic-img-wrap">
                  <img src="${r.image}" class="tl-relic-img" alt="${r.name || '文物'}">
                </div>
                <div class="tl-relic-name">${r.name || '未识别'}</div>
              </div>`
              )
              .join('')}
          </div>
        </div>
      `)
      .join('');
  },

  async detail(id) {
    App.setActiveNav('museum');
    const m = await db.get(db.STORES.museum, id);
    if (!m) return router.navigate('museum');
    const main = document.getElementById('appMain');
    App.setFab(() => this.addRelic(id));

    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" data-act="back">‹ 返回</button>
        <div class="card" style="padding:16px;margin-bottom:14px;">
          <div class="tape" style="top:-8px;left:20px;background:var(--tape-green);"></div>
          <h2 style="font-family:var(--font-display);font-size:24px;color:var(--ink)">${m.name}</h2>
          ${m.location ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:4px">📍 ${m.location}</div>` : ''}
          ${m.visitDate ? `<div style="font-size:12px;color:var(--ink-mute);margin-top:4px">📅 参观于 ${m.visitDate}</div>` : ''}
          ${m.note ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:10px;line-height:1.6">${m.note}</div>` : ''}
        </div>

        <div class="section-title">⏳ 朝代时间轴</div>
        <div class="timeline" id="dynastyTimeline"></div>

        <div class="section-title">
          🏺 文物掠影
          <span id="relicShareToggle" style="float:right;font-size:12px;color:var(--forest);cursor:pointer;font-weight:400;">🖼 生成分享图</span>
        </div>
        <div id="shareSelectBar" style="display:none;margin-bottom:12px;">
          <div class="card" style="padding:12px;display:flex;align-items:center;gap:10px;">
            <span id="shareSelectCount" style="font-size:13px;color:var(--ink-soft);flex:1;">已选 0 件</span>
            <button class="btn btn-ghost" id="shareSelectCancel" style="font-size:12px;padding:6px 14px;">取消</button>
            <button class="btn btn-primary" id="shareSelectGen" style="font-size:12px;padding:6px 14px;">生成分享图</button>
          </div>
        </div>
        <div id="relicList"></div>
      </div>
    `;

    main.querySelector('[data-act="back"]').onclick = () => router.navigate('museum');
    this._shareMode = false;
    this._shareSelected = new Set();
    main.querySelector('#relicShareToggle').onclick = () => this._enterShareMode(id, m);
    this.renderRelics(id, m);
  },

  /* 进入选择模式 */
  _enterShareMode(museumId, museum) {
    this._shareMode = true;
    this._shareSelected = new Set();
    document.getElementById('shareSelectBar').style.display = 'block';
    document.getElementById('relicShareToggle').style.display = 'none';
    this.renderRelics(museumId, museum);
  },

  /* 退出选择模式 */
  _exitShareMode(museumId, museum) {
    this._shareMode = false;
    this._shareSelected = new Set();
    const bar = document.getElementById('shareSelectBar');
    if (bar) bar.style.display = 'none';
    const toggle = document.getElementById('relicShareToggle');
    if (toggle) toggle.style.display = '';
    this.renderRelics(museumId, museum);
  },

  /* 更新选择计数 */
  _updateShareCount() {
    const el = document.getElementById('shareSelectCount');
    if (el) el.textContent = `已选 ${this._shareSelected.size} 件`;
  },

  async renderRelics(museumId, museum) {
    const relics = await db.query(db.STORES.relic, (r) => r.museumId === museumId);
    relics.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // 渲染朝代时间轴
    const timelineEl = document.getElementById('dynastyTimeline');
    if (timelineEl) {
      const groups = this.groupRelicsByDynasty(relics);
      timelineEl.innerHTML = this.renderDynastyTimeline(groups);
      timelineEl.querySelectorAll('.tl-relic').forEach((el) => {
        el.onclick = () => {
          const rid = el.dataset.id;
          const relic = relics.find((r) => r.id == rid);
          if (relic) this.showRelicPreview(relic, museum);
        };
      });
    }

    const el = document.getElementById('relicList');

    if (relics.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">📷</div><div class="hint">点击 + 上传第一张文物照片</div></div>`;
      return;
    }

    el.innerHTML = relics
      .map(
        (r) => `
      <div class="relic-card ${this._shareMode ? 'selectable' : ''} ${this._shareSelected.has(String(r.id)) ? 'selected' : ''}" data-id="${r.id}">
        ${this._shareMode ? `<div class="rc-checkmark ${this._shareSelected.has(String(r.id)) ? 'checked' : ''}">${this._shareSelected.has(String(r.id)) ? '✓' : ''}</div>` : ''}
        ${r.image ? `<img class="rc-img" src="${r.image}" alt="${r.name || '文物'}">` : '<div class="rc-img" style="display:flex;align-items:center;justify-content:center;background:var(--paper-deep);font-size:36px;">🏺</div>'}
        <div class="rc-body">
          <div class="rc-name">
            ${r.name || '<span style="color:var(--ink-mute);font-size:13px">未命名文物</span>'}
          </div>
          ${r.dynasty ? `<div class="rc-meta">年代：${r.dynasty}</div>` : ''}
          ${r.desc ? `<div class="rc-desc">${r.desc}</div>` : ''}
          ${this._shareMode ? '' : `<div style="display:flex;gap:6px;margin-top:10px;">
            <button class="btn btn-ghost" data-act="edit" style="flex:1;font-size:12px;padding:7px;">✏️ 编辑</button>
            <button class="btn btn-ghost" data-act="del" style="flex:1;font-size:12px;padding:7px;color:var(--rust)">删除</button>
          </div>`}
        </div>
      </div>`
      )
      .join('');

    el.querySelectorAll('.relic-card').forEach((card) => {
      const rid = card.dataset.id;

      if (this._shareMode) {
        // 选择模式：点击切换选中
        card.onclick = (e) => {
          e.stopPropagation();
          if (this._shareSelected.has(rid)) {
            this._shareSelected.delete(rid);
          } else {
            this._shareSelected.add(rid);
          }
          this._updateShareCount();
          // 局部更新这张卡片
          card.classList.toggle('selected', this._shareSelected.has(rid));
          const check = card.querySelector('.rc-checkmark');
          if (check) {
            check.classList.toggle('checked', this._shareSelected.has(rid));
            check.textContent = this._shareSelected.has(rid) ? '✓' : '';
          }
        };
      } else {
        card.querySelector('[data-act="edit"]').onclick = () => this.editRelic(rid, museum);
        card.querySelector('[data-act="del"]').onclick = async () => {
          if (await UI.confirm('删除这件文物记录？')) {
            await db.remove(db.STORES.relic, rid);
            this.renderRelics(museumId, museum);
          }
        };
      }
    });

    // 绑定选择栏按钮
    const cancelBtn = document.getElementById('shareSelectCancel');
    const genBtn = document.getElementById('shareSelectGen');
    if (cancelBtn) cancelBtn.onclick = () => this._exitShareMode(museumId, museum);
    if (genBtn) genBtn.onclick = () => this._generateShareImages(museumId, museum);
  },

  /* 文物预览（时间轴点击） */
  showRelicPreview(relic, museum) {
    const body = `
      <div style="text-align:center;margin-bottom:12px;">
        ${relic.image ? `<img src="${relic.image}" style="max-width:100%;border-radius:8px;border:1px solid var(--ink-line);">` : '<div style="font-size:48px;padding:20px;">🏺</div>'}
      </div>
      <div style="font-family:var(--font-display);font-size:20px;color:var(--ink);margin-bottom:6px;">${relic.name || '未识别文物'}</div>
      ${relic.dynasty ? `<div class="chip green" style="margin-bottom:8px;">📅 ${relic.dynasty}</div>` : ''}
      ${museum ? `<div style="font-size:12px;color:var(--ink-mute);margin-bottom:10px;">🏛️ ${museum.name}</div>` : ''}
      ${relic.desc ? `<div style="font-size:13px;color:var(--ink-soft);line-height:1.7;padding:10px;background:var(--paper-deep);border-radius:8px;">${relic.desc}</div>` : '<div style="font-size:12px;color:var(--ink-mute);">暂无简介</div>'}
      <div class="form-actions" style="margin-top:16px;">
        <button class="btn btn-ghost" id="pvClose">关闭</button>
        <button class="btn btn-primary" id="pvEdit">✏️ 编辑</button>
      </div>
    `;
    UI.showSheet('文物详情', body, (root) => {
      root.querySelector('#pvClose').onclick = () => UI.hideSheet();
      root.querySelector('#pvEdit').onclick = () => {
        UI.hideSheet();
        this.editRelic(relic.id, museum);
      };
    });
  },

  async addRelic(museumId) {
    const museum = await db.get(db.STORES.museum, museumId);
    const body = `
      <div class="form-row">
        <label class="label">文物照片</label>
        <div class="img-grid" id="relicImgGrid">
          <div class="upload-trigger" id="relicImgAdd">＋<span>上传照片</span></div>
        </div>
      </div>
      <div class="form-row">
        <label class="label">图片说明文字（可选）</label>
        <textarea class="field" id="r_ocrtext" rows="3" placeholder="粘贴展板/介绍牌上的文字，AI 将自动识别文物名称、朝代和简介"></textarea>
        <div style="font-size:11px;color:var(--ink-mute);margin-top:4px">💡 填入说明文字后点击下方「自动识别」按钮</div>
      </div>
      <div class="form-row">
        <label class="label">文物名称</label>
        <input class="field" id="r_name" placeholder="如：青花缠枝莲纹梅瓶">
      </div>
      <div class="form-row">
        <label class="label">年代 / 朝代</label>
        <input class="field" id="r_dyn" placeholder="如：明永乐">
      </div>
      <div class="form-row">
        <label class="label">文物简介</label>
        <textarea class="field" id="r_desc" rows="4" placeholder="文物历史背景、特点、用途..."></textarea>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <button class="btn btn-outline" id="r_aiocr" style="flex:1;font-size:13px;">🔍 自动识别文字</button>
        <button class="btn btn-outline" id="r_aisearch" style="flex:1;font-size:13px;">🌐 AI 联网搜索</button>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="r_cancel">取消</button>
        <button class="btn btn-primary" id="r_save">保存文物</button>
      </div>
      <div id="r_status"></div>
    `;
    UI.showSheet('🏺 添加文物', body, (root) => {
      let imageData = '';

      const renderImg = () => {
        const grid = root.querySelector('#relicImgGrid');
        if (imageData) {
          grid.innerHTML = `
            <div class="img-cell">
              <img src="${imageData}" alt="文物">
              <button class="del" id="relicImgDel">✕</button>
            </div>
          `;
          root.querySelector('#relicImgDel').onclick = () => {
            imageData = '';
            renderImg();
          };
        } else {
          grid.innerHTML = '<div class="upload-trigger" id="relicImgAdd">＋<span>上传照片</span></div>';
          root.querySelector('#relicImgAdd').onclick = async () => {
            const img = await UI.pickImage();
            if (img) {
              imageData = img;
              renderImg();
            }
          };
        }
      };
      renderImg();

      // 自动识别：从说明文字中提取文物名称、朝代、简介
      root.querySelector('#r_aiocr').onclick = async () => {
        const ocrText = root.querySelector('#r_ocrtext').value.trim();
        if (!ocrText) {
          UI.toast('请先在「图片说明文字」中填入展板文字');
          return;
        }
        const status = root.querySelector('#r_status');
        status.innerHTML = `<div class="ai-bubble loading">正在从文字中识别文物信息...</div>`;

        const result = await AI.extractRelicFromText(ocrText, museum.name);
        status.innerHTML = '';

        if (result.name && !root.querySelector('#r_name').value.trim()) {
          root.querySelector('#r_name').value = result.name;
        }
        if (result.dynasty && !root.querySelector('#r_dyn').value.trim()) {
          root.querySelector('#r_dyn').value = result.dynasty;
        }
        if (result.desc && !root.querySelector('#r_desc').value.trim()) {
          root.querySelector('#r_desc').value = result.desc;
        }
        UI.toast(result.name ? '识别完成，请核对' : '未能自动识别，请手动填写');
      };

      // AI 联网搜索：根据名称搜索文物介绍
      root.querySelector('#r_aisearch').onclick = async () => {
        const name = root.querySelector('#r_name').value.trim();
        if (!name) {
          UI.toast('请先输入文物名称');
          return;
        }
        const status = root.querySelector('#r_status');
        status.innerHTML = `<div class="ai-bubble loading">正在联网搜索「${name}」...</div>`;

        const result = await AI.searchRelicOnline(name, museum.name);
        status.innerHTML = '';

        if (result.desc) {
          root.querySelector('#r_desc').value = root.querySelector('#r_desc').value || result.desc;
        }
        if (result.dynasty) {
          root.querySelector('#r_dyn').value = root.querySelector('#r_dyn').value || result.dynasty;
        }
        if (result.desc || result.dynasty) {
          UI.toast('搜索完成，信息已填入');
        } else {
          status.innerHTML = `<div class="ai-bubble">💡 未找到相关信息，请手动填写或前往设置配置在线 AI。</div>`;
        }
      };

      root.querySelector('#r_cancel').onclick = () => UI.hideSheet();

      root.querySelector('#r_save').onclick = async () => {
        const name = root.querySelector('#r_name').value.trim();
        const dynasty = root.querySelector('#r_dyn').value.trim();
        const desc = root.querySelector('#r_desc').value.trim();

        if (!imageData && !name && !desc) {
          UI.toast('请至少上传照片或填写文物信息');
          return;
        }

        await db.add(db.STORES.relic, {
          museumId,
          image: imageData || '',
          name,
          dynasty,
          desc
        });
        UI.hideSheet();
        UI.toast('文物已添加');
        this.renderRelics(museumId, museum);
      };
    });
  },

  async recognizeRelic(relicId, museum, isAuto) {
    const relic = await db.get(db.STORES.relic, relicId);
    if (!relic) return;

    const body = `
      <div style="text-align:center;margin-bottom:14px;">
        <img src="${relic.image}" style="max-width:100%;border-radius:8px;margin-bottom:8px;">
        <div style="font-size:13px;color:var(--ink-mute)">${museum.name} · 文物识别</div>
      </div>
      <div id="recogStatus" class="ai-bubble loading">正在识别文物，请稍候</div>
      <div id="recogForm" style="display:none;">
        <div class="form-row">
          <label class="label">文物名称</label>
          <input class="field" id="r_name" placeholder="如：青花瓷瓶">
        </div>
        <div class="form-row">
          <label class="label">年代（可选）</label>
          <input class="field" id="r_dyn" placeholder="如：明代">
        </div>
        <div class="form-row">
          <label class="label">文物简介</label>
          <textarea class="field" id="r_desc" rows="4" placeholder="文物历史背景、特点..."></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" id="r_cancel">取消</button>
          <button class="btn btn-primary" id="r_save">保存</button>
        </div>
      </div>
    `;
    UI.showSheet('🤖 AI 文物识别', body, async (root) => {
      const status = root.querySelector('#recogStatus');
      const form = root.querySelector('#recogForm');
      const nameInput = root.querySelector('#r_name');
      const dynInput = root.querySelector('#r_dyn');
      const descInput = root.querySelector('#r_desc');

      // 预填已有信息
      nameInput.value = relic.name || '';
      dynInput.value = relic.dynasty || '';
      descInput.value = relic.desc || '';

      // 调用 AI 识别
      const result = await AI.recognizeRelic(relic.image, museum.name);
      status.style.display = 'none';
      form.style.display = 'block';

      if (result.name) nameInput.value = nameInput.value || result.name;
      if (result.desc) descInput.value = descInput.value || result.desc;
      if (result.dynasty) dynInput.value = dynInput.value || result.dynasty;

      if (result.hint && !result.name) {
        status.style.display = 'block';
        status.classList.remove('loading');
        status.innerHTML = '💡 ' + result.hint;
      } else if (result.name) {
        UI.toast('AI 识别完成，请核对');
      }

      root.querySelector('#r_save').onclick = async () => {
        relic.name = nameInput.value.trim();
        relic.dynasty = dynInput.value.trim();
        relic.desc = descInput.value.trim();
        await db.put(db.STORES.relic, relic);
        UI.hideSheet();
        UI.toast('已保存文物信息');
        const m = await db.get(db.STORES.museum, relic.museumId);
        this.renderRelics(relic.museumId, m);
      };
      root.querySelector('#r_cancel').onclick = () => UI.hideSheet();
    });
  },

  async editRelic(relicId, museum) {
    const relic = await db.get(db.STORES.relic, relicId);
    if (!relic) return;

    const body = `
      <div class="form-row">
        <label class="label">文物照片</label>
        <div class="img-grid" id="relicImgGrid"></div>
      </div>
      <div class="form-row">
        <label class="label">图片说明文字（可选）</label>
        <textarea class="field" id="r_ocrtext" rows="3" placeholder="粘贴展板/介绍牌上的文字，AI 将自动识别文物名称、朝代和简介"></textarea>
      </div>
      <div class="form-row">
        <label class="label">文物名称</label>
        <input class="field" id="r_name" placeholder="如：青花缠枝莲纹梅瓶" value="${relic.name || ''}">
      </div>
      <div class="form-row">
        <label class="label">年代 / 朝代</label>
        <input class="field" id="r_dyn" placeholder="如：明永乐" value="${relic.dynasty || ''}">
      </div>
      <div class="form-row">
        <label class="label">文物简介</label>
        <textarea class="field" id="r_desc" rows="4" placeholder="文物历史背景、特点、用途...">${relic.desc || ''}</textarea>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <button class="btn btn-outline" id="r_aiocr" style="flex:1;font-size:13px;">🔍 自动识别文字</button>
        <button class="btn btn-outline" id="r_aisearch" style="flex:1;font-size:13px;">🌐 AI 联网搜索</button>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="r_cancel">取消</button>
        <button class="btn btn-primary" id="r_save">保存</button>
      </div>
      <div id="r_status"></div>
    `;
    UI.showSheet('✏️ 编辑文物', body, (root) => {
      let imageData = relic.image || '';

      const renderImg = () => {
        const grid = root.querySelector('#relicImgGrid');
        if (imageData) {
          grid.innerHTML = `
            <div class="img-cell">
              <img src="${imageData}" alt="文物">
              <button class="del" id="relicImgDel">✕</button>
            </div>
            <div class="upload-trigger" id="relicImgChange">🔄<span>换图</span></div>
          `;
          root.querySelector('#relicImgDel').onclick = () => {
            imageData = '';
            renderImg();
          };
          root.querySelector('#relicImgChange').onclick = async () => {
            const img = await UI.pickImage();
            if (img) {
              imageData = img;
              renderImg();
            }
          };
        } else {
          grid.innerHTML = '<div class="upload-trigger" id="relicImgAdd">＋<span>上传照片</span></div>';
          root.querySelector('#relicImgAdd').onclick = async () => {
            const img = await UI.pickImage();
            if (img) {
              imageData = img;
              renderImg();
            }
          };
        }
      };
      renderImg();

      // 自动识别
      root.querySelector('#r_aiocr').onclick = async () => {
        const ocrText = root.querySelector('#r_ocrtext').value.trim();
        if (!ocrText) {
          UI.toast('请先在「图片说明文字」中填入展板文字');
          return;
        }
        const status = root.querySelector('#r_status');
        status.innerHTML = `<div class="ai-bubble loading">正在从文字中识别文物信息...</div>`;
        const result = await AI.extractRelicFromText(ocrText, museum.name);
        status.innerHTML = '';
        if (result.name) root.querySelector('#r_name').value = result.name;
        if (result.dynasty) root.querySelector('#r_dyn').value = result.dynasty;
        if (result.desc) root.querySelector('#r_desc').value = result.desc;
        UI.toast(result.name ? '识别完成，请核对' : '未能自动识别，请手动填写');
      };

      // AI 联网搜索
      root.querySelector('#r_aisearch').onclick = async () => {
        const name = root.querySelector('#r_name').value.trim();
        if (!name) {
          UI.toast('请先输入文物名称');
          return;
        }
        const status = root.querySelector('#r_status');
        status.innerHTML = `<div class="ai-bubble loading">正在联网搜索「${name}」...</div>`;
        const result = await AI.searchRelicOnline(name, museum.name);
        status.innerHTML = '';
        if (result.desc) root.querySelector('#r_desc').value = result.desc;
        if (result.dynasty) root.querySelector('#r_dyn').value = root.querySelector('#r_dyn').value || result.dynasty;
        if (result.desc || result.dynasty) {
          UI.toast('搜索完成，信息已填入');
        } else {
          status.innerHTML = `<div class="ai-bubble">💡 未找到相关信息，请手动填写或前往设置配置在线 AI。</div>`;
        }
      };

      root.querySelector('#r_cancel').onclick = () => UI.hideSheet();
      root.querySelector('#r_save').onclick = async () => {
        relic.name = root.querySelector('#r_name').value.trim();
        relic.dynasty = root.querySelector('#r_dyn').value.trim();
        relic.desc = root.querySelector('#r_desc').value.trim();
        relic.image = imageData;
        await db.put(db.STORES.relic, relic);
        UI.hideSheet();
        UI.toast('已保存');
        this.renderRelics(relic.museumId, museum);
      };
    });
  },

  /* ============================================
     生成文物分享图（3:4）
     ============================================ */

  async _generateShareImages(museumId, museum) {
    if (this._shareSelected.size === 0) {
      UI.toast('请选择至少 1 件文物');
      return;
    }

    const allRelics = await db.query(db.STORES.relic, (r) => r.museumId === museumId);
    const selectedRelics = allRelics.filter((r) => this._shareSelected.has(String(r.id)));

    UI.toast('正在生成分享图...');

    // 逐个生成
    const images = [];
    for (const relic of selectedRelics) {
      try {
        const dataUrl = await this._renderShareCanvas(relic, museum);
        images.push({ relic, dataUrl });
      } catch (e) {
        console.warn('生成失败:', relic.name, e.message);
      }
    }

    if (images.length === 0) {
      UI.toast('生成失败，请重试');
      return;
    }

    // 退出选择模式
    this._exitShareMode(museumId, museum);

    // 显示预览
    this._showSharePreview(images);
  },

 /* 在 Canvas 上绘制 3:4 分享图 — 样式A：深色古典竖排摄影型 */
  _renderShareCanvas(relic, museum) {
    return new Promise(async (resolve, reject) => {
      try {
        const W = 900;
        const H = 1200;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        // ━━━ 配色 ━━━
        const GOLD = '#d4b25a';
        const GOLD_BRIGHT = '#e8cc7a';
        const GOLD_SOFT = 'rgba(212,178,90,0.55)';
        const GOLD_FAINT = 'rgba(212,178,90,0.3)';
        const GREEN_DEEP = '#16291a';
        const TEXT_LIGHT = '#e8dcc0';
        const TEXT_DESC = '#c8b888';

        // ━━━ 背景：深墨绿渐变 ━━━
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#0f1f12');
        bgGrad.addColorStop(0.4, '#1a2f1a');
        bgGrad.addColorStop(1, '#0d1a0f');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // ━━━ 背景纹理：隐约斑驳 ━━━
        ctx.save();
        ctx.globalAlpha = 0.025;
        for (let i = 0; i < 60; i++) {
          const x = Math.random() * W;
          const y = Math.random() * H;
          const r = Math.random() * 50 + 20;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, GOLD);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // ━━━ 布局参数 ━━━
        const PAD = 56;
        const name = relic.name || '未命名文物';
        const nameChars = name.split('');

        // ━━━ 顶部品牌栏 ━━━
        ctx.fillStyle = GOLD;
        this._roundRect(ctx, PAD, 44, 32, 32, 5);
        ctx.fill();
        ctx.fillStyle = GREEN_DEEP;
        ctx.font = 'bold 18px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('雨', PAD + 16, 61);

        ctx.fillStyle = GOLD_SOFT;
        ctx.font = '12px "Noto Serif SC", serif';
        ctx.textAlign = 'left';
        ctx.fillText('今日有雨', PAD + 42, 60);

        // 顶部细线
        ctx.strokeStyle = GOLD_FAINT;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD, 100);
        ctx.lineTo(W - PAD, 100);
        ctx.stroke();

        // ━━━ 文物照片区域 ━━━
        // 照片占据右侧约 62% 宽度，从顶部线下方到底部分隔线上方
        const photoX = W * 0.35;
        const photoY = 120;
        const photoW = W - photoX - PAD + 10;
        const photoH = H * 0.52;

        if (relic.image) {
          const img = await this._loadImage(relic.image);

          // 裁切图片：去掉上下 15% 的边缘（去除展柜台面等杂物）
          const cropTop = 0.12;
          const cropBottom = 0.12;
          const srcX = 0;
          const srcY = img.height * cropTop;
          const srcW = img.width;
          const srcH = img.height * (1 - cropTop - cropBottom);

          // cover 方式缩放
          const scale = Math.max(photoW / srcW, photoH / srcH);
          const drawW = srcW * scale;
          const drawH = srcH * scale;
          const dx = photoX + (photoW - drawW) / 2;
          const dy = photoY + (photoH - drawH) / 2;

          // 绘制照片
          ctx.save();
          ctx.beginPath();
          ctx.rect(photoX, photoY, photoW, photoH);
          ctx.clip();
          ctx.globalAlpha = 0.92;
          ctx.drawImage(img, srcX, srcY, srcW, srcH, dx, dy, drawW, drawH);
          ctx.restore();

          // 左侧渐变遮罩：照片融入背景
          const leftMask = ctx.createLinearGradient(photoX - 20, 0, photoX + 120, 0);
          leftMask.addColorStop(0, GREEN_DEEP);
          leftMask.addColorStop(0.5, 'rgba(22,41,26,0.7)');
          leftMask.addColorStop(1, 'rgba(22,41,26,0)');
          ctx.fillStyle = leftMask;
          ctx.fillRect(photoX - 20, photoY, 140, photoH);

          // 底部渐变遮罩
          const bottomMask = ctx.createLinearGradient(0, photoY + photoH - 100, 0, photoY + photoH);
          bottomMask.addColorStop(0, 'rgba(15,31,18,0)');
          bottomMask.addColorStop(1, 'rgba(15,31,18,0.85)');
          ctx.fillStyle = bottomMask;
          ctx.fillRect(photoX, photoY + photoH - 100, photoW, 100);

          // 右侧渐变遮罩
          const rightMask = ctx.createLinearGradient(photoX + photoW - 60, 0, photoX + photoW, 0);
          rightMask.addColorStop(0, 'rgba(15,31,18,0)');
          rightMask.addColorStop(1, 'rgba(15,31,18,0.6)');
          ctx.fillStyle = rightMask;
          ctx.fillRect(photoX + photoW - 60, photoY, 60, photoH);
        } else {
          ctx.fillStyle = GOLD_FAINT;
          ctx.font = '60px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🏺', photoX + photoW / 2, photoY + photoH / 2);
        }

        // ━━━ 竖排文物名（左侧）━━━
        const vCenterX = 80;
        const nameFontSize = nameChars.length > 8 ? 30 : 36;
        const nameLineH = nameFontSize + 10;
        const vStartY = 140;
        const vMaxH = photoY + photoH - vStartY - 20;

        ctx.fillStyle = GOLD_BRIGHT;
        ctx.font = `bold ${nameFontSize}px "Noto Serif SC", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // 如果名字太长，缩小字号
        let actualFontSize = nameFontSize;
        while (nameChars.length * (actualFontSize + 10) > vMaxH && actualFontSize > 22) {
          actualFontSize -= 2;
        }
        const actualLineH = actualFontSize + 10;
        ctx.font = `bold ${actualFontSize}px "Noto Serif SC", serif`;

        let vY = vStartY;
        for (const char of nameChars) {
          ctx.fillText(char, vCenterX, vY);
          vY += actualLineH;
        }

        // 拼音（竖排小字，文物名右侧）
        const pinyin = this._toPinyin(name);
        if (pinyin) {
          ctx.fillStyle = GOLD_FAINT;
          ctx.font = '10px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          let pY = vStartY + 2;
          for (const word of pinyin.split(' ')) {
            ctx.fillText(word, vCenterX + actualFontSize + 6, pY);
            pY += 14;
          }
        }

        // ━━━ 朝代标签（照片下方，横排小标签）━━━
        const dynastyY = photoY + photoH + 24;
        if (relic.dynasty) {
          // 朝代简称大字 + 全称
          let dynastyShort = relic.dynasty;
          const dynastyMap = {
            '新石器': '石', '夏': '夏', '商': '商', '西周': '周', '东周': '周',
            '春秋': '秋', '战国': '战', '秦': '秦', '西汉': '汉', '东汉': '汉',
            '三国': '三', '魏晋': '晋', '南北朝': '朝', '隋': '隋', '唐': '唐',
            '五代': '五', '北宋': '宋', '南宋': '宋', '辽': '辽', '金': '金',
            '元': '元', '明': '明', '清': '清', '民国': '民'
          };
          for (const key in dynastyMap) {
            if (relic.dynasty.startsWith(key)) {
              dynastyShort = dynastyMap[key];
              break;
            }
          }

          // 大号朝代字（水印效果，左下角）
          ctx.save();
          ctx.globalAlpha = 0.1;
          ctx.fillStyle = GOLD;
          ctx.font = 'bold 120px "Noto Serif SC", serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(dynastyShort, PAD - 10, H * 0.68);
          ctx.restore();

          // 朝代标签
          ctx.fillStyle = GOLD;
          ctx.font = 'bold 15px "Noto Serif SC", serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(relic.dynasty, PAD, dynastyY);

          // 标签后竖线
          const dynastyW = ctx.measureText(relic.dynasty).width;
          ctx.strokeStyle = GOLD_FAINT;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD + dynastyW + 12, dynastyY - 8);
          ctx.lineTo(PAD + dynastyW + 12, dynastyY + 8);
          ctx.stroke();
        }

        // ━━━ 文物简介（底部，高对比度）━━━
        const descY = dynastyY + 28;
        if (relic.desc) {
          ctx.fillStyle = TEXT_DESC;
          ctx.font = '14px "Noto Serif SC", serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 2;
          const descLines = this._wrapText(ctx, relic.desc, W - PAD * 2, 4);
          descLines.forEach((line, i) => {
            ctx.fillText(line, PAD, descY + i * 24);
          });
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        // ━━━ 底部分隔线 ━━━
        ctx.strokeStyle = GOLD_FAINT;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD, H - 76);
        ctx.lineTo(W - PAD, H - 76);
        ctx.stroke();

        // ━━━ 底部信息栏 ━━━
        const footerY = H - 48;
        ctx.textBaseline = 'middle';

        // 左：博物馆名
        ctx.fillStyle = TEXT_LIGHT;
        ctx.font = '13px "Noto Serif SC", serif';
        ctx.textAlign = 'left';
        const museumInfo = `${museum.name || '博物馆'}${museum.location ? ' · ' + museum.location : ''}`;
        ctx.fillText(museumInfo, PAD, footerY);

        // 左下：参观日期
        ctx.fillStyle = GOLD_FAINT;
        ctx.font = '11px "Noto Serif SC", serif';
        const dateStr = museum.visitDate || UI.formatDate(Date.now());
        ctx.fillText(dateStr, PAD, footerY + 20);

        // 右：品牌印章
        ctx.fillStyle = GOLD;
        this._roundRect(ctx, W - PAD - 22, footerY - 10, 20, 20, 3);
        ctx.fill();
        ctx.fillStyle = GREEN_DEEP;
        ctx.font = 'bold 12px "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText('雨', W - PAD - 12, footerY);

        ctx.fillStyle = GOLD_FAINT;
        ctx.font = '11px "Noto Serif SC", serif';
        ctx.textAlign = 'right';
        ctx.fillText('今日有雨 · 文物留痕', W - PAD - 30, footerY);

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (e) {
        reject(e);
      }
    });
  },

  /* 简易拼音转换（常用文物字） */
  _toPinyin(text) {
    const map = {
      '青': 'qīng', '花': 'huā', '梅': 'méi', '瓶': 'píng', '瓷': 'cí',
      '鼎': 'dǐng', '尊': 'zūn', '壶': 'hú', '碗': 'wǎn', '盘': 'pán',
      '镜': 'jìng', '剑': 'jiàn', '玉': 'yù', '璧': 'bì', '环': 'huán',
      '佩': 'pèi', '冠': 'guān', '簪': 'zān', '钗': 'chāi', '镯': 'zhuó',
      '秘': 'mì', '色': 'sè', '莲': 'lián', '缠': 'chán', '枝': 'zhī',
      '纹': 'wén', '釉': 'yòu', '红': 'hóng', '蓝': 'lán', '白': 'bái',
      '黑': 'hēi', '绿': 'lǜ', '黄': 'huáng', '紫': 'zǐ', '金': 'jīn',
      '银': 'yín', '铜': 'tóng', '铁': 'tiě', '石': 'shí', '木': 'mù',
      '漆': 'qī', '丝': 'sī', '绸': 'chóu', '缎': 'duàn', '锦': 'jǐn',
      '书': 'shū', '画': 'huà', '卷': 'juǎn', '册': 'cè', '帖': 'tiè',
      '砚': 'yàn', '墨': 'mò', '笔': 'bǐ', '纸': 'zhǐ', '扇': 'shàn',
      '冠': 'guān', '袍': 'páo', '裳': 'cháng', '履': 'lǚ', '靴': 'xuē',
      '簋': 'guǐ', '罍': 'léi', '觚': 'gū', '爵': 'jué', '斝': 'jiǎ',
      '甗': 'yǎn', '鬲': 'lì', '豆': 'dòu', '铺': 'pù', '鉴': 'jiàn',
      '编': 'biān', '钟': 'zhōng', '磬': 'qìng', '鼓': 'gǔ', '琴': 'qín',
      '瑟': 'sè', '笙': 'shēng', '埙': 'xūn', '篪': 'chí',
      '佛': 'fó', '塔': 'tǎ', '经': 'jīng', '像': 'xiàng',
      '俑': 'yǒng', '马': 'mǎ', '牛': 'niú', '羊': 'yáng', '虎': 'hǔ',
      '龙': 'lóng', '凤': 'fèng', '雀': 'què', '龟': 'guī', '蛇': 'shé',
      '鱼': 'yú', '鸟': 'niǎo', '兽': 'shòu', '麟': 'lín', '鹤': 'hè',
      '彩': 'cǎi', '绘': 'huì', '雕': 'diāo', '刻': 'kè', '塑': 'sù',
      '鎏': 'liú', '嵌': 'qiàn', '镶': 'xiāng', '错': 'cuò',
      '未': 'wèi', '命': 'mìng', '名': 'míng', '文': 'wén', '物': 'wù'
    };
    const result = [];
    for (const char of text) {
      if (map[char]) {
        result.push(map[char]);
      }
    }
    return result.join(' ');
  },

  /* 加载图片（支持 dataURL 和普通 URL） */
  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  },

  /* 圆角矩形路径 */
  _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  /* 文本换行 */
  _wrapText(ctx, text, maxWidth, maxLines = 99) {
    const lines = [];
    let current = '';

    for (const char of text) {
      const test = current + char;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = char;
        if (lines.length >= maxLines - 1) break;
      } else {
        current = test;
      }
    }

    if (current) {
      // 如果已经达到最大行数，最后一行加省略号
      if (lines.length >= maxLines - 1 && ctx.measureText(current).width > maxWidth) {
        while (ctx.measureText(current + '...').width > maxWidth && current.length > 0) {
          current = current.slice(0, -1);
        }
        current += '...';
      }
      lines.push(current);
    }

    return lines.slice(0, maxLines);
  },

  /* 分享图预览界面 */
  _showSharePreview(images) {
    let currentIdx = 0;

    const renderPreview = (root) => {
      const { relic, dataUrl } = images[currentIdx];
      root.querySelector('#spImage').src = dataUrl;
      root.querySelector('#spName').textContent = relic.name || '未命名文物';
      root.querySelector('#spCounter').textContent = `${currentIdx + 1} / ${images.length}`;
      root.querySelector('#spPrev').style.opacity = currentIdx > 0 ? '1' : '0.3';
      root.querySelector('#spPrev').style.pointerEvents = currentIdx > 0 ? 'auto' : 'none';
      root.querySelector('#spNext').style.opacity = currentIdx < images.length - 1 ? '1' : '0.3';
      root.querySelector('#spNext').style.pointerEvents = currentIdx < images.length - 1 ? 'auto' : 'none';
    };

    const body = `
      <div style="text-align:center;margin-bottom:12px;">
        <span id="spName" style="font-family:var(--font-display);font-size:16px;color:var(--ink);"></span>
        <span id="spCounter" style="font-size:12px;color:var(--ink-mute);margin-left:8px;"></span>
      </div>
      <div style="position:relative;margin-bottom:14px;">
        <img id="spImage" style="width:100%;border-radius:8px;border:1px solid var(--ink-line);aspect-ratio:3/4;object-fit:cover;" alt="分享图预览">
        <button id="spPrev" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.85);border:1px solid var(--ink-line);font-size:16px;cursor:pointer;">‹</button>
        <button id="spNext" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.85);border:1px solid var(--ink-line);font-size:16px;cursor:pointer;">›</button>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="spClose" style="flex:1;">关闭</button>
        <button class="btn btn-ghost" id="spSaveAll" style="flex:1;">📥 全部保存</button>
        <button class="btn btn-primary" id="spSave" style="flex:1;">保存当前</button>
      </div>
    `;

    UI.showSheet('🖼 分享图预览', body, (root) => {
      renderPreview(root);

      root.querySelector('#spPrev').onclick = () => {
        if (currentIdx > 0) { currentIdx--; renderPreview(root); }
      };
      root.querySelector('#spNext').onclick = () => {
        if (currentIdx < images.length - 1) { currentIdx++; renderPreview(root); }
      };

      root.querySelector('#spClose').onclick = () => UI.hideSheet();

      // 保存当前
      root.querySelector('#spSave').onclick = async () => {
        const { relic, dataUrl } = images[currentIdx];
        await this._saveShareImage(dataUrl, relic.name || '文物');
      };

      // 全部保存
      root.querySelector('#spSaveAll').onclick = async () => {
        UI.toast(`正在保存 ${images.length} 张...`);
        for (let i = 0; i < images.length; i++) {
          const { relic, dataUrl } = images[i];
          await this._saveShareImage(dataUrl, relic.name || '文物', true);
          if (i < images.length - 1) await new Promise(r => setTimeout(r, 600));
        }
        UI.toast(`已保存 ${images.length} 张分享图`);
      };
    });
  },

  /* 保存分享图到相册/下载 */
  async _saveShareImage(dataUrl, name, silent = false) {
    try {
      const resp = await fetch(dataUrl);
      const blob = await resp.blob();
      const fileName = `${name}_${Date.now()}.jpg`;

      // 优先使用 Web Share API
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: name });
          return;
        }
      }

      // 降级为下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (!silent) UI.toast('已下载');
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('保存失败:', e);
        if (!silent) UI.toast('保存失败，请重试');
      }
    }
  }
};

router.register('museum', () => Museum.list());
router.register('museum/*', (param) => {
  const [action, id] = param.split('/');
  if (action === 'detail' && id) Museum.detail(id);
  else Museum.list();
});
