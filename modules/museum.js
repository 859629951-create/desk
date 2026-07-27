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

        <div class="section-title">🏺 文物掠影</div>
        <div id="relicList"></div>
      </div>
    `;

    main.querySelector('[data-act="back"]').onclick = () => router.navigate('museum');
    this.renderRelics(id, m);
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
      <div class="relic-card" data-id="${r.id}">
        ${r.image ? `<img class="rc-img" src="${r.image}" alt="${r.name || '文物'}">` : '<div class="rc-img" style="display:flex;align-items:center;justify-content:center;background:var(--paper-deep);font-size:36px;">🏺</div>'}
        <div class="rc-body">
          <div class="rc-name">
            ${r.name || '<span style="color:var(--ink-mute);font-size:13px">未命名文物</span>'}
          </div>
          ${r.dynasty ? `<div class="rc-meta">年代：${r.dynasty}</div>` : ''}
          ${r.desc ? `<div class="rc-desc">${r.desc}</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:10px;">
            <button class="btn btn-ghost" data-act="edit" style="flex:1;font-size:12px;padding:7px;">✏️ 编辑</button>
            <button class="btn btn-ghost" data-act="del" style="flex:1;font-size:12px;padding:7px;color:var(--rust)">删除</button>
          </div>
        </div>
      </div>`
      )
      .join('');

    el.querySelectorAll('.relic-card').forEach((card) => {
      const rid = card.dataset.id;
      card.querySelector('[data-act="edit"]').onclick = () => this.editRelic(rid, museum);
      card.querySelector('[data-act="del"]').onclick = async () => {
        if (await UI.confirm('删除这件文物记录？')) {
          await db.remove(db.STORES.relic, rid);
          this.renderRelics(museumId, museum);
        }
      };
    });
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
  }
};

router.register('museum', () => Museum.list());
router.register('museum/*', (param) => {
  const [action, id] = param.split('/');
  if (action === 'detail' && id) Museum.detail(id);
  else Museum.list();
});
