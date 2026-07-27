/* ============================================
   学习中心 v4
   - 语言：多邻国打卡 + 自定义语言科目（英语/法语等）+ 学习任务记录
   - 阅读：读书计划 + 文献阅读任务/PDF上传
   - 研究生：论文进度 + 课程表（学期/当前周）+ 上课记录 + 思维导图
   - 每日新闻热点：DeepSeek API 每天 10 条
   ============================================ */

const StudyCenter = {
  tabs: [
    { key: 'language', label: '语言', icon: '🌍' },
    { key: 'reading', label: '阅读', icon: '📚' },
    { key: 'graduate', label: '研究生', icon: '🎓' },
    { key: 'news', label: '新闻', icon: '📰' }
  ],

  currentTab: 'language',

  async list() {
    App.setActiveNav('study');
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="fade-up">
        <div class="sc-header">
          <div class="sc-title-row">
            <h2 class="sc-title">学习中心</h2>
            <span class="sc-sub">日积月累 · 终有所成</span>
          </div>
        </div>
        <div class="tabs tabs-scroll" id="scTabs">
          ${this.tabs.map(t => `<div class="tab ${t.key === this.currentTab ? 'active' : ''}" data-tab="${t.key}">${t.icon} ${t.label}</div>`).join('')}
        </div>
        <div id="scContent"></div>
      </div>
    `;

    document.querySelectorAll('#scTabs .tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('#scTabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        this.renderTab(this.currentTab);
      };
    });

    this.renderTab(this.currentTab);
  },

  renderTab(tab) {
    if (tab === 'language') this.renderLanguage();
    else if (tab === 'reading') this.renderReading();
    else if (tab === 'graduate') this.renderGraduate();
    else if (tab === 'news') this.renderNews();
  },

  /* 返回某个 Tab（修复详情页覆盖 appMain 后 scContent 丢失的问题） */
  goBack(tab) {
    this.currentTab = tab;
    this.list();
  },

  /* ====== 语言板块 ====== */
  async renderLanguage() {
    const el = document.getElementById('scContent');
    App.setFab(() => this.addLanguageSubject());

    // 多邻国今日打卡状态
    const duolingoLogs = await db.all(db.STORES.duolingo);
    const today = UI.todayStr();
    const checkedToday = duolingoLogs.some(d => d.date === today);
    // 连续打卡
    const dates = new Set(duolingoLogs.map(d => d.date));
    let streak = 0;
    const d = new Date();
    if (!dates.has(UI.formatDate(d.getTime()))) d.setDate(d.getDate() - 1);
    while (dates.has(UI.formatDate(d.getTime()))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }

    // 语言科目
    const subjects = await db.all(db.STORES.languageSubject);
    subjects.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    // 各科目今日学习统计
    const allLogs = await db.all(db.STORES.languageLog);
    const todayLogs = allLogs.filter(l => l.date === today);

    el.innerHTML = `
      <!-- 多邻国打卡大按钮 -->
      <div class="sc-duolingo-card ${checkedToday ? 'done' : ''}" id="duolingoBtn">
        <div class="sc-dl-icon">${checkedToday ? '✅' : '🦉'}</div>
        <div class="sc-dl-info">
          <div class="sc-dl-title">${checkedToday ? '今日已打卡' : '多邻国打卡'}</div>
          <div class="sc-dl-sub">${checkedToday ? '继续保持！' : '点击记录今日多邻国学习'}</div>
        </div>
        <div class="sc-dl-streak">
          <span class="sc-dl-fire">🔥</span>
          <span class="sc-dl-streak-num">${streak}</span>
        </div>
      </div>

      <!-- 语言科目 -->
      <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>📚 语言科目</span>
        <button class="btn btn-jade" id="addSubject" style="font-size:11px;padding:4px 10px;">＋ 添加科目</button>
      </div>
      <div id="subjectList"></div>
    `;

    // 多邻国打卡按钮
    document.getElementById('duolingoBtn').onclick = async () => {
      if (checkedToday) {
        UI.toast('今日已打卡，明天继续！');
        return;
      }
      await db.add(db.STORES.duolingo, { date: today, type: 'duolingo' });
      UI.toast('🦉 多邻国打卡成功！');
      this.renderLanguage();
    };

    document.getElementById('addSubject').onclick = () => this.addLanguageSubject();
    this.renderLanguageSubjects(subjects, allLogs, todayLogs);
  },

  async renderLanguageSubjects(subjects, allLogs, todayLogs) {
    const el = document.getElementById('subjectList');
    if (!el) return;
    if (subjects.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">🌍</div><div class="hint">添加语言科目（英语、法语、日语等），记录学习进度</div></div>`;
      return;
    }
    el.innerHTML = subjects.map(s => {
      const sLogs = allLogs.filter(l => l.subjectId === s.id);
      const sTodayLogs = todayLogs.filter(l => l.subjectId === s.id);
      const todayMin = sTodayLogs.reduce((a, l) => a + (l.minutes || 0), 0);
      const todayWords = sTodayLogs.reduce((a, l) => a + (l.words || 0), 0);
      return `
        <div class="list-item" data-id="${s.id}" style="margin-bottom:10px;">
          <div class="li-row">
            <span style="font-size:20px">${s.icon || '📖'}</span>
            <div style="flex:1" data-act="open">
              <div class="li-title">${s.name}</div>
              <div class="li-tags">
                ${todayMin > 0 ? `<span class="chip blue">⏱️ 今日${todayMin}分</span>` : ''}
                ${todayWords > 0 ? `<span class="chip green">📝 今日${todayWords}词</span>` : ''}
                <span class="chip gray">${sLogs.length} 条记录</span>
              </div>
            </div>
            <button class="icon-btn" data-act="menu" data-sid="${s.id}" style="width:32px;height:32px;font-size:14px">⋯</button>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button class="btn btn-ghost" data-act="log" data-sid="${s.id}" style="flex:1;font-size:12px;padding:6px;">＋ 记录学习</button>
            <button class="btn btn-ghost" data-act="view" data-sid="${s.id}" style="flex:1;font-size:12px;padding:6px;">📋 查看记录</button>
          </div>
        </div>
      `;
    }).join('');

    el.querySelectorAll('[data-act="menu"]').forEach(b => {
      b.onclick = (e) => { e.stopPropagation(); this.subjectMenu(b.dataset.sid); };
    });
    el.querySelectorAll('[data-act="log"]').forEach(b => {
      b.onclick = (e) => { e.stopPropagation(); this.addLanguageLog(b.dataset.sid); };
    });
    el.querySelectorAll('[data-act="view"]').forEach(b => {
      b.onclick = (e) => { e.stopPropagation(); this.viewLanguageLogs(b.dataset.sid); };
    });
  },

  subjectMenu(id) {
    const body = `
      <div class="choice-grid">
        <button class="choice" data-act="edit">✏️ 编辑</button>
        <button class="choice" data-act="del" style="color:var(--rust)">🗑 删除</button>
      </div>
    `;
    UI.showSheet('科目操作', body, (root) => {
      root.querySelector('[data-act="edit"]').onclick = () => { UI.hideSheet(); this.addLanguageSubject(id); };
      root.querySelector('[data-act="del"]').onclick = async () => {
        UI.hideSheet();
        if (await UI.confirm('删除这个科目？相关学习记录也会删除。')) {
          await db.remove(db.STORES.languageSubject, id);
          const logs = await db.all(db.STORES.languageLog);
          for (const l of logs.filter(l => l.subjectId === id)) {
            await db.remove(db.STORES.languageLog, l.id);
          }
          UI.toast('已删除');
          this.renderLanguage();
        }
      };
    });
  },

  addLanguageSubject(editId) {
    const isEdit = !!editId;
    const icons = ['📖', '🌍', '🇬🇧', '🇫🇷', '🇯🇵', '🇩🇪', '🇪🇸', '🇰🇷', '🇮🇹', '🇷🇺', '🗣️', '✍️'];
    const body = `
      <div class="form-row">
        <label class="label">科目名称</label>
        <input class="field" id="ls_name" placeholder="如：英语、法语、日语" maxlength="20">
      </div>
      <div class="form-row">
        <label class="label">图标</label>
        <div class="sc-color-picker" id="ls_icons">
          ${icons.map((ic, i) => `<label class="sc-cp-item"><input type="radio" name="icon" value="${ic}" ${i === 0 ? 'checked' : ''}><span style="font-size:18px;display:flex;align-items:center;justify-content:center">${ic}</span></label>`).join('')}
        </div>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="ls_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="ls_save">${isEdit ? '保存' : '添加'}</button>
      </div>
    `;
    UI.showSheet(isEdit ? '编辑科目' : '添加语言科目', body, (root) => {
      root.querySelector('#ls_save').onclick = async () => {
        const name = root.querySelector('#ls_name').value.trim();
        if (!name) return UI.toast('请输入科目名称');
        const icon = root.querySelector('#ls_icons input:checked').value;
        if (isEdit) {
          const old = await db.get(db.STORES.languageSubject, editId);
          Object.assign(old, { name, icon });
          await db.put(db.STORES.languageSubject, old);
        } else {
          const all = await db.all(db.STORES.languageSubject);
          await db.add(db.STORES.languageSubject, { name, icon, sortOrder: all.length });
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加');
        this.renderLanguage();
      };
      if (isEdit) {
        (async () => {
          const s = await db.get(db.STORES.languageSubject, editId);
          if (s) {
            root.querySelector('#ls_name').value = s.name || '';
            const radio = root.querySelector(`#ls_icons input[value="${s.icon}"]`);
            if (radio) radio.checked = true;
          }
        })();
      }
    });
  },

  addLanguageLog(subjectId) {
    const today = UI.todayStr();
    const body = `
      <div class="form-row">
        <label class="label">学习类型</label>
        <select class="field" id="ll_type">
          <option value="time">⏱️ 学习时长</option>
          <option value="words">📝 背单词</option>
          <option value="sentence">💬 长难句/语法</option>
          <option value="listening">👂 听力练习</option>
          <option value="speaking">🗣️ 口语练习</option>
          <option value="reading">📖 阅读理解</option>
        </select>
      </div>
      <div class="form-row-2" id="ll_num_row">
        <div>
          <label class="label" id="ll_num_label">学习时长（分钟）</label>
          <input class="field" id="ll_num" type="number" min="0" placeholder="如 45">
        </div>
        <div>
          <label class="label">日期</label>
          <input class="field" id="ll_date" type="date" value="${today}">
        </div>
      </div>
      <div class="form-row">
        <label class="label">备注</label>
        <textarea class="field" id="ll_note" placeholder="学习内容、心得..." maxlength="200"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="ll_cancel">取消</button>
        <button class="btn btn-primary" id="ll_save">添加</button>
      </div>
    `;
    UI.showSheet('记录学习', body, (root) => {
      const typeSel = root.querySelector('#ll_type');
      const numLabel = root.querySelector('#ll_num_label');
      const numInput = root.querySelector('#ll_num');
      const numRow = root.querySelector('#ll_num_row');

      typeSel.onchange = () => {
        if (typeSel.value === 'time') {
          numLabel.textContent = '学习时长（分钟）';
          numInput.placeholder = '如 45';
          numRow.style.display = '';
        } else if (typeSel.value === 'words') {
          numLabel.textContent = '背单词数（个）';
          numInput.placeholder = '如 50';
          numRow.style.display = '';
        } else {
          numRow.style.display = 'none';
        }
      };

      root.querySelector('#ll_cancel').onclick = () => UI.hideSheet();
      root.querySelector('#ll_save').onclick = async () => {
        const type = typeSel.value;
        const date = root.querySelector('#ll_date').value;
        const note = root.querySelector('#ll_note').value.trim();
        const payload = { subjectId, type, date, note };
        if (type === 'time') payload.minutes = parseInt(numInput.value) || 0;
        if (type === 'words') payload.words = parseInt(numInput.value) || 0;
        await db.add(db.STORES.languageLog, payload);
        UI.hideSheet();
        UI.toast('已记录');
        this.renderLanguage();
      };
    });
  },

  async viewLanguageLogs(subjectId) {
    const subject = await db.get(db.STORES.languageSubject, subjectId);
    const logs = await db.all(db.STORES.languageLog);
    const sLogs = logs.filter(l => l.subjectId === subjectId).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const main = document.getElementById('appMain');

    const typeLabels = {
      time: '⏱️ 学习时长', words: '📝 背单词', sentence: '💬 长难句/语法',
      listening: '👂 听力', speaking: '🗣️ 口语', reading: '📖 阅读'
    };

    const totalMin = sLogs.reduce((a, l) => a + (l.minutes || 0), 0);
    const totalWords = sLogs.reduce((a, l) => a + (l.words || 0), 0);

    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" id="vlBack">‹ 返回</button>
        <div class="card" style="padding:16px;margin-bottom:14px;">
          <h2 style="font-family:var(--font-display);font-size:20px;">${subject?.icon || '📖'} ${subject?.name || '科目'}</h2>
          <div class="li-tags" style="margin-top:8px">
            <span class="chip blue">⏱️ ${totalMin} 分钟</span>
            <span class="chip green">📝 ${totalWords} 词</span>
            <span class="chip gray">${sLogs.length} 条记录</span>
          </div>
        </div>
        <div class="section-title">📋 学习记录</div>
        <div id="vlList"></div>
      </div>
    `;
    document.getElementById('vlBack').onclick = () => this.goBack('language');

    const listEl = document.getElementById('vlList');
    if (sLogs.length === 0) {
      listEl.innerHTML = `<div class="empty"><div class="emoji">📖</div><div class="hint">还没有学习记录</div></div>`;
      return;
    }
    listEl.innerHTML = sLogs.map(l => `
      <div class="list-item" data-id="${l.id}">
        <div class="li-row">
          <span style="font-size:16px">${typeLabels[l.type]?.split(' ')[0] || '📖'}</span>
          <div style="flex:1">
            <div class="li-title">${typeLabels[l.type] || '学习'}</div>
            ${l.note ? `<div class="li-sub">${l.note}</div>` : ''}
            <div class="li-tags">
              <span class="chip gray">${l.date}</span>
              ${l.minutes ? `<span class="chip blue">⏱️ ${l.minutes}分</span>` : ''}
              ${l.words ? `<span class="chip green">📝 ${l.words}词</span>` : ''}
            </div>
          </div>
          <button class="icon-btn" data-act="del" data-lid="${l.id}" style="width:28px;height:28px;font-size:12px">✕</button>
        </div>
      </div>
    `).join('');
    listEl.querySelectorAll('[data-act="del"]').forEach(b => {
      b.onclick = async (e) => {
        e.stopPropagation();
        if (await UI.confirm('删除这条记录？')) {
          await db.remove(db.STORES.languageLog, b.dataset.lid);
          this.viewLanguageLogs(subjectId);
        }
      };
    });
  },

  /* ====== 阅读板块 ====== */
  async renderReading() {
    const el = document.getElementById('scContent');
    App.setFab(() => this.addBook());

    const books = await db.all(db.STORES.book);
    books.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const papers = await db.all(db.STORES.paper);
    papers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // 统计
    const reading = books.filter(b => b.status === 'reading').length;
    const done = books.filter(b => b.status === 'done').length;

    el.innerHTML = `
      <div class="sc-stats-row">
        <div class="sc-stat-mini"><span class="n">${books.length}</span><span class="l">读书计划</span></div>
        <div class="sc-stat-mini"><span class="n" style="color:var(--gold)">${reading}</span><span class="l">阅读中</span></div>
        <div class="sc-stat-mini"><span class="n" style="color:var(--forest)">${done}</span><span class="l">已读完</span></div>
        <div class="sc-stat-mini"><span class="n">${papers.length}</span><span class="l">文献任务</span></div>
      </div>

      <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>📚 读书计划</span>
        <button class="btn btn-jade" id="addBookBtn" style="font-size:11px;padding:4px 10px;">＋ 添加</button>
      </div>
      <div id="bookList"></div>

      <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>📄 文献阅读</span>
        <button class="btn btn-jade" id="addPaperBtn" style="font-size:11px;padding:4px 10px;">＋ 添加</button>
      </div>
      <div id="paperList"></div>
    `;

    document.getElementById('addBookBtn').onclick = () => this.addBook();
    document.getElementById('addPaperBtn').onclick = () => this.addPaper();
    this.renderBooks(books);
    this.renderPapers(papers);
  },

  async renderBooks(books) {
    const el = document.getElementById('bookList');
    if (!el) return;
    if (books.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">📚</div><div class="hint">添加一本想读的书吧</div></div>`;
      return;
    }
    const statusMap = {
      'todo': { label: '待读', color: 'gray' },
      'reading': { label: '阅读中', color: 'yellow' },
      'done': { label: '已读完', color: 'green' }
    };
    el.innerHTML = books.map(b => {
      const st = statusMap[b.status] || statusMap['todo'];
      const progress = b.status === 'done' ? 100 : (b.progress || 0);
      return `
        <div class="list-item" data-id="${b.id}">
          <div class="li-row">
            <span style="font-size:18px">📖</span>
            <div style="flex:1" data-act="open">
              <div class="li-title">${b.title}</div>
              ${b.author ? `<div class="li-sub">${b.author}</div>` : ''}
              <div class="li-tags">
                <span class="chip ${st.color}">${st.label}</span>
                ${b.note ? `<span class="chip gray">📝</span>` : ''}
              </div>
              ${b.status !== 'todo' ? `
                <div class="sc-progress-bar">
                  <div class="sc-progress-fill" style="width:${progress}%"></div>
                </div>
              ` : ''}
            </div>
            <button class="icon-btn" data-act="menu" data-bid="${b.id}" style="width:28px;height:28px;font-size:12px">⋯</button>
          </div>
        </div>
      `;
    }).join('');

    el.querySelectorAll('[data-act="open"]').forEach(item => {
      item.onclick = () => this.bookDetail(item.closest('.list-item').dataset.id);
    });
    el.querySelectorAll('[data-act="menu"]').forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation();
        this.bookMenu(b.dataset.bid);
      };
    });
  },

  bookMenu(id) {
    const body = `
      <div class="choice-grid">
        <button class="choice" data-act="edit">✏️ 编辑</button>
        <button class="choice" data-act="note">📝 读书笔记</button>
        <button class="choice" data-act="del" style="color:var(--rust)">🗑 删除</button>
      </div>
    `;
    UI.showSheet('操作', body, (root) => {
      root.querySelector('[data-act="edit"]').onclick = () => { UI.hideSheet(); this.addBook(id); };
      root.querySelector('[data-act="note"]').onclick = () => { UI.hideSheet(); this.bookNotes(id); };
      root.querySelector('[data-act="del"]').onclick = async () => {
        UI.hideSheet();
        if (await UI.confirm('删除这本书？')) {
          await db.remove(db.STORES.book, id);
          this.renderReading();
        }
      };
    });
  },

  addBook(editId) {
    const isEdit = !!editId;
    const body = `
      <div class="form-row">
        <label class="label">书名</label>
        <input class="field" id="bk_title" placeholder="如：百年孤独" maxlength="50">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">作者</label>
          <input class="field" id="bk_author" placeholder="如：加西亚·马尔克斯" maxlength="30">
        </div>
        <div>
          <label class="label">状态</label>
          <select class="field" id="bk_status">
            <option value="todo">📋 待读</option>
            <option value="reading">📖 阅读中</option>
            <option value="done">✅ 已读完</option>
          </select>
        </div>
      </div>
      <div class="form-row" id="bk_progress_row" style="display:none;">
        <label class="label">阅读进度（%）</label>
        <input class="field" id="bk_progress" type="number" min="0" max="100" value="0">
      </div>
      <div class="form-row">
        <label class="label">备注</label>
        <textarea class="field" id="bk_note" placeholder="读后感、要点..." maxlength="300"></textarea>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="bk_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="bk_save">${isEdit ? '保存' : '添加'}</button>
      </div>
    `;
    UI.showSheet(isEdit ? '编辑读书计划' : '添加读书计划', body, (root) => {
      const statusSel = root.querySelector('#bk_status');
      statusSel.onchange = () => {
        root.querySelector('#bk_progress_row').style.display = statusSel.value === 'reading' ? '' : 'none';
      };
      root.querySelector('#bk_save').onclick = async () => {
        const title = root.querySelector('#bk_title').value.trim();
        if (!title) return UI.toast('请输入书名');
        const status = statusSel.value;
        const payload = {
          title,
          author: root.querySelector('#bk_author').value.trim(),
          status,
          progress: status === 'reading' ? parseInt(root.querySelector('#bk_progress').value) || 0 : (status === 'done' ? 100 : 0),
          note: root.querySelector('#bk_note').value.trim()
        };
        if (isEdit) {
          const old = await db.get(db.STORES.book, editId);
          Object.assign(old, payload);
          await db.put(db.STORES.book, old);
        } else {
          await db.add(db.STORES.book, payload);
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加');
        this.renderReading();
      };
      if (isEdit) {
        (async () => {
          const b = await db.get(db.STORES.book, editId);
          if (b) {
            root.querySelector('#bk_title').value = b.title || '';
            root.querySelector('#bk_author').value = b.author || '';
            statusSel.value = b.status || 'todo';
            statusSel.onchange();
            root.querySelector('#bk_progress').value = b.progress || 0;
            root.querySelector('#bk_note').value = b.note || '';
          }
        })();
      }
    });
  },

  async bookDetail(id) {
    const b = await db.get(db.STORES.book, id);
    if (!b) return;
    const notes = await db.query(db.STORES.paperNote, n => n.refId === id);
    const statusMap = { 'todo': '📋 待读', 'reading': '📖 阅读中', 'done': '✅ 已读完' };
    App.setFab(() => this.addBookNote(id, 'book'));
    const main = document.getElementById('appMain');
    const progress = b.status === 'done' ? 100 : (b.progress || 0);
    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" data-act="back">‹ 返回</button>
        <div class="card" style="padding:16px;margin-bottom:14px;">
          <div class="tape green" style="top:-8px;left:20px;"></div>
          <h2 style="font-family:var(--font-display);font-size:22px;">${b.title}</h2>
          ${b.author ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${b.author}</div>` : ''}
          <div class="li-tags" style="margin-top:8px">
            <span class="chip ${b.status === 'done' ? 'green' : b.status === 'reading' ? 'yellow' : 'gray'}">${statusMap[b.status] || '待读'}</span>
          </div>
          ${b.status !== 'todo' ? `
            <div class="sc-progress-bar" style="margin-top:10px;">
              <div class="sc-progress-fill" style="width:${progress}%"></div>
            </div>
            <div style="font-size:11px;color:var(--ink-mute);margin-top:4px;">进度 ${progress}%</div>
          ` : ''}
          ${b.note ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:10px;line-height:1.6;">${b.note}</div>` : ''}
          <button class="btn btn-outline" id="editBook" style="width:100%;margin-top:12px;">✏️ 编辑</button>
        </div>
        <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
          <span>📝 读书笔记（${notes.length}）</span>
          <button class="btn btn-jade" id="addNote" style="font-size:11px;padding:4px 10px;">＋ 添加</button>
        </div>
        <div id="noteList"></div>
      </div>
    `;
    main.querySelector('[data-act="back"]').onclick = () => this.goBack('reading');
    main.querySelector('#editBook').onclick = () => this.addBook(id);
    main.querySelector('#addNote').onclick = () => this.addBookNote(id, 'book');
    this.renderNotes(notes, id, 'book');
  },

  async renderNotes(notes, refId, refType) {
    const el = document.getElementById('noteList');
    if (!el) return;
    if (notes.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">📝</div><div class="hint">还没有笔记，点击 + 添加</div></div>`;
      return;
    }
    notes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    el.innerHTML = notes.map(n => `
      <div class="list-item" data-id="${n.id}">
        <div class="li-row">
          <span style="font-size:16px">${n.fileType === 'pdf' ? '📄' : '📝'}</span>
          <div style="flex:1" data-act="open">
            <div class="li-title">${n.title}</div>
            ${n.content ? `<div class="li-sub">${n.content.substring(0, 80)}${n.content.length > 80 ? '...' : ''}</div>` : ''}
            <div class="li-tags">
              <span class="chip gray">${UI.formatDate(n.createdAt)}</span>
              ${n.fileType === 'pdf' ? '<span class="chip blue">📄 PDF</span>' : '<span class="chip green">📝 文字</span>'}
            </div>
          </div>
          <button class="icon-btn" data-act="del" data-nid="${n.id}" style="width:28px;height:28px;font-size:12px">✕</button>
        </div>
      </div>
    `).join('');
    el.querySelectorAll('[data-act="del"]').forEach(b => {
      b.onclick = async (e) => {
        e.stopPropagation();
        if (await UI.confirm('删除这条笔记？')) {
          await db.remove(db.STORES.paperNote, b.dataset.nid);
          const notes2 = await db.query(db.STORES.paperNote, n => n.refId === refId);
          this.renderNotes(notes2, refId, refType);
        }
      };
    });
  },

  addBookNote(refId, refType) {
    const body = `
      <div class="form-row">
        <label class="label">笔记标题</label>
        <input class="field" id="nt_title" placeholder="如：第三章笔记" maxlength="50">
      </div>
      <div class="form-row">
        <label class="label">笔记内容</label>
        <textarea class="field" id="nt_content" placeholder="输入笔记内容..." rows="5" maxlength="2000"></textarea>
      </div>
      <div class="form-row">
        <label class="label">上传 PDF（可选）</label>
        <input class="field" id="nt_file" type="file" accept=".pdf">
        <div style="font-size:11px;color:var(--ink-mute);margin-top:4px;">可上传已写好的读书笔记 PDF</div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="nt_cancel">取消</button>
        <button class="btn btn-primary" id="nt_save">保存</button>
      </div>
    `;
    UI.showSheet('添加笔记', body, (root) => {
      root.querySelector('#nt_cancel').onclick = () => UI.hideSheet();
      root.querySelector('#nt_save').onclick = async () => {
        const title = root.querySelector('#nt_title').value.trim();
        if (!title) return UI.toast('请输入笔记标题');
        const fileInput = root.querySelector('#nt_file');
        let fileData = null;
        let fileType = 'text';
        if (fileInput.files && fileInput.files[0]) {
          const f = fileInput.files[0];
          if (f.size > 5 * 1024 * 1024) {
            UI.toast('PDF 文件不能超过 5MB');
            return;
          }
          fileData = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(f);
          });
          fileType = 'pdf';
        }
        const content = root.querySelector('#nt_content').value.trim();
        await db.add(db.STORES.paperNote, {
          title, content, fileType,
          fileData: fileData,
          fileName: fileInput.files?.[0]?.name || '',
          refId, refType
        });
        UI.hideSheet();
        UI.toast('笔记已保存');
        if (refType === 'book') {
          const notes = await db.query(db.STORES.paperNote, n => n.refId === refId);
          this.renderNotes(notes, refId, refType);
        } else {
          this.paperDetail(refId);
        }
      };
    });
  },

  /* 文献阅读任务 */
  async renderPapers(papers) {
    const el = document.getElementById('paperList');
    if (!el) return;
    if (papers.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">📄</div><div class="hint">添加一个文献阅读任务</div></div>`;
      return;
    }
    el.innerHTML = papers.map(p => `
      <div class="list-item" data-id="${p.id}">
        <div class="li-row">
          <span style="font-size:16px">📄</span>
          <div style="flex:1" data-act="open">
            <div class="li-title">${p.title}</div>
            ${p.authors ? `<div class="li-sub">${p.authors}</div>` : ''}
            <div class="li-tags">
              <span class="chip ${p.status === 'done' ? 'green' : 'gray'}">${p.status === 'done' ? '✅ 已完成' : '📋 待读'}</span>
              ${p.note ? '<span class="chip blue">📝</span>' : ''}
            </div>
          </div>
          <button class="icon-btn" data-act="menu" data-pid="${p.id}" style="width:28px;height:28px;font-size:12px">⋯</button>
        </div>
      </div>
    `).join('');
    el.querySelectorAll('[data-act="open"]').forEach(item => {
      item.onclick = () => this.paperDetail(item.closest('.list-item').dataset.id);
    });
    el.querySelectorAll('[data-act="menu"]').forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation();
        this.paperMenu(b.dataset.pid);
      };
    });
  },

  paperMenu(id) {
    const body = `
      <div class="choice-grid">
        <button class="choice" data-act="edit">✏️ 编辑</button>
        <button class="choice" data-act="del" style="color:var(--rust)">🗑 删除</button>
      </div>
    `;
    UI.showSheet('操作', body, (root) => {
      root.querySelector('[data-act="edit"]').onclick = () => { UI.hideSheet(); this.addPaper(id); };
      root.querySelector('[data-act="del"]').onclick = async () => {
        UI.hideSheet();
        if (await UI.confirm('删除这个文献任务？')) {
          await db.remove(db.STORES.paper, id);
          this.renderReading();
        }
      };
    });
  },

  addPaper(editId) {
    const isEdit = !!editId;
    const body = `
      <div class="form-row">
        <label class="label">文献标题</label>
        <input class="field" id="pp_title" placeholder="如：论合同解除权的行使" maxlength="80">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">作者</label>
          <input class="field" id="pp_authors" placeholder="如：王泽鉴" maxlength="50">
        </div>
        <div>
          <label class="label">状态</label>
          <select class="field" id="pp_status">
            <option value="todo">📋 待读</option>
            <option value="done">✅ 已完成</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label class="label">备注</label>
        <textarea class="field" id="pp_note" placeholder="文献摘要、重点..." maxlength="300"></textarea>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="pp_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="pp_save">${isEdit ? '保存' : '添加'}</button>
      </div>
    `;
    UI.showSheet(isEdit ? '编辑文献任务' : '添加文献任务', body, (root) => {
      root.querySelector('#pp_save').onclick = async () => {
        const title = root.querySelector('#pp_title').value.trim();
        if (!title) return UI.toast('请输入文献标题');
        const payload = {
          title,
          authors: root.querySelector('#pp_authors').value.trim(),
          status: root.querySelector('#pp_status').value,
          note: root.querySelector('#pp_note').value.trim()
        };
        if (isEdit) {
          const old = await db.get(db.STORES.paper, editId);
          Object.assign(old, payload);
          await db.put(db.STORES.paper, old);
        } else {
          await db.add(db.STORES.paper, payload);
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加');
        this.renderReading();
      };
      if (isEdit) {
        (async () => {
          const p = await db.get(db.STORES.paper, editId);
          if (p) {
            root.querySelector('#pp_title').value = p.title || '';
            root.querySelector('#pp_authors').value = p.authors || '';
            root.querySelector('#pp_status').value = p.status || 'todo';
            root.querySelector('#pp_note').value = p.note || '';
          }
        })();
      }
    });
  },

  async paperDetail(id) {
    const p = await db.get(db.STORES.paper, id);
    if (!p) return;
    const notes = await db.query(db.STORES.paperNote, n => n.refId === id);
    App.setFab(() => this.addBookNote(id, 'paper'));
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" data-act="back">‹ 返回</button>
        <div class="card" style="padding:16px;margin-bottom:14px;">
          <div class="tape gold" style="top:-8px;left:20px;"></div>
          <h2 style="font-family:var(--font-display);font-size:20px;">${p.title}</h2>
          ${p.authors ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${p.authors}</div>` : ''}
          <div class="li-tags" style="margin-top:8px">
            <span class="chip ${p.status === 'done' ? 'green' : 'gray'}">${p.status === 'done' ? '✅ 已完成' : '📋 待读'}</span>
          </div>
          ${p.note ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:10px;line-height:1.6;">${p.note}</div>` : ''}
          <button class="btn btn-outline" id="editPaper" style="width:100%;margin-top:12px;">✏️ 编辑</button>
        </div>
        <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
          <span>📝 文献笔记（${notes.length}）</span>
          <button class="btn btn-jade" id="addNote" style="font-size:11px;padding:4px 10px;">＋ 添加</button>
        </div>
        <div id="noteList"></div>
      </div>
    `;
    main.querySelector('[data-act="back"]').onclick = () => this.goBack('reading');
    main.querySelector('#editPaper').onclick = () => this.addPaper(id);
    main.querySelector('#addNote').onclick = () => this.addBookNote(id, 'paper');
    this.renderNotes(notes, id, 'paper');
  },

  /* ====== 研究生板块 ====== */
  async renderGraduate() {
    const el = document.getElementById('scContent');

    const theses = await db.all(db.STORES.thesis);
    theses.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const courses = await db.all(db.STORES.course);
    const classLogs = await db.all(db.STORES.classLog);
    const mindmaps = await db.all(db.STORES.mindmap);
    mindmaps.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    el.innerHTML = `
      <div class="sc-grad-grid">
        <div class="sc-grad-card" data-act="thesis">
          <div class="sc-gc-icon">📝</div>
          <div class="sc-gc-title">论文进度</div>
          <div class="sc-gc-num">${theses.length}</div>
        </div>
        <div class="sc-grad-card" data-act="course">
          <div class="sc-gc-icon">📅</div>
          <div class="sc-gc-title">课程表</div>
          <div class="sc-gc-num">${courses.length} 门</div>
        </div>
        <div class="sc-grad-card" data-act="classlog">
          <div class="sc-gc-icon">📖</div>
          <div class="sc-gc-title">上课记录</div>
          <div class="sc-gc-num">${classLogs.length}</div>
        </div>
        <div class="sc-grad-card" data-act="mindmap">
          <div class="sc-gc-icon">🧠</div>
          <div class="sc-gc-title">思维导图</div>
          <div class="sc-gc-num">${mindmaps.length}</div>
        </div>
      </div>

      <!-- 论文进度列表 -->
      <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>📝 论文进度</span>
        <button class="btn btn-jade" id="addThesis" style="font-size:11px;padding:4px 10px;">＋ 添加</button>
      </div>
      <div id="thesisList"></div>

      <!-- 思维导图列表 -->
      <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>🧠 思维导图</span>
        <button class="btn btn-jade" id="addMindmap" style="font-size:11px;padding:4px 10px;">＋ 新建</button>
      </div>
      <div id="mindmapList"></div>
    `;

    el.querySelectorAll('.sc-grad-card').forEach(card => {
      card.onclick = () => {
        const act = card.dataset.act;
        if (act === 'thesis') { /* 已显示列表 */ }
        else if (act === 'course') this.showCourseTable();
        else if (act === 'classlog') this.showClassLogs();
        else if (act === 'mindmap') { /* 已显示列表 */ }
      };
    });

    document.getElementById('addThesis').onclick = () => this.addThesis();
    document.getElementById('addMindmap').onclick = () => this.editMindmap();
    this.renderTheses(theses);
    this.renderMindmapList(mindmaps);
  },

  /* 论文进度 */
  thesisStages: [
    { key: 'topic', label: '选题', icon: '💡' },
    { key: 'proposal', label: '开题', icon: '📋' },
    { key: 'draft', label: '初稿', icon: '✍️' },
    { key: 'revise', label: '修改', icon: '🔧' },
    { key: 'defense', label: '答辩', icon: '🎓' }
  ],

  async renderTheses(theses) {
    const el = document.getElementById('thesisList');
    if (!el) return;
    if (theses.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">📝</div><div class="hint">添加一篇论文，跟踪进度</div></div>`;
      return;
    }
    el.innerHTML = theses.map(t => {
      const stageIdx = this.thesisStages.findIndex(s => s.key === t.stage);
      const progress = t.progress || 0;
      const stage = this.thesisStages[stageIdx] || this.thesisStages[0];
      return `
        <div class="list-item" data-id="${t.id}">
          <div class="li-row">
            <span style="font-size:18px">${stage.icon}</span>
            <div style="flex:1" data-act="open">
              <div class="li-title">${t.title}</div>
              <div class="li-tags">
                <span class="chip blue">${stage.label}</span>
                <span class="chip ${progress >= 100 ? 'green' : 'yellow'}">${progress}%</span>
              </div>
              <div class="sc-progress-bar">
                <div class="sc-progress-fill" style="width:${progress}%"></div>
              </div>
              ${t.note ? `<div class="li-sub" style="margin-top:4px">${t.note}</div>` : ''}
            </div>
            <button class="icon-btn" data-act="menu" data-tid="${t.id}" style="width:28px;height:28px;font-size:12px">⋯</button>
          </div>
        </div>
      `;
    }).join('');
    el.querySelectorAll('[data-act="open"]').forEach(item => {
      item.onclick = () => this.thesisDetail(item.closest('.list-item').dataset.id);
    });
    el.querySelectorAll('[data-act="menu"]').forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation();
        this.thesisMenu(b.dataset.tid);
      };
    });
  },

  thesisMenu(id) {
    const body = `
      <div class="choice-grid">
        <button class="choice" data-act="edit">✏️ 编辑</button>
        <button class="choice" data-act="del" style="color:var(--rust)">🗑 删除</button>
      </div>
    `;
    UI.showSheet('操作', body, (root) => {
      root.querySelector('[data-act="edit"]').onclick = () => { UI.hideSheet(); this.addThesis(id); };
      root.querySelector('[data-act="del"]').onclick = async () => {
        UI.hideSheet();
        if (await UI.confirm('删除这篇论文？')) {
          await db.remove(db.STORES.thesis, id);
          this.renderGraduate();
        }
      };
    });
  },

  addThesis(editId) {
    const isEdit = !!editId;
    const body = `
      <div class="form-row">
        <label class="label">论文标题</label>
        <input class="field" id="th_title" placeholder="如：论合同解除权的法律适用" maxlength="80">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">当前阶段</label>
          <select class="field" id="th_stage">
            ${this.thesisStages.map(s => `<option value="${s.key}">${s.icon} ${s.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="label">完成度（%）</label>
          <input class="field" id="th_progress" type="number" min="0" max="100" value="0">
        </div>
      </div>
      <div class="form-row">
        <label class="label">备注</label>
        <textarea class="field" id="th_note" placeholder="进度说明、待办事项..." maxlength="300"></textarea>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="th_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="th_save">${isEdit ? '保存' : '添加'}</button>
      </div>
    `;
    UI.showSheet(isEdit ? '编辑论文' : '添加论文', body, (root) => {
      root.querySelector('#th_save').onclick = async () => {
        const title = root.querySelector('#th_title').value.trim();
        if (!title) return UI.toast('请输入论文标题');
        const payload = {
          title,
          stage: root.querySelector('#th_stage').value,
          progress: parseInt(root.querySelector('#th_progress').value) || 0,
          note: root.querySelector('#th_note').value.trim()
        };
        if (isEdit) {
          const old = await db.get(db.STORES.thesis, editId);
          Object.assign(old, payload);
          await db.put(db.STORES.thesis, old);
        } else {
          await db.add(db.STORES.thesis, payload);
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加');
        this.renderGraduate();
      };
      if (isEdit) {
        (async () => {
          const t = await db.get(db.STORES.thesis, editId);
          if (t) {
            root.querySelector('#th_title').value = t.title || '';
            root.querySelector('#th_stage').value = t.stage || 'topic';
            root.querySelector('#th_progress').value = t.progress || 0;
            root.querySelector('#th_note').value = t.note || '';
          }
        })();
      }
    });
  },

  async thesisDetail(id) {
    const t = await db.get(db.STORES.thesis, id);
    if (!t) return;
    const main = document.getElementById('appMain');
    const stageIdx = this.thesisStages.findIndex(s => s.key === t.stage);
    App.setFab(() => this.addThesis(id));
    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" data-act="back">‹ 返回</button>
        <div class="card" style="padding:16px;margin-bottom:14px;">
          <div class="tape rust" style="top:-8px;left:20px;"></div>
          <h2 style="font-family:var(--font-display);font-size:20px;">${t.title}</h2>
          <div class="sc-thesis-stages">
            ${this.thesisStages.map((s, i) => `
              <div class="sc-ts-item ${i === stageIdx ? 'current' : ''} ${i < stageIdx ? 'done' : ''}">
                <div class="sc-ts-circle">${i < stageIdx ? '✓' : s.icon}</div>
                <div class="sc-ts-label">${s.label}</div>
              </div>
            `).join('')}
          </div>
          <div class="sc-progress-bar" style="margin-top:12px;">
            <div class="sc-progress-fill" style="width:${t.progress || 0}%"></div>
          </div>
          <div style="font-size:11px;color:var(--ink-mute);margin-top:4px;text-align:center;">完成度 ${t.progress || 0}%</div>
          ${t.note ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:10px;line-height:1.6;">${t.note}</div>` : ''}
          <button class="btn btn-outline" id="editThesis" style="width:100%;margin-top:12px;">✏️ 编辑进度</button>
        </div>
      </div>
    `;
    main.querySelector('[data-act="back"]').onclick = () => this.goBack('graduate');
    main.querySelector('#editThesis').onclick = () => this.addThesis(id);
  },

  /* ====== 课程表（分单双周，每天13节） ====== */
  weekTypes: [
    { key: 'odd', label: '单周' },
    { key: 'even', label: '双周' }
  ],
  days: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  // 每天13节课，每节45分钟（精确匹配 WakeUp 课程表时间）
  // 上午：第1-5节（08:00-12:25）
  // 午休：12:25-13:45（85分钟）
  // 下午：第6-9节（13:45-17:10）
  // 晚餐：17:10-18:00（50分钟）
  // 晚上：第10-13节（18:00-21:20）
  periods: [
    { n: 1,  start: '08:00', end: '08:45' },
    { n: 2,  start: '08:50', end: '09:35' },
    { n: 3,  start: '09:50', end: '10:35' },
    { n: 4,  start: '10:50', end: '11:35' },
    { n: 5,  start: '11:40', end: '12:25' },
    // 午休 85分钟
    { n: 6,  start: '13:45', end: '14:30' },
    { n: 7,  start: '14:35', end: '15:20' },
    { n: 8,  start: '15:35', end: '16:20' },
    { n: 9,  start: '16:25', end: '17:10' },
    // 晚餐 50分钟
    { n: 10, start: '18:00', end: '18:45' },
    { n: 11, start: '18:50', end: '19:35' },
    { n: 12, start: '19:45', end: '20:30' },
    { n: 13, start: '20:35', end: '21:20' }
  ],

  /* 计算当前是第几周 */
  calcCurrentWeek(startDate) {
    if (!startDate) return 0;
    const start = new Date(startDate + 'T00:00:00');
    // 将开始日期调整到那一周的周一
    const dayOfWeek = start.getDay(); // 0=周日, 1=周一
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffMs = now - weekStart;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 0;
    return Math.floor(diffDays / 7) + 1;
  },

  async showCourseTable() {
    const courses = await db.all(db.STORES.course);
    const main = document.getElementById('appMain');

    // 获取学期信息
    const semesters = await db.all(db.STORES.semester);
    const semester = semesters[0] || null;

    // 计算当前周
    let currentWeek = 0;
    let autoWeekType = 'odd';
    if (semester && semester.startDate) {
      currentWeek = this.calcCurrentWeek(semester.startDate);
      if (currentWeek > 0) {
        autoWeekType = currentWeek % 2 === 1 ? 'odd' : 'even';
      }
    }

    // 周类型：优先用 localStorage 手动选择的，否则自动判断
    let currentWeekType = localStorage.getItem('courseWeekType') || autoWeekType;

    // 当前周类型提示
    const weekTypeLabel = currentWeek === 0 ? '' : (currentWeek % 2 === 1 ? '（单周）' : '（双周）');

    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" data-act="back">‹ 返回</button>

        <!-- 学期信息 -->
        <div class="sc-semester-bar" id="semesterBar">
          ${semester ? `
            <div class="sc-sem-info">
              <div class="sc-sem-name">📅 ${semester.name}</div>
              <div class="sc-sem-detail">
                第一周：${semester.startDate}
                ${currentWeek > 0 ? ` · 当前第 <strong>${currentWeek}</strong> 周${weekTypeLabel}` : ' · 尚未开始'}
              </div>
            </div>
            <button class="icon-btn" id="editSemester" style="font-size:14px;width:32px;height:32px;">✏️</button>
          ` : `
            <div class="sc-sem-info">
              <div class="sc-sem-name">📅 未设置学期</div>
              <div class="sc-sem-detail">设置学期开始日期后可自动计算当前周次</div>
            </div>
            <button class="btn btn-jade" id="editSemester" style="font-size:11px;padding:6px 12px;">设置学期</button>
          `}
        </div>

        <div class="sc-course-header">
          <div class="sc-course-week-toggle">
            <button class="sc-wt-btn ${currentWeekType === 'odd' ? 'active' : ''}" data-wt="odd">单周</button>
            <button class="sc-wt-btn ${currentWeekType === 'even' ? 'active' : ''}" data-wt="even">双周</button>
          </div>
          <button class="btn btn-jade" id="addCourse" style="font-size:11px;padding:6px 12px;">＋ 添加课程</button>
        </div>
        <div class="sc-course-table" id="courseTable">
          <div class="sc-ct-scroll">
            <table class="sc-ct-table">
              <thead>
                <tr>
                  <th class="sc-ct-period">节次</th>
                  ${this.days.map(d => `<th>${d}</th>`).join('')}
                </tr>
              </thead>
              <tbody id="courseBody">
              </tbody>
            </table>
          </div>
        </div>
        <div style="font-size:11px;color:var(--ink-mute);margin-top:8px;text-align:center;">
          每天 13 节课 · 每节 45 分钟
        </div>
      </div>
    `;

    main.querySelector('[data-act="back"]').onclick = () => this.goBack('graduate');
    main.querySelector('#addCourse').onclick = () => this.addCourse();
    main.querySelector('#editSemester').onclick = () => this.editSemester();

    main.querySelectorAll('.sc-wt-btn').forEach(btn => {
      btn.onclick = () => {
        currentWeekType = btn.dataset.wt;
        localStorage.setItem('courseWeekType', currentWeekType);
        main.querySelectorAll('.sc-wt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderCourseGrid(courses, currentWeekType);
      };
    });

    this.renderCourseGrid(courses, currentWeekType);
  },

  /* 编辑学期信息 */
  editSemester() {
    (async () => {
      const semesters = await db.all(db.STORES.semester);
      const sem = semesters[0] || {};
      const today = UI.todayStr();
      const body = `
        <div class="form-row">
          <label class="label">学期名称</label>
          <input class="field" id="sem_name" placeholder="如：2025春季学期" value="${sem.name || ''}" maxlength="30">
        </div>
        <div class="form-row">
          <label class="label">第一周开始日期</label>
          <input class="field" type="date" id="sem_start" value="${sem.startDate || today}">
          <div style="font-size:11px;color:var(--ink-mute);margin-top:4px">从该日期所在周的周一开始计算第几周</div>
        </div>
        <div class="form-row">
          <label class="label">总周数</label>
          <input class="field" type="number" id="sem_weeks" placeholder="如：20" value="${sem.totalWeeks || ''}" min="1" max="30">
        </div>
        <div class="form-actions">
          ${sem.id ? '<button class="btn btn-ghost" id="sem_del" style="color:var(--rust)">删除</button>' : ''}
          <button class="btn btn-primary" id="sem_save">保存</button>
        </div>
      `;
      UI.showSheet('学期设置', body, (root) => {
        root.querySelector('#sem_save').onclick = async () => {
          const name = root.querySelector('#sem_name').value.trim();
          const startDate = root.querySelector('#sem_start').value;
          const totalWeeks = parseInt(root.querySelector('#sem_weeks').value) || 0;
          if (!name) return UI.toast('请输入学期名称');
          if (!startDate) return UI.toast('请选择开始日期');
          if (sem.id) {
            sem.name = name;
            sem.startDate = startDate;
            sem.totalWeeks = totalWeeks;
            await db.put(db.STORES.semester, sem);
          } else {
            await db.add(db.STORES.semester, { name, startDate, totalWeeks });
          }
          UI.hideSheet();
          UI.toast('学期已设置');
          this.showCourseTable();
        };
        const delBtn = root.querySelector('#sem_del');
        if (delBtn) {
          delBtn.onclick = async () => {
            UI.hideSheet();
            if (await UI.confirm('删除学期信息？')) {
              await db.remove(db.STORES.semester, sem.id);
              localStorage.removeItem('courseWeekType');
              UI.toast('已删除');
              this.showCourseTable();
            }
          };
        }
      });
    })();
  },

  renderCourseGrid(courses, weekType) {
    const body = document.getElementById('courseBody');
    if (!body) return;

    // 预处理：为每门课程计算其连续节次区间，用于 rowspan 合并
    // periods 是节次数组如 [1,2,3]，排序后取最小值作为合并起始行
    const courseSpanMap = {}; // {courseId: {startRow, span}}
    courses.forEach(c => {
      if (!c.periods || c.periods.length === 0) return;
      // 周类型过滤
      if (c.weekType !== 'all' && c.weekType !== weekType) return;
      const sorted = [...c.periods].sort((a, b) => a - b);
      courseSpanMap[c.id] = { startRow: sorted[0] - 1, span: sorted.length };
    });

    // 记录哪些格子已被 rowspan 占用（跳过渲染）
    // key: "day-periodIndex" (periodIndex 0-based)
    const occupied = new Set();

    let html = '';
    for (let p = 0; p < 13; p++) {
      const period = this.periods[p];
      html += `<tr><td class="sc-ct-period"><div class="sc-ct-pn">${period.n}</div><div class="sc-ct-pt">${period.start}</div><div class="sc-ct-pt">${period.end}</div></td>`;
      for (let d = 0; d < 7; d++) {
        // 如果该格子已被上方 rowspan 占用，跳过
        if (occupied.has(`${d}-${p}`)) {
          continue;
        }
        // 查找该时段该周类型的课程
        const course = courses.find(c => {
          if (c.day !== d) return false;
          if (!c.periods || !c.periods.includes(p + 1)) return false;
          if (c.weekType === 'all') return true;
          return c.weekType === weekType;
        });
        if (course) {
          const span = courseSpanMap[course.id];
          // 只有在合并起始行才渲染该格子，其余行标记为 occupied
          if (span && span.startRow === p) {
            const rowspan = span.span;
            // 标记后续行被占用
            for (let r = 1; r < rowspan; r++) {
              occupied.add(`${d}-${p + r}`);
            }
            html += `<td class="sc-ct-cell has-course merged" rowspan="${rowspan}" data-cid="${course.id}" data-day="${d}" data-period="${p+1}" style="background:${course.color || 'var(--forest-mist)'};border-color:${course.color || 'var(--forest)'};vertical-align:middle;">
              <div class="sc-ct-cname">${course.name}</div>
              ${course.teacher ? `<div class="sc-ct-cteacher">${course.teacher}</div>` : ''}
              ${course.location ? `<div class="sc-ct-cloc">📍${course.location}</div>` : ''}
            </td>`;
          }
          // 如果不是起始行但课程存在，说明逻辑有问题，跳过（已被 occupied 处理）
        } else {
          html += `<td class="sc-ct-cell" data-day="${d}" data-period="${p+1}"></td>`;
        }
      }
      html += '</tr>';
    }
    body.innerHTML = html;

    // 点击空格添加，点击课程编辑
    body.querySelectorAll('.sc-ct-cell').forEach(cell => {
      cell.onclick = () => {
        const cid = cell.dataset.cid;
        if (cid) {
          this.courseMenu(cid);
        } else {
          const day = parseInt(cell.dataset.day);
          const period = parseInt(cell.dataset.period);
          this.addCourse(null, { day, period, weekType: localStorage.getItem('courseWeekType') || 'odd' });
        }
      };
    });
  },

  courseMenu(id) {
    const body = `
      <div class="choice-grid">
        <button class="choice" data-act="edit">✏️ 编辑</button>
        <button class="choice" data-act="del" style="color:var(--rust)">🗑 删除</button>
      </div>
    `;
    UI.showSheet('课程操作', body, (root) => {
      root.querySelector('[data-act="edit"]').onclick = () => { UI.hideSheet(); this.addCourse(id); };
      root.querySelector('[data-act="del"]').onclick = async () => {
        UI.hideSheet();
        if (await UI.confirm('删除这门课程？')) {
          await db.remove(db.STORES.course, id);
          this.showCourseTable();
        }
      };
    });
  },

  addCourse(editId, preset) {
    const isEdit = !!editId;
    const colors = ['#2f4a28', '#5a7a52', '#b8923a', '#a05a3a', '#3a4a5b', '#8a6a1f', '#5a8a6a'];
    const body = `
      <div class="form-row">
        <label class="label">课程名称</label>
        <input class="field" id="cs_name" placeholder="如：民法总论" maxlength="20">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">教师</label>
          <input class="field" id="cs_teacher" placeholder="如：王老师" maxlength="20">
        </div>
        <div>
          <label class="label">教室</label>
          <input class="field" id="cs_location" placeholder="如：教学楼A301" maxlength="30">
        </div>
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">星期</label>
          <select class="field" id="cs_day">
            ${this.days.map((d, i) => `<option value="${i}">${d}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="label">周类型</label>
          <select class="field" id="cs_weektype">
            <option value="all">每周</option>
            <option value="odd">单周</option>
            <option value="even">双周</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label class="label">节次（可多选）</label>
        <div class="sc-period-picker" id="cs_periods">
          ${this.periods.map(p => `<label class="sc-pp-item"><input type="checkbox" value="${p.n}" data-start="${p.start}"><span>${p.n}</span><small>${p.start}</small></label>`).join('')}
        </div>
      </div>
      <div class="form-row">
        <label class="label">颜色标记</label>
        <div class="sc-color-picker" id="cs_colors">
          ${colors.map((c, i) => `<label class="sc-cp-item"><input type="radio" name="color" value="${c}" ${i === 0 ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}
        </div>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="cs_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="cs_save">${isEdit ? '保存' : '添加'}</button>
      </div>
    `;
    UI.showSheet(isEdit ? '编辑课程' : '添加课程', body, (root) => {
      root.querySelector('#cs_save').onclick = async () => {
        const name = root.querySelector('#cs_name').value.trim();
        if (!name) return UI.toast('请输入课程名称');
        const day = parseInt(root.querySelector('#cs_day').value);
        const weekType = root.querySelector('#cs_weektype').value;
        const periods = Array.from(root.querySelectorAll('#cs_periods input:checked')).map(i => parseInt(i.value));
        if (periods.length === 0) return UI.toast('请选择至少一节课');
        const color = root.querySelector('#cs_colors input:checked').value;
        const payload = {
          name,
          teacher: root.querySelector('#cs_teacher').value.trim(),
          location: root.querySelector('#cs_location').value.trim(),
          day, weekType, periods, color
        };
        if (isEdit) {
          const old = await db.get(db.STORES.course, editId);
          Object.assign(old, payload);
          await db.put(db.STORES.course, old);
        } else {
          await db.add(db.STORES.course, payload);
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加');
        this.showCourseTable();
      };
      if (isEdit) {
        (async () => {
          const c = await db.get(db.STORES.course, editId);
          if (c) {
            root.querySelector('#cs_name').value = c.name || '';
            root.querySelector('#cs_teacher').value = c.teacher || '';
            root.querySelector('#cs_location').value = c.location || '';
            root.querySelector('#cs_day').value = c.day || 0;
            root.querySelector('#cs_weektype').value = c.weekType || 'all';
            (c.periods || []).forEach(p => {
              const cb = root.querySelector(`#cs_periods input[value="${p}"]`);
              if (cb) cb.checked = true;
            });
            if (c.color) {
              const radio = root.querySelector(`#cs_colors input[value="${c.color}"]`);
              if (radio) radio.checked = true;
            }
          }
        })();
      } else if (preset) {
        root.querySelector('#cs_day').value = preset.day;
        root.querySelector('#cs_weektype').value = preset.weekType;
        const cb = root.querySelector(`#cs_periods input[value="${preset.period}"]`);
        if (cb) cb.checked = true;
      }
    });
  },

  /* 上课记录 */
  async showClassLogs() {
    const logs = await db.all(db.STORES.classLog);
    logs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const courses = await db.all(db.STORES.course);
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" data-act="back">‹ 返回</button>
        <div class="sc-cl-header">
          <h3 style="font-family:var(--font-display);font-size:18px;">📖 上课记录</h3>
          <button class="btn btn-jade" id="addClassLog" style="font-size:11px;padding:6px 12px;">＋ 添加</button>
        </div>
        <div id="classLogList"></div>
      </div>
    `;
    main.querySelector('[data-act="back"]').onclick = () => this.goBack('graduate');
    main.querySelector('#addClassLog').onclick = () => this.addClassLog(courses);
    this.renderClassLogs(logs, courses);
  },

  async renderClassLogs(logs, courses) {
    const el = document.getElementById('classLogList');
    if (!el) return;
    if (logs.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">📖</div><div class="hint">记录每次上课的内容和作业</div></div>`;
      return;
    }
    const attendMap = { 'present': '✅ 出勤', 'absent': '❌ 缺勤', 'late': '迟到' };
    el.innerHTML = logs.map(l => `
      <div class="list-item" data-id="${l.id}">
        <div class="li-row">
          <span style="font-size:16px">📖</span>
          <div style="flex:1" data-act="open">
            <div class="li-title">${l.courseName || '课程记录'}</div>
            <div class="li-tags">
              <span class="chip gray">${l.date}</span>
              ${l.attendance ? `<span class="chip ${l.attendance === 'present' ? 'green' : l.attendance === 'absent' ? 'red' : 'yellow'}">${attendMap[l.attendance] || l.attendance}</span>` : ''}
            </div>
            ${l.content ? `<div class="li-sub">📝 ${l.content.substring(0, 60)}${l.content.length > 60 ? '...' : ''}</div>` : ''}
            ${l.homework ? `<div class="li-sub" style="color:var(--gold-deep)">📌 ${l.homework.substring(0, 60)}${l.homework.length > 60 ? '...' : ''}</div>` : ''}
          </div>
          <button class="icon-btn" data-act="del" data-lid="${l.id}" style="width:28px;height:28px;font-size:12px">✕</button>
        </div>
      </div>
    `).join('');
    el.querySelectorAll('[data-act="open"]').forEach(item => {
      item.onclick = () => this.addClassLog(courses, item.closest('.list-item').dataset.id);
    });
    el.querySelectorAll('[data-act="del"]').forEach(b => {
      b.onclick = async (e) => {
        e.stopPropagation();
        if (await UI.confirm('删除这条上课记录？')) {
          await db.remove(db.STORES.classLog, b.dataset.lid);
          this.showClassLogs();
        }
      };
    });
  },

  addClassLog(courses, editId) {
    const isEdit = !!editId;
    const today = UI.todayStr();
    const body = `
      <div class="form-row">
        <label class="label">课程</label>
        <select class="field" id="cl_course">
          ${courses.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`).join('')}
          <option value="__custom">自定义课程</option>
        </select>
      </div>
      <div class="form-row" id="cl_custom_row" style="display:none;">
        <label class="label">课程名称</label>
        <input class="field" id="cl_custom_name" placeholder="输入课程名称" maxlength="20">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">日期</label>
          <input class="field" id="cl_date" type="date" value="${today}">
        </div>
        <div>
          <label class="label">考勤</label>
          <select class="field" id="cl_attendance">
            <option value="present">✅ 出勤</option>
            <option value="late">迟到</option>
            <option value="absent">❌ 缺勤</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label class="label">上课内容</label>
        <textarea class="field" id="cl_content" placeholder="今天讲了什么..." rows="3" maxlength="500"></textarea>
      </div>
      <div class="form-row">
        <label class="label">作业</label>
        <textarea class="field" id="cl_homework" placeholder="布置的作业..." rows="2" maxlength="300"></textarea>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="cl_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="cl_save">${isEdit ? '保存' : '添加'}</button>
      </div>
    `;
    UI.showSheet(isEdit ? '编辑上课记录' : '添加上课记录', body, (root) => {
      root.querySelector('#cl_course').onchange = (e) => {
        root.querySelector('#cl_custom_row').style.display = e.target.value === '__custom' ? '' : 'none';
      };
      root.querySelector('#cl_save').onclick = async () => {
        const courseSel = root.querySelector('#cl_course');
        let courseName;
        if (courseSel.value === '__custom') {
          courseName = root.querySelector('#cl_custom_name').value.trim();
          if (!courseName) return UI.toast('请输入课程名称');
        } else {
          courseName = courseSel.options[courseSel.selectedIndex].dataset.name;
        }
        const payload = {
          courseId: courseSel.value !== '__custom' ? courseSel.value : '',
          courseName,
          date: root.querySelector('#cl_date').value,
          attendance: root.querySelector('#cl_attendance').value,
          content: root.querySelector('#cl_content').value.trim(),
          homework: root.querySelector('#cl_homework').value.trim()
        };
        if (isEdit) {
          const old = await db.get(db.STORES.classLog, editId);
          Object.assign(old, payload);
          await db.put(db.STORES.classLog, old);
        } else {
          await db.add(db.STORES.classLog, payload);
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加');
        this.showClassLogs();
      };
      if (isEdit) {
        (async () => {
          const l = await db.get(db.STORES.classLog, editId);
          if (l) {
            if (l.courseId && courses.find(c => c.id === l.courseId)) {
              root.querySelector('#cl_course').value = l.courseId;
            } else {
              root.querySelector('#cl_course').value = '__custom';
              root.querySelector('#cl_custom_row').style.display = '';
              root.querySelector('#cl_custom_name').value = l.courseName || '';
            }
            root.querySelector('#cl_date').value = l.date || today;
            root.querySelector('#cl_attendance').value = l.attendance || 'present';
            root.querySelector('#cl_content').value = l.content || '';
            root.querySelector('#cl_homework').value = l.homework || '';
          }
        })();
      }
    });
  },

  /* ====== 思维导图（纯文本大纲 + Markdown 导入） ====== */
  async renderMindmapList(mindmaps) {
    const el = document.getElementById('mindmapList');
    if (!el) return;
    if (mindmaps.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">🧠</div><div class="hint">新建思维导图，支持 Markdown 导入</div></div>`;
      return;
    }
    el.innerHTML = mindmaps.map(m => {
      const nodeCount = this.countNodes(m.data);
      return `
        <div class="list-item" data-id="${m.id}">
          <div class="li-row">
            <span style="font-size:18px">🧠</span>
            <div style="flex:1" data-act="open">
              <div class="li-title">${m.title}</div>
              <div class="li-tags">
                <span class="chip blue">${nodeCount} 节点</span>
                <span class="chip gray">${UI.formatDate(m.updatedAt)}</span>
              </div>
            </div>
            <button class="icon-btn" data-act="menu" data-mid="${m.id}" style="width:28px;height:28px;font-size:12px">⋯</button>
          </div>
        </div>
      `;
    }).join('');
    el.querySelectorAll('[data-act="open"]').forEach(item => {
      item.onclick = () => this.editMindmap(item.closest('.list-item').dataset.id);
    });
    el.querySelectorAll('[data-act="menu"]').forEach(b => {
      b.onclick = (e) => {
        e.stopPropagation();
        this.mindmapMenu(b.dataset.mid);
      };
    });
  },

  countNodes(node) {
    if (!node) return 0;
    let count = 1;
    (node.children || []).forEach(c => { count += this.countNodes(c); });
    return count;
  },

  mindmapMenu(id) {
    const body = `
      <div class="choice-grid">
        <button class="choice" data-act="edit">✏️ 编辑</button>
        <button class="choice" data-act="export">📄 导出 Markdown</button>
        <button class="choice" data-act="del" style="color:var(--rust)">🗑 删除</button>
      </div>
    `;
    UI.showSheet('思维导图操作', body, (root) => {
      root.querySelector('[data-act="edit"]').onclick = () => { UI.hideSheet(); this.editMindmap(id); };
      root.querySelector('[data-act="export"]').onclick = () => {
        UI.hideSheet();
        this.exportMindmap(id);
      };
      root.querySelector('[data-act="del"]').onclick = async () => {
        UI.hideSheet();
        if (await UI.confirm('删除这个思维导图？')) {
          await db.remove(db.STORES.mindmap, id);
          this.renderGraduate();
        }
      };
    });
  },

  editMindmap(id) {
    const isEdit = !!id;
    const main = document.getElementById('appMain');
    App.setActiveNav('study');

    (async () => {
      let mm = isEdit ? await db.get(db.STORES.mindmap, id) : null;
      if (isEdit && !mm) { UI.toast('未找到'); return; }
      if (!mm) {
        mm = { title: '新思维导图', data: { title: '主题', children: [] } };
      }

      main.innerHTML = `
        <div class="fade-up sc-mindmap-editor">
          <button class="detail-back" data-act="back">‹ 返回</button>
          <div class="sc-mm-toolbar">
            <input class="field sc-mm-title" id="mmTitle" value="${mm.title}" placeholder="导图标题">
            <div class="sc-mm-btns">
              <button class="btn btn-outline" id="mmImport" style="font-size:11px;padding:6px 10px;">📥 导入MD</button>
              <button class="btn btn-outline" id="mmUpload" style="font-size:11px;padding:6px 10px;">📎 上传.md</button>
              <button class="btn btn-primary" id="mmSave" style="font-size:11px;padding:6px 10px;">💾 保存</button>
            </div>
          </div>
          <div class="sc-mm-layout">
            <div class="sc-mm-outline">
              <div class="sc-mm-outline-head">
                <span>大纲编辑器</span>
                <button class="btn btn-jade" id="mmAddRoot" style="font-size:11px;padding:4px 8px;">＋ 根节点</button>
              </div>
              <div id="mmOutline"></div>
            </div>
            <div class="sc-mm-preview">
              <div class="sc-mm-preview-head">预览</div>
              <div class="mindmap-box" id="mmPreview"></div>
            </div>
          </div>
        </div>
      `;

      let data = mm.data || { title: '主题', children: [] };

      main.querySelector('[data-act="back"]').onclick = () => this.goBack('graduate');

      // 渲染大纲编辑器
      const renderOutline = () => {
        const el = document.getElementById('mmOutline');
        if (!el) return;
        el.innerHTML = this.renderOutlineNode(data, [], 0);
        bindOutlineEvents();
      };

      const bindOutlineEvents = () => {
        const el = document.getElementById('mmOutline');
        if (!el) return;

        // 增删缩进排序
        el.querySelectorAll('[data-mm-act]').forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const act = btn.dataset.mmAct;
            const path = btn.dataset.path.split(',').map(Number);
            this.handleMindmapAction(act, path, data, renderOutline, renderPreview);
          };
        });

        // 文本编辑
        el.querySelectorAll('.sc-mm-node-input').forEach(input => {
          input.oninput = () => {
            const path = input.dataset.path.split(',').map(Number);
            const node = this.getNodeByPath(data, path);
            if (node) {
              node.title = input.value;
              renderPreview();
            }
          };
        });
      };

      const renderPreview = () => {
        const el = document.getElementById('mmPreview');
        if (!el) return;
        el.innerHTML = this.renderMindMapNode(data, true, 0);
        el.querySelectorAll('.mm-node').forEach(node => {
          const label = node.querySelector(':scope > .mm-label');
          const children = node.querySelector(':scope > .mm-children');
          if (children) {
            label.style.cursor = 'pointer';
            label.onclick = (e) => {
              e.stopPropagation();
              children.style.display = children.style.display === 'none' ? 'block' : 'none';
              label.classList.toggle('collapsed');
            };
          }
        });
      };

      renderOutline();
      renderPreview();

      // 添加根节点
      main.querySelector('#mmAddRoot').onclick = () => {
        if (!data.children) data.children = [];
        data.children.push({ title: '新节点', children: [] });
        renderOutline();
        renderPreview();
      };

      // 导入 Markdown（粘贴）
      main.querySelector('#mmImport').onclick = () => {
        const body = `
          <div class="form-row">
            <label class="label">粘贴 Markdown 文本</label>
            <textarea class="field" id="mdInput" placeholder="# 主题&#10;## 分支1&#10;### 子节点&#10;- 列表项&#10;## 分支2" rows="10"></textarea>
          </div>
          <div style="font-size:11px;color:var(--ink-mute);margin-bottom:10px;">
            支持 # 标题层级和 - 列表缩进，将自动转为思维导图
          </div>
          <div class="form-actions">
            <button class="btn btn-ghost" id="mdCancel">取消</button>
            <button class="btn btn-primary" id="mdImport">导入</button>
          </div>
        `;
        UI.showSheet('导入 Markdown', body, (root) => {
          root.querySelector('#mdCancel').onclick = () => UI.hideSheet();
          root.querySelector('#mdImport').onclick = () => {
            const text = root.querySelector('#mdInput').value.trim();
            if (!text) return UI.toast('请粘贴 Markdown 文本');
            data = this.parseMarkdownToTree(text);
            renderOutline();
            renderPreview();
            UI.hideSheet();
            UI.toast('已导入');
          };
        });
      };

      // 上传 .md 文件
      main.querySelector('#mmUpload').onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md,.markdown,.txt';
        input.onchange = async () => {
          const f = input.files[0];
          if (!f) return;
          if (f.size > 500 * 1024) {
            UI.toast('文件不能超过 500KB');
            return;
          }
          const text = await f.text();
          data = this.parseMarkdownToTree(text);
          const titleInput = document.getElementById('mmTitle');
          if (titleInput && !titleInput.value.trim()) {
            titleInput.value = f.name.replace(/\.(md|markdown|txt)$/i, '');
          }
          renderOutline();
          renderPreview();
          UI.toast(`已导入 ${f.name}`);
        };
        input.click();
      };

      // 保存
      main.querySelector('#mmSave').onclick = async () => {
        const title = document.getElementById('mmTitle').value.trim() || '思维导图';
        if (isEdit) {
          mm.title = title;
          mm.data = data;
          await db.put(db.STORES.mindmap, mm);
        } else {
          await db.add(db.STORES.mindmap, { title, data });
        }
        UI.toast('已保存');
        this.renderGraduate();
      };
    })();
  },

  /* 渲染大纲编辑器节点（支持增删缩进排序） */
  renderOutlineNode(node, path, level) {
    const isRoot = path.length === 0;
    const children = node.children || [];
    let html = `<div class="sc-mm-node ${isRoot ? 'root' : ''}" style="margin-left:${level * 20}px">`;
    html += `<div class="sc-mm-node-row">`;
    html += `<span class="sc-mm-node-dot" style="background:${isRoot ? 'var(--forest)' : 'var(--forest-soft)'}"></span>`;
    html += `<input class="sc-mm-node-input" value="${this.escapeHtml(node.title || '')}" data-path="${path.join(',')}" placeholder="节点内容">`;

    if (!isRoot) {
      html += `<div class="sc-mm-node-btns">`;
      // 缩进减少（向左）
      html += `<button class="sc-mm-mini" data-mm-act="outdent" data-path="${path.join(',')}" title="减少缩进">‹‹</button>`;
      // 缩进增加（向右）
      html += `<button class="sc-mm-mini" data-mm-act="indent" data-path="${path.join(',')}" title="增加缩进">››</button>`;
      // 上移
      html += `<button class="sc-mm-mini" data-mm-act="up" data-path="${path.join(',')}" title="上移">↑</button>`;
      // 下移
      html += `<button class="sc-mm-mini" data-mm-act="down" data-path="${path.join(',')}" title="下移">↓</button>`;
      // 删除
      html += `<button class="sc-mm-mini del" data-mm-act="delete" data-path="${path.join(',')}" title="删除">✕</button>`;
      html += `</div>`;
    }

    // 添加子节点
    html += `<button class="sc-mm-mini add" data-mm-act="addchild" data-path="${path.join(',')}" title="添加子节点">＋</button>`;
    html += `</div>`;

    if (children.length > 0) {
      html += '<div class="sc-mm-children">';
      children.forEach((child, i) => {
        html += this.renderOutlineNode(child, [...path, i], level + 1);
      });
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  handleMindmapAction(act, path, data, renderOutline, renderPreview) {
    if (act === 'addchild') {
      const node = this.getNodeByPath(data, path);
      if (node) {
        if (!node.children) node.children = [];
        node.children.push({ title: '新节点', children: [] });
        renderOutline();
        renderPreview();
      }
    } else if (act === 'delete') {
      if (path.length === 0) return;
      const parentPath = path.slice(0, -1);
      const idx = path[path.length - 1];
      const parent = parentPath.length === 0 ? data : this.getNodeByPath(data, parentPath);
      if (parent && parent.children) {
        parent.children.splice(idx, 1);
        renderOutline();
        renderPreview();
      }
    } else if (act === 'indent') {
      // 向右缩进：将当前节点变为上一个兄弟节点的子节点
      if (path.length === 0) return;
      const idx = path[path.length - 1];
      if (idx === 0) return; // 第一个无法缩进
      const parentPath = path.slice(0, -1);
      const parent = parentPath.length === 0 ? data : this.getNodeByPath(data, parentPath);
      if (parent && parent.children && idx > 0) {
        const node = parent.children.splice(idx, 1)[0];
        const prevSibling = parent.children[idx - 1];
        if (!prevSibling.children) prevSibling.children = [];
        prevSibling.children.push(node);
        renderOutline();
        renderPreview();
      }
    } else if (act === 'outdent') {
      // 向左减少缩进：将当前节点提升到父级
      if (path.length <= 1) return; // 根级无法减少缩进
      const idx = path[path.length - 1];
      const parentPath = path.slice(0, -1);
      const grandParentPath = path.slice(0, -2);
      const parent = parentPath.length === 0 ? data : this.getNodeByPath(data, parentPath);
      const grandParent = grandParentPath.length === 0 ? data : this.getNodeByPath(data, grandParentPath);
      if (parent && grandParent && parent.children) {
        const node = parent.children.splice(idx, 1)[0];
        const parentIdx = parentPath[parentPath.length - 1];
        grandParent.children.splice(parentIdx + 1, 0, node);
        renderOutline();
        renderPreview();
      }
    } else if (act === 'up') {
      if (path.length === 0) return;
      const idx = path[path.length - 1];
      if (idx === 0) return;
      const parentPath = path.slice(0, -1);
      const parent = parentPath.length === 0 ? data : this.getNodeByPath(data, parentPath);
      if (parent && parent.children) {
        [parent.children[idx - 1], parent.children[idx]] = [parent.children[idx], parent.children[idx - 1]];
        renderOutline();
        renderPreview();
      }
    } else if (act === 'down') {
      if (path.length === 0) return;
      const idx = path[path.length - 1];
      const parentPath = path.slice(0, -1);
      const parent = parentPath.length === 0 ? data : this.getNodeByPath(data, parentPath);
      if (parent && parent.children && idx < parent.children.length - 1) {
        [parent.children[idx], parent.children[idx + 1]] = [parent.children[idx + 1], parent.children[idx]];
        renderOutline();
        renderPreview();
      }
    }
  },

  getNodeByPath(root, path) {
    let node = root;
    for (const i of path) {
      if (!node.children || i >= node.children.length) return null;
      node = node.children[i];
    }
    return node;
  },

  renderMindMapNode(node, isRoot, level) {
    const colors = ['var(--forest)', 'var(--forest-soft)', 'var(--gold)', 'var(--rust)'];
    const color = colors[Math.min(level, colors.length - 1)];
    const childrenHtml = node.children && node.children.length
      ? `<div class="mm-children">${node.children.map(c => this.renderMindMapNode(c, false, level + 1)).join('')}</div>`
      : '';
    return `
      <div class="mm-node ${isRoot ? 'root' : ''}" style="--node-color:${color}">
        <div class="mm-label">${this.escapeHtml(node.title || '')}</div>
        ${childrenHtml}
      </div>
    `;
  },

  /* Markdown 解析为树结构 */
  parseMarkdownToTree(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const root = { title: '思维导图', children: [] };
    // 栈：每一层一个 { node, level }
    const stack = [{ node: root, level: -1 }];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let level = -1;
      let title = '';

      // 标题 # ## ###
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        level = headingMatch[1].length - 1;
        title = headingMatch[2].trim();
      } else {
        // 列表项 - * 1.
        const listMatch = trimmed.match(/^(\s*)([-*+]|\d+\.)\s+(.+)/);
        if (listMatch) {
          // 缩进级别
          const indent = line.match(/^(\s*)/)[1].length;
          level = Math.floor(indent / 2);
          title = listMatch[3].trim();
        } else {
          // 普通文本
          title = trimmed.replace(/^[-*+]\s*/, '');
          level = 0;
        }
      }

      // 清理 title 中的 markdown 标记
      title = title.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1');

      const newNode = { title, children: [] };

      // 找到父节点
      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      stack[stack.length - 1].node.children.push(newNode);
      stack.push({ node: newNode, level });
    }

    // 如果只有一个一级子节点，提升为根
    if (root.children.length === 1) {
      return root.children[0];
    }
    return root;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  },

  async exportMindmap(id) {
    const mm = await db.get(db.STORES.mindmap, id);
    if (!mm) return;
    const md = this.treeToMarkdown(mm.data, 0);
    const blob = new Blob([`# ${mm.title}\n\n${md}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mm.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
    UI.toast('已导出 Markdown');
  },

  treeToMarkdown(node, level) {
    let md = '';
    const prefix = level === 0 ? '## ' : level === 1 ? '### ' : '  '.repeat(level - 1) + '- ';
    md += prefix + (node.title || '') + '\n';
    (node.children || []).forEach(c => {
      md += this.treeToMarkdown(c, level + 1);
    });
    return md;
  },

  /* ====== 每日新闻热点 ====== */
  async renderNews() {
    const el = document.getElementById('scContent');
    App.setFab(null);

    // 检查缓存
    let news = await db.all(db.STORES.news);
    news.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const today = UI.todayStr();
    const todayNews = news.filter(n => n.date === today);

    el.innerHTML = `
      <div class="sc-news-header">
        <div class="sc-news-info">
          <div class="sc-news-title">📰 每日新闻热点</div>
          <div class="sc-news-sub">${todayNews.length > 0 ? `今日已更新 ${todayNews.length} 条` : '点击刷新获取今日热点'}</div>
        </div>
        <button class="btn btn-primary" id="refreshNews" style="font-size:12px;padding:8px 14px;">🔄 刷新</button>
      </div>
      <div id="newsList"></div>
    `;

    document.getElementById('refreshNews').onclick = () => this.fetchNews();

    this.renderNewsList(news);
  },

  async renderNewsList(news) {
    const el = document.getElementById('newsList');
    if (!el) return;
    if (news.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">📰</div><div class="hint">点击「刷新」获取今日新闻热点</div></div>`;
      return;
    }
    // 按日期分组
    const grouped = {};
    news.forEach(n => {
      if (!grouped[n.date]) grouped[n.date] = [];
      grouped[n.date].push(n);
    });
    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    let html = '';
    for (const date of dates.slice(0, 7)) {
      const items = grouped[date];
      const isToday = date === UI.todayStr();
      html += `<div class="sc-news-date">${isToday ? '今日' : date} · ${items.length} 条</div>`;
      html += items.map((n, i) => `
        <div class="sc-news-item">
          <div class="sc-news-rank">${i + 1}</div>
          <div class="sc-news-content">
            <div class="sc-news-headline">${n.title}</div>
            ${n.summary ? `<div class="sc-news-summary">${n.summary}</div>` : ''}
            ${n.source ? `<div class="sc-news-source">来源：${n.source}</div>` : ''}
          </div>
        </div>
      `).join('');
    }
    el.innerHTML = html;
  },

  async fetchNews() {
    UI.toast('正在获取今日新闻热点...');
    try {
      const prompt = `请生成今日（${UI.todayStr()}）的 10 条新闻热点。
要求：
1. 涵盖国内外重要新闻、科技、社会、财经等领域
2. 每条新闻包含标题和简短摘要（50字以内）
3. 返回纯 JSON 数组格式，每条格式为：{"title":"标题","summary":"摘要","source":"来源"}
4. 只返回 JSON 数组，不要其他文字`;

      const resp = await AI._callOnline(prompt, '');
      const cleaned = AI._stripCodeFence(resp);
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) {
        UI.toast('获取失败，请稍后重试');
        return;
      }
      const items = JSON.parse(match[0]);

      // 清除今日旧数据
      const today = UI.todayStr();
      const oldNews = await db.all(db.STORES.news);
      for (const old of oldNews.filter(n => n.date === today)) {
        await db.remove(db.STORES.news, old.id);
      }

      // 存入新数据
      for (const item of items.slice(0, 10)) {
        await db.add(db.STORES.news, {
          title: item.title || '',
          summary: item.summary || '',
          source: item.source || 'AI汇总',
          date: today
        });
      }
      UI.toast(`已获取 ${items.length} 条新闻`);
      this.renderNews();
    } catch (e) {
      console.error('获取新闻失败', e);
      UI.toast('获取新闻失败：' + (e.message || '网络错误'));
    }
  }
};

router.register('study', () => StudyCenter.list());
router.register('study/*', (param) => {
  const [action, id] = param.split('/');
  if (action === 'detail' && id) {
    // 兼容旧的学习任务详情路由
    Study.detail(id);
  } else {
    StudyCenter.list();
  }
});

window.StudyCenter = StudyCenter;
