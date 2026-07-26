/* ============================================
   旅游清单模块 v2
   - 想去的地方（待去清单，可上传图片）
   - 已去的地方（旅行手账，可导出PDF）
   - 足迹地图（可视化展示）
   ============================================ */

const Travel = {
  async list() {
    App.setActiveNav('more');
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="fade-up">
        <div class="tabs" id="tTabs">
          <div class="tab active" data-filter="todo">想去</div>
          <div class="tab" data-filter="done">已去</div>
          <div class="tab" data-filter="map">足迹</div>
          <div class="tab" data-filter="all">全部</div>
        </div>
        <div id="travelList"></div>
      </div>
    `;
    App.setFab(() => this.edit());

    let filter = 'todo';
    const refresh = async () => {
      let all = await db.all(db.STORES.travel);
      all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      const el = document.getElementById('travelList');

      if (filter === 'map') {
        App.setFab(null);
        await this.renderFootprintMap(el, all);
        return;
      }

      let display = all;
      if (filter === 'todo') display = all.filter((t) => !t.done);
      if (filter === 'done') display = all.filter((t) => t.done);

      if (display.length === 0) {
        const hints = {
          todo: '点击 + 添加一个想去的远方',
          done: '还没有已去的地方，标记一个想去的地方为已去吧',
          all: '点击 + 添加一个想去的远方'
        };
        el.innerHTML = `<div class="empty"><div class="emoji">✈️</div><div class="hint">${hints[filter]}</div></div>`;
        return;
      }
      el.innerHTML = display
        .map(
          (t) => `
        <div class="list-item" data-id="${t.id}">
          ${t.photos?.length ? `<img src="${t.photos[0]}" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;margin-bottom:10px;">` : ''}
          <div class="li-row">
            <button class="check ${t.done ? 'done' : ''}" data-act="toggle">✓</button>
            <div style="flex:1" data-act="open">
              <div class="li-title">${t.name}</div>
              ${t.location ? `<div class="li-sub">📍 ${t.location}</div>` : ''}
              <div class="li-tags">
                ${t.season ? `<span class="chip blue">🌤 ${t.season}</span>` : ''}
                ${t.done ? '<span class="chip green">已去</span>' : '<span class="chip">想去</span>'}
                ${t.photos?.length ? `<span class="chip yellow">📷 ${t.photos.length}</span>` : ''}
                ${t.done && t.journal?.length ? `<span class="chip green">📖 手账 ${t.journal.length} 篇</span>` : ''}
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

    document.querySelectorAll('#tTabs .tab').forEach((tab) => {
      tab.onclick = () => {
        document.querySelectorAll('#tTabs .tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        filter = tab.dataset.filter;
        refresh();
      };
    });
    refresh();
  },

  /* 渲染足迹地图 */
  async renderFootprintMap(el, all) {
    const visited = all.filter((t) => t.done);
    const wishlist = all.filter((t) => !t.done);

    el.innerHTML = `
      <div class="footprint-stats">
        <div class="fs-item">
          <div class="fs-num" style="color:var(--forest)">${visited.length}</div>
          <div class="fs-label">已踏足</div>
        </div>
        <div class="fs-divider"></div>
        <div class="fs-item">
          <div class="fs-num" style="color:var(--gold)">${wishlist.length}</div>
          <div class="fs-label">待探索</div>
        </div>
        <div class="fs-divider"></div>
        <div class="fs-item">
          <div class="fs-num">${all.length}</div>
          <div class="fs-label">总目的地</div>
        </div>
      </div>

      <div class="section-title">🗺️ 足迹地图</div>
      <div class="footprint-map" id="footprintMap">
        <div class="fm-bg">
          <div class="fm-grid"></div>
          <div class="fm-continent"></div>
        </div>
        <div class="fm-pins" id="fmPins"></div>
      </div>

      ${visited.length > 0 ? `
        <div class="section-title">✅ 已踏足之地</div>
        <div class="footprint-list">
          ${visited
            .map(
              (t) => `
            <div class="fp-item visited" data-id="${t.id}">
              ${t.photos?.length ? `<img src="${t.photos[0]}" class="fp-img">` : '<div class="fp-img placeholder">📷</div>'}
              <div class="fp-info">
                <div class="fp-name">${t.name}</div>
                <div class="fp-loc">${t.location || ''} · ${t.doneDate || ''}</div>
                ${t.journal?.length ? `<div class="fp-journal">📖 ${t.journal.length} 篇手账</div>` : ''}
              </div>
            </div>`
            )
            .join('')}
        </div>` : ''}

      ${wishlist.length > 0 ? `
        <div class="section-title">🌅 待去清单</div>
        <div class="footprint-list">
          ${wishlist
            .map(
              (t) => `
            <div class="fp-item wishlist" data-id="${t.id}">
              ${t.photos?.length ? `<img src="${t.photos[0]}" class="fp-img">` : '<div class="fp-img placeholder">🗺️</div>'}
              <div class="fp-info">
                <div class="fp-name">${t.name}</div>
                <div class="fp-loc">${t.location || ''}${t.season ? ' · ' + t.season : ''}</div>
              </div>
            </div>`
            )
            .join('')}
        </div>` : ''}
    `;

    // 生成地图上的标记点
    const pinsContainer = el.querySelector('#fmPins');
    all.forEach((t, i) => {
      // 伪随机分布位置
      const seed = (t.id || '').charCodeAt(0) || i;
      const x = 15 + ((seed * 37) % 70);
      const y = 20 + ((seed * 53) % 60);
      const pin = document.createElement('div');
      pin.className = `fm-pin ${t.done ? 'visited' : 'wishlist'}`;
      pin.style.left = x + '%';
      pin.style.top = y + '%';
      pin.innerHTML = `<span class="fm-pin-icon">${t.done ? '📍' : '📌'}</span><span class="fm-pin-label">${t.name}</span>`;
      pin.onclick = () => this.detail(t.id);
      pinsContainer.appendChild(pin);
    });

    // 列表项点击
    el.querySelectorAll('.fp-item').forEach((item) => {
      item.onclick = () => this.detail(item.dataset.id);
    });
  },

  async toggle(id) {
    const t = await db.get(db.STORES.travel, id);
    t.done = !t.done;
    if (t.done) t.doneDate = UI.todayStr();
    await db.put(db.STORES.travel, t);
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
        if (await UI.confirm('删除这个旅游目的地？')) {
          await db.remove(db.STORES.travel, id);
          this.list();
        }
      };
    });
  },

  edit(id) {
    const isEdit = !!id;
    const body = `
      <div class="form-row">
        <label class="label">目的地</label>
        <input class="field" id="f_name" placeholder="如：京都" maxlength="30">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">位置</label>
          <input class="field" id="f_loc" placeholder="如：日本关西" maxlength="30">
        </div>
        <div>
          <label class="label">最佳季节</label>
          <select class="field" id="f_season">
            <option value="">不限</option>
            <option>🌸 春</option>
            <option>☀️ 夏</option>
            <option>🍂 秋</option>
            <option>❄️ 冬</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label class="label">想做的事 / 攻略</label>
        <textarea class="field" id="f_note" placeholder="必去景点、美食、注意事项..." maxlength="300"></textarea>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="f_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="f_save">${isEdit ? '保存' : '添加'}</button>
      </div>`;
    UI.showSheet(isEdit ? '编辑目的地' : '新建目的地', body, async (root) => {
      if (isEdit) {
        const t = await db.get(db.STORES.travel, id);
        root.querySelector('#f_name').value = t.name || '';
        root.querySelector('#f_loc').value = t.location || '';
        root.querySelector('#f_season').value = t.season || '';
        root.querySelector('#f_note').value = t.note || '';
      }
      root.querySelector('#f_save').onclick = async () => {
        const name = root.querySelector('#f_name').value.trim();
        if (!name) return UI.toast('请输入目的地');
        const payload = {
          name,
          location: root.querySelector('#f_loc').value.trim(),
          season: root.querySelector('#f_season').value,
          note: root.querySelector('#f_note').value.trim()
        };
        if (isEdit) {
          const t = await db.get(db.STORES.travel, id);
          Object.assign(t, payload);
          await db.put(db.STORES.travel, t);
        } else {
          await db.add(db.STORES.travel, { ...payload, done: false, photos: [] });
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加');
        this.list();
      };
      if (isEdit) root.querySelector('#f_cancel').onclick = () => UI.hideSheet();
    });
  },

  async detail(id) {
    const t = await db.get(db.STORES.travel, id);
    if (!t) return router.navigate('travel');
    App.setActiveNav('more');
    App.setFab(() => this.addPhoto(id));
    const main = document.getElementById('appMain');
    const journal = t.journal || [];
    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" data-act="back">‹ 返回</button>
        <div class="card" style="padding:16px;margin-bottom:14px;">
          <div class="tape blue" style="top:-8px;left:20px;"></div>
          <h2 style="font-family:var(--font-display);font-size:22px;">${t.name}</h2>
          <div class="li-tags" style="margin-top:8px">
            ${t.location ? `<span class="chip">📍 ${t.location}</span>` : ''}
            ${t.season ? `<span class="chip blue">${t.season}</span>` : ''}
            ${t.done ? `<span class="chip green">✓ 已去 ${t.doneDate || ''}</span>` : '<span class="chip">想去</span>'}
          </div>
          ${t.note ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:10px;line-height:1.6;">${t.note}</div>` : ''}
          <button class="btn ${t.done ? 'btn-ghost' : 'btn-primary'}" id="toggleBtn" style="width:100%;margin-top:14px;">
            ${t.done ? '↩️ 标记为未去' : '✓ 标记为已去'}
          </button>
        </div>
        <div class="section-title">📷 风景照片（${t.photos?.length || 0}）</div>
        <div class="img-grid" id="photoGrid"></div>

        ${t.done ? `
          <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
            <span>📖 旅行手账（${journal.length}）</span>
            ${journal.length > 0 ? '<button class="btn btn-jade" id="exportPdf" style="font-size:11px;padding:6px 12px;">📄 导出PDF</button>' : ''}
          </div>
          <div id="journalList"></div>
          <button class="btn btn-outline" id="addJournal" style="width:100%;margin-top:10px;">✍️ 写一篇手账</button>
        ` : ''}
      </div>
    `;
    main.querySelector('[data-act="back"]').onclick = () => router.navigate('travel');
    main.querySelector('#toggleBtn').onclick = async () => {
      t.done = !t.done;
      if (t.done) t.doneDate = UI.todayStr();
      await db.put(db.STORES.travel, t);
      this.detail(id);
    };
    this.renderPhotos(t);

    // 旅行手账
    if (t.done) {
      this.renderJournal(t);
      main.querySelector('#addJournal').onclick = () => this.addJournal(id);
      if (journal.length > 0) {
        main.querySelector('#exportPdf').onclick = () => this.exportJournalPdf(t);
      }
    }
  },

  /* 渲染旅行手账列表 */
  renderJournal(t) {
    const el = document.getElementById('journalList');
    const journal = t.journal || [];
    if (journal.length === 0) {
      el.innerHTML = `<div class="empty" style="padding:20px;"><div class="emoji" style="font-size:36px">📖</div><div class="hint">记录旅途中的故事，导出为PDF留念</div></div>`;
      return;
    }
    el.innerHTML = journal
      .map(
        (j, i) => `
      <div class="journal-item">
        <div class="ji-head">
          <span class="ji-date">${j.date}</span>
          <div>
            <button class="icon-btn" data-act="edit-j" data-i="${i}" style="width:28px;height:28px;font-size:12px">✏️</button>
            <button class="icon-btn" data-act="del-j" data-i="${i}" style="width:28px;height:28px;font-size:12px">🗑</button>
          </div>
        </div>
        <div class="ji-title">${j.title}</div>
        <div class="ji-body">${(j.content || '').replace(/\n/g, '<br>')}</div>
        ${j.photos?.length ? `<div class="ji-photos">${j.photos.map((p) => `<img src="${p}" class="ji-photo">`).join('')}</div>` : ''}
        <div class="ji-footer">
          ${j.weather ? `<span class="chip blue">🌤 ${j.weather}</span>` : ''}
          ${j.mood ? `<span class="chip yellow">${j.mood}</span>` : ''}
        </div>
      </div>`
      )
      .join('');

    el.querySelectorAll('[data-act="edit-j"]').forEach((b) => {
      b.onclick = () => this.addJournal(t.id, +b.dataset.i);
    });
    el.querySelectorAll('[data-act="del-j"]').forEach((b) => {
      b.onclick = async () => {
        if (await UI.confirm('删除这篇手账？')) {
          t.journal.splice(+b.dataset.i, 1);
          await db.put(db.STORES.travel, t);
          this.renderJournal(t);
          UI.toast('已删除');
        }
      };
    });
  },

  /* 添加/编辑旅行手账 */
  async addJournal(id, editIndex) {
    const t = await db.get(db.STORES.travel, id);
    const isEdit = editIndex !== undefined;
    const existing = isEdit ? t.journal[editIndex] : null;
    const today = UI.todayStr();

    const body = `
      <div class="form-row">
        <label class="label">手账标题</label>
        <input class="field" id="j_title" placeholder="如：漫步古都的清晨" maxlength="30" value="${existing?.title || ''}">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">日期</label>
          <input class="field" id="j_date" type="date" value="${existing?.date || today}">
        </div>
        <div>
          <label class="label">天气</label>
          <select class="field" id="j_weather">
            <option value="">不限</option>
            <option value="☀️ 晴" ${existing?.weather === '☀️ 晴' ? 'selected' : ''}>☀️ 晴</option>
            <option value="⛅ 多云" ${existing?.weather === '⛅ 多云' ? 'selected' : ''}>⛅ 多云</option>
            <option value="🌧️ 雨" ${existing?.weather === '🌧️ 雨' ? 'selected' : ''}>🌧️ 雨</option>
            <option value="❄️ 雪" ${existing?.weather === '❄️ 雪' ? 'selected' : ''}>❄️ 雪</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label class="label">心情</label>
        <select class="field" id="j_mood">
          <option value="">不限</option>
          <option value="😊 开心" ${existing?.mood === '😊 开心' ? 'selected' : ''}>😊 开心</option>
          <option value="😌 放松" ${existing?.mood === '😌 放松' ? 'selected' : ''}>😌 放松</option>
          <option value="🤩 惊喜" ${existing?.mood === '🤩 惊喜' ? 'selected' : ''}>🤩 惊喜</option>
          <option value="🥰 感动" ${existing?.mood === '🥰 感动' ? 'selected' : ''}>🥰 感动</option>
          <option value="😴 疲惫" ${existing?.mood === '😴 疲惫' ? 'selected' : ''}>😴 疲惫</option>
        </select>
      </div>
      <div class="form-row">
        <label class="label">手账内容</label>
        <textarea class="field" id="j_content" placeholder="记录旅途中的所见所感..." rows="5" maxlength="1000">${existing?.content || ''}</textarea>
      </div>
      <div class="form-row">
        <label class="label">配图（可选）</label>
        <div class="img-grid" id="j_photoGrid">
          <div class="upload-trigger" id="j_addPhoto">＋<span>添加配图</span></div>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="j_cancel">取消</button>
        <button class="btn btn-primary" id="j_save">${isEdit ? '保存' : '发布手账'}</button>
      </div>
    `;

    UI.showSheet(isEdit ? '编辑手账' : '写旅行手账', body, (root) => {
      let photos = [...(existing?.photos || [])];
      const renderPhotos = () => {
        const grid = root.querySelector('#j_photoGrid');
        const addBtn = '<div class="upload-trigger" id="j_addPhoto">＋<span>添加配图</span></div>';
        grid.innerHTML =
          photos
            .map(
              (p, i) => `
          <div class="img-cell">
            <img src="${p}" alt="配图">
            <button class="del" data-i="${i}">✕</button>
          </div>`
            )
            .join('') + addBtn;
        grid.querySelectorAll('.del').forEach((d) => {
          d.onclick = () => {
            photos.splice(+d.dataset.i, 1);
            renderPhotos();
          };
        });
        root.querySelector('#j_addPhoto').onclick = async () => {
          const imgs = await UI.pickImages(6);
          photos.push(...imgs);
          renderPhotos();
        };
      };
      renderPhotos();

      root.querySelector('#j_save').onclick = async () => {
        const title = root.querySelector('#j_title').value.trim();
        if (!title) return UI.toast('请输入手账标题');
        const entry = {
          title,
          date: root.querySelector('#j_date').value,
          weather: root.querySelector('#j_weather').value,
          mood: root.querySelector('#j_mood').value,
          content: root.querySelector('#j_content').value.trim(),
          photos
        };
        t.journal = t.journal || [];
        if (isEdit) {
          t.journal[editIndex] = entry;
        } else {
          t.journal.push(entry);
        }
        await db.put(db.STORES.travel, t);
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '手账已发布');
        this.renderJournal(t);
      };
      root.querySelector('#j_cancel').onclick = () => UI.hideSheet();
    });
  },

  /* 导出旅行手账为 PDF（使用打印功能） */
  async exportJournalPdf(t) {
    const journal = t.journal || [];
    if (journal.length === 0) return UI.toast('暂无手账内容');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return UI.toast('请允许弹窗以导出PDF');

    const photosHtml = (photos) => {
      if (!photos || !photos.length) return '';
      return `<div class="journal-photos">${photos.map((p) => `<img src="${p}" class="journal-photo">`).join('')}</div>`;
    };

    const content = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${t.name} - 旅行手账</title>
<style>
  @page { margin: 20mm 15mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Serif SC', 'Songti SC', serif; color: #1f2a1c; line-height: 1.8; background: #f7f8f5; }
  .cover { text-align: center; padding: 80px 40px; background: linear-gradient(135deg, #2f4a28 0%, #1f3520 100%); color: #fbfcfa; page-break-after: always; border-radius: 0; }
  .cover-title { font-size: 42px; font-weight: 700; letter-spacing: 4px; margin-bottom: 16px; }
  .cover-sub { font-size: 16px; opacity: 0.8; margin-bottom: 30px; }
  .cover-meta { font-size: 13px; opacity: 0.6; }
  .cover-deco { width: 60px; height: 2px; background: #b8923a; margin: 20px auto; }
  .content { padding: 20px 40px; }
  .journal-entry { margin-bottom: 40px; padding: 24px; background: #fff; border: 1px solid #d8ddd5; border-radius: 8px; page-break-inside: avoid; box-shadow: 0 2px 8px rgba(47,74,40,0.06); }
  .entry-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e8efe4; padding-bottom: 10px; margin-bottom: 14px; }
  .entry-date { font-size: 13px; color: #5a7a52; font-weight: 600; }
  .entry-title { font-size: 20px; font-weight: 700; color: #2f4a28; margin-bottom: 8px; }
  .entry-meta { font-size: 12px; color: #8a9588; margin-bottom: 12px; }
  .entry-meta span { margin-right: 12px; }
  .entry-body { font-size: 14px; color: #4a5848; line-height: 1.9; white-space: pre-wrap; }
  .journal-photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 14px; }
  .journal-photo { width: 100%; height: 120px; object-fit: cover; border-radius: 6px; border: 1px solid #d8ddd5; }
  .footer { text-align: center; padding: 20px; font-size: 11px; color: #8a9588; border-top: 1px solid #d8ddd5; margin-top: 30px; }
</style>
</head>
<body>
  <div class="cover">
    <div class="cover-title">${t.name}</div>
    <div class="cover-deco"></div>
    <div class="cover-sub">旅行手账</div>
    <div class="cover-meta">
      ${t.location ? '📍 ' + t.location + '<br>' : ''}
      ${t.doneDate ? '出行时间：' + t.doneDate + '<br>' : ''}
      共 ${journal.length} 篇手账<br>
      导出日期：${UI.todayStr()}
    </div>
  </div>
  <div class="content">
    ${t.note ? `<div style="background:#e8efe4;padding:16px;border-radius:8px;margin-bottom:30px;font-size:13px;color:#2f4a28;"><b>旅行笔记：</b>${t.note}</div>` : ''}
    ${journal
      .map(
        (j) => `
      <div class="journal-entry">
        <div class="entry-header">
          <div class="entry-date">📅 ${j.date}</div>
          ${j.mood ? `<div style="font-size:12px;color:#b8923a">${j.mood}</div>` : ''}
        </div>
        <div class="entry-title">${j.title}</div>
        <div class="entry-meta">
          ${j.weather ? '<span>🌤 ' + j.weather + '</span>' : ''}
        </div>
        <div class="entry-body">${(j.content || '').replace(/\n/g, '<br>')}</div>
        ${photosHtml(j.photos)}
      </div>`
      )
      .join('')}
  </div>
  <div class="footer">今日有雨 · 旅行手账 · ${t.name}</div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 500); };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    UI.toast('正在生成PDF，请在弹窗中选择「另存为PDF」');
  },

  async renderPhotos(t) {
    const el = document.getElementById('photoGrid');
    const photos = t.photos || [];
    el.innerHTML =
      photos
        .map(
          (p, i) => `
        <div class="img-cell">
          <img src="${p}" alt="风景">
          <button class="del" data-i="${i}">✕</button>
        </div>`
        )
        .join('') + `<div class="upload-trigger" id="photoAdd">📷<span>上传</span></div>`;
    el.querySelectorAll('.del').forEach((d) => {
      d.onclick = async () => {
        t.photos.splice(+d.dataset.i, 1);
        await db.put(db.STORES.travel, t);
        this.renderPhotos(t);
      };
    });
    el.querySelector('#photoAdd').onclick = async () => this.addPhoto(t.id);
  },

  async addPhoto(id) {
    const t = await db.get(db.STORES.travel, id);
    const imgs = await UI.pickImages(9);
    if (!imgs.length) return;
    t.photos = [...(t.photos || []), ...imgs];
    await db.put(db.STORES.travel, t);
    this.renderPhotos(t);
    UI.toast('已上传 ' + imgs.length + ' 张照片');
  }
};

router.register('travel', () => Travel.list());
