/* ============================================
   学习清单模块 v2
   - 任务管理（按学科分类）
   - 资料上传
   - 学习打卡（日历记录）
   - 连续打卡徽章（科目徽章 + 总 streak）
   - AI 辅助学习（讲解 + 出题自测）
   ============================================ */

const Study = {
  defaultSubjects: ['LEC 法律英语', '法语', '商法学', '民法学', '其他'],
  subjects: [],

  /* 从 localStorage 加载学科列表 */
  loadSubjects() {
    try {
      const saved = localStorage.getItem('studySubjects');
      if (saved) {
        this.subjects = JSON.parse(saved);
      } else {
        this.subjects = [...this.defaultSubjects];
        this.saveSubjects();
      }
    } catch (e) {
      this.subjects = [...this.defaultSubjects];
    }
    return this.subjects;
  },

  saveSubjects() {
    localStorage.setItem('studySubjects', JSON.stringify(this.subjects));
  },

  addSubject(name) {
    name = name.trim();
    if (!name) return false;
    if (this.subjects.includes(name)) {
      UI.toast('该学科已存在');
      return false;
    }
    this.subjects.push(name);
    this.saveSubjects();
    return true;
  },

  removeSubject(name) {
    this.subjects = this.subjects.filter((s) => s !== name);
    this.saveSubjects();
  },

  /* 徽章等级定义 */
  badges: [
    { days: 3, icon: '🌱', name: '初芽', desc: '连续打卡 3 天' },
    { days: 7, icon: '🌿', name: '青苗', desc: '连续打卡 7 天' },
    { days: 14, icon: '🌳', name: '成树', desc: '连续打卡 14 天' },
    { days: 30, icon: '🏆', name: '坚持', desc: '连续打卡 30 天' },
    { days: 60, icon: '👑', name: '王者', desc: '连续打卡 60 天' },
    { days: 100, icon: '💎', name: '传奇', desc: '连续打卡 100 天' }
  ],

  /* 计算某任务的连续打卡天数（从今日往前） */
  calcStreak(checkins) {
    if (!checkins || !checkins.length) return 0;
    const dates = new Set(checkins.map((c) => c.date));
    let streak = 0;
    const d = new Date();
    // 若今日未打卡，允许从昨日开始算（保持 streak 不因今天还没打卡而清零）
    if (!dates.has(UI.formatDate(d.getTime()))) {
      d.setDate(d.getDate() - 1);
    }
    while (dates.has(UI.formatDate(d.getTime()))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  },

  /* 计算历史最长连续天数 */
  calcMaxStreak(checkins) {
    if (!checkins || !checkins.length) return 0;
    const dates = checkins.map((c) => c.date).sort();
    let max = 1, cur = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      prev.setDate(prev.getDate() + 1);
      if (UI.formatDate(prev.getTime()) === dates[i]) {
        cur++;
        max = Math.max(max, cur);
      } else {
        cur = 1;
      }
    }
    return max;
  },

  /* 获取该任务已解锁的徽章 */
  unlockedBadges(streak, maxStreak) {
    const best = Math.max(streak, maxStreak);
    return this.badges.filter((b) => best >= b.days);
  },

  async list() {
    App.setActiveNav('study');
    this.loadSubjects();
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="fade-up">
        <!-- 总 streak 概览 -->
        <div class="study-overview" id="studyOverview"></div>

        <div class="tabs tabs-scroll" id="studyTabs">
          <div class="tab active" data-filter="all">全部</div>
          ${this.subjects.map((s) => `<div class="tab" data-filter="${s}">${s}</div>`).join('')}
          <div class="tab tab-add" id="addSubjectTab" title="添加学科">＋</div>
        </div>
        <div id="studyList"></div>
      </div>
    `;

    App.setFab(() => this.edit());

    // 渲染总 streak 概览
    this.renderOverview();

    // 标签筛选
    let currentFilter = 'all';
    const renderList = async () => {
      let all = await db.all(db.STORES.study);
      if (currentFilter !== 'all') all = all.filter((s) => s.subject === currentFilter);
      all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      const el = document.getElementById('studyList');
      if (all.length === 0) {
        el.innerHTML = `<div class="empty"><div class="emoji">📖</div><div class="hint">点击右下角 + 添加学习任务</div></div>`;
        return;
      }
      el.innerHTML = all
        .map((s) => {
          const streak = this.calcStreak(s.checkins);
          return `
        <div class="list-item" data-id="${s.id}">
          <div class="li-row">
            <button class="check ${s.done ? 'done' : ''}" data-act="toggle">✓</button>
            <div style="flex:1" data-act="open">
              <div class="li-title" style="${s.done ? 'text-decoration: line-through; color: var(--ink-mute);' : ''}">${s.title}</div>
              ${s.note ? `<div class="li-sub">${s.note}</div>` : ''}
              <div class="li-tags">
                <span class="chip red">${s.subject}</span>
                ${s.checkins?.length ? `<span class="chip green">📅 打卡 ${s.checkins.length} 天</span>` : ''}
                ${streak > 0 ? `<span class="chip yellow">🔥 连续 ${streak} 天</span>` : ''}
                ${s.materials?.length ? `<span class="chip blue">📎 资料 ${s.materials.length}</span>` : ''}
              </div>
            </div>
            <button class="icon-btn" data-act="menu" style="width:32px;height:32px;font-size:14px">⋯</button>
          </div>
        </div>`;
        })
        .join('');

      el.querySelectorAll('.list-item').forEach((item) => {
        const id = item.dataset.id;
        item.querySelector('[data-act="toggle"]').onclick = (e) => {
          e.stopPropagation();
          this.toggleDone(id);
        };
        item.querySelector('[data-act="open"]').onclick = () => router.navigate('study/detail/' + id);
        item.querySelector('[data-act="menu"]').onclick = (e) => {
          e.stopPropagation();
          this.showMenu(id);
        };
      });
    };

    document.querySelectorAll('#studyTabs .tab').forEach((tab) => {
      tab.onclick = () => {
        if (tab.id === 'addSubjectTab') {
          this.showAddSubject();
          return;
        }
        document.querySelectorAll('#studyTabs .tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderList();
      };
    });

    renderList();
  },

  /* 添加学科弹窗 */
  showAddSubject() {
    const body = `
      <div class="form-row">
        <label class="label">学科名称</label>
        <input class="field" id="subj_name" placeholder="如：日语、Python编程..." maxlength="20">
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="subj_cancel">取消</button>
        <button class="btn btn-primary" id="subj_save">添加</button>
      </div>
      ${this.subjects.length > 1 ? `
        <div class="section-title" style="margin-top:18px">当前学科（点击可删除）</div>
        <div id="subjList">
          ${this.subjects.map((s) => `
            <div class="list-item" style="padding:10px 14px;margin-bottom:6px;">
              <div class="li-row">
                <span style="flex:1;font-size:14px;">${s}</span>
                <button class="icon-btn subj-del" data-subj="${s}" style="width:30px;height:30px;font-size:12px;color:var(--rust)">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
    UI.showSheet('📚 管理学科', body, (root) => {
      root.querySelector('#subj_cancel').onclick = () => UI.hideSheet();
      root.querySelector('#subj_save').onclick = () => {
        const name = root.querySelector('#subj_name').value.trim();
        if (!name) {
          UI.toast('请输入学科名称');
          return;
        }
        if (this.addSubject(name)) {
          UI.hideSheet();
          UI.toast(`已添加学科：${name}`);
          this.list();
        }
      };
      root.querySelectorAll('.subj-del').forEach((btn) => {
        btn.onclick = async () => {
          const subj = btn.dataset.subj;
          const tasks = await db.query(db.STORES.study, (s) => s.subject === subj);
          if (tasks.length > 0) {
            UI.toast(`该学科下有 ${tasks.length} 个任务，无法删除`);
            return;
          }
          if (await UI.confirm(`确认删除学科「${subj}」？`)) {
            this.removeSubject(subj);
            UI.hideSheet();
            UI.toast('已删除');
            this.list();
          }
        };
      });
    });
  },

  /* 渲染总 streak 概览：合并所有任务的打卡日期，计算全局连续天数 */
  async renderOverview() {
    const el = document.getElementById('studyOverview');
    const all = await db.all(db.STORES.study);

    // 合并所有打卡日期
    const allDates = new Set();
    all.forEach((s) => (s.checkins || []).forEach((c) => allDates.add(c.date)));

    // 当前总 streak
    let totalStreak = 0;
    const d = new Date();
    if (!allDates.has(UI.formatDate(d.getTime()))) {
      d.setDate(d.getDate() - 1);
    }
    while (allDates.has(UI.formatDate(d.getTime()))) {
      totalStreak++;
      d.setDate(d.getDate() - 1);
    }

    // 总打卡天数
    const totalDays = allDates.size;

    // 今日已打卡任务数
    const today = UI.todayStr();
    const todayCount = all.filter((s) => s.checkins?.some((c) => c.date === today)).length;

    el.innerHTML = `
      <div class="so-main">
        <div class="so-streak">
          <span class="so-fire">🔥</span>
          <span class="so-num">${totalStreak}</span>
          <span class="so-label">天连续学习</span>
        </div>
        <div class="so-stats">
          <div class="so-stat"><span class="n">${totalDays}</span><span class="l">总打卡</span></div>
          <div class="so-stat"><span class="n">${todayCount}</span><span class="l">今日</span></div>
          <div class="so-stat"><span class="n">${all.length}</span><span class="l">任务</span></div>
        </div>
      </div>
    `;
  },

  async toggleDone(id) {
    const s = await db.get(db.STORES.study, id);
    s.done = !s.done;
    await db.put(db.STORES.study, s);
    this.list();
  },

  showMenu(id) {
    const body = `
      <div class="choice-grid">
        <button class="choice" data-act="edit">✏️ 编辑</button>
        <button class="choice" data-act="checkin">📅 打卡</button>
        <button class="choice" data-act="ai">🤖 AI 辅导</button>
        <button class="choice" data-act="del" style="color:var(--rust)">🗑 删除</button>
      </div>
    `;
    UI.showSheet('操作', body, (root) => {
      root.querySelector('[data-act="edit"]').onclick = () => {
        UI.hideSheet();
        this.edit(id);
      };
      root.querySelector('[data-act="checkin"]').onclick = () => {
        UI.hideSheet();
        this.checkin(id);
      };
      root.querySelector('[data-act="ai"]').onclick = () => {
        UI.hideSheet();
        this.aiHelp(id);
      };
      root.querySelector('[data-act="del"]').onclick = async () => {
        UI.hideSheet();
        if (await UI.confirm('确定删除这个学习任务吗？相关资料与打卡记录也将删除。')) {
          await db.remove(db.STORES.study, id);
          this.list();
        }
      };
    });
  },

  edit(id) {
    const isEdit = !!id;
    this.loadSubjects();
    const data = isEdit ? null : { title: '', subject: this.subjects[0] || '其他', note: '', goal: '', materials: [] };

    const body = `
      <div class="form-row">
        <label class="label">学习任务标题</label>
        <input class="field" id="f_title" placeholder="如：LEC 真题第 5 套" maxlength="50">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">学科分类</label>
          <select class="field" id="f_subject">
            ${this.subjects.map((s) => `<option value="${s}">${s}</option>`).join('')}
            <option value="__add_new__">＋ 新增学科...</option>
          </select>
        </div>
        <div>
          <label class="label">每日目标</label>
          <input class="field" id="f_goal" placeholder="如：30 分钟" maxlength="20">
        </div>
      </div>
      <div class="form-row">
        <label class="label">备注</label>
        <textarea class="field" id="f_note" placeholder="学习要点、进度安排..." maxlength="200"></textarea>
      </div>
      <div class="form-row">
        <label class="label">学习资料</label>
        <div class="img-grid" id="matGrid">
          <div class="upload-trigger" id="matAdd">＋<span>上传资料</span></div>
        </div>
        <div style="font-size:11px;color:var(--ink-mute);margin-top:6px">支持图片资料（笔记、截图、书页等）</div>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="f_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="f_save">${isEdit ? '保存' : '添加'}</button>
      </div>
    `;

    UI.showSheet(isEdit ? '编辑学习任务' : '新建学习任务', body, async (root) => {
      let materials = [];
      if (isEdit) {
        const s = await db.get(db.STORES.study, id);
        Object.assign(data, s);
        root.querySelector('#f_title').value = s.title || '';
        root.querySelector('#f_subject').value = s.subject || this.subjects[0];
        root.querySelector('#f_goal').value = s.goal || '';
        root.querySelector('#f_note').value = s.note || '';
        materials = [...(s.materials || [])];
        renderMats();
      }

      // 学科下拉：选择「新增学科」时弹出输入框
      root.querySelector('#f_subject').onchange = (e) => {
        if (e.target.value === '__add_new__') {
          const name = prompt('请输入新学科名称：');
          if (name && name.trim()) {
            if (this.addSubject(name.trim())) {
              const sel = root.querySelector('#f_subject');
              sel.innerHTML = this.subjects.map((s) => `<option value="${s}">${s}</option>`).join('') + '<option value="__add_new__">＋ 新增学科...</option>';
              sel.value = name.trim();
              UI.toast(`已添加学科：${name.trim()}`);
            } else {
              e.target.value = this.subjects[0];
            }
          } else {
            e.target.value = this.subjects[0];
          }
        }
      };

      function renderMats() {
        const grid = root.querySelector('#matGrid');
        const addBtn = '<div class="upload-trigger" id="matAdd">＋<span>上传资料</span></div>';
        grid.innerHTML =
          materials
            .map(
              (m, i) => `
          <div class="img-cell">
            <img src="${m}" alt="资料">
            <button class="del" data-i="${i}">✕</button>
          </div>`
            )
            .join('') + addBtn;
        grid.querySelectorAll('.del').forEach((d) => {
          d.onclick = () => {
            materials.splice(+d.dataset.i, 1);
            renderMats();
          };
        });
        root.querySelector('#matAdd').onclick = async () => {
          const imgs = await UI.pickImages(9);
          materials.push(...imgs);
          renderMats();
        };
      }

      root.querySelector('#f_save').onclick = async () => {
        const title = root.querySelector('#f_title').value.trim();
        if (!title) {
          UI.toast('请输入任务标题');
          return;
        }
        const payload = {
          title,
          subject: root.querySelector('#f_subject').value,
          goal: root.querySelector('#f_goal').value.trim(),
          note: root.querySelector('#f_note').value.trim(),
          materials
        };
        if (isEdit) {
          Object.assign(data, payload);
          await db.put(db.STORES.study, data);
        } else {
          await db.add(db.STORES.study, { ...payload, done: false, checkins: [] });
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加');
        this.list();
      };

      if (isEdit) {
        root.querySelector('#f_cancel').onclick = () => UI.hideSheet();
      }
    });
  },

  async detail(id) {
    App.setActiveNav('study');
    const s = await db.get(db.STORES.study, id);
    if (!s) return router.navigate('study');

    const main = document.getElementById('appMain');
    App.setFab(() => this.checkin(id));

    const today = UI.todayStr();
    const checkedToday = s.checkins?.some((c) => c.date === today);
    const streak = this.calcStreak(s.checkins);
    const maxStreak = this.calcMaxStreak(s.checkins);
    const unlocked = this.unlockedBadges(streak, maxStreak);

    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" data-act="back">‹ 返回</button>
        <div class="card" style="padding: 16px; margin-bottom: 14px;">
          <div class="tape green" style="top:-8px;left:20px;"></div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span class="chip red">${s.subject}</span>
            ${s.done ? '<span class="chip green">已完成</span>' : ''}
            ${checkedToday ? '<span class="chip yellow">今日已打卡</span>' : ''}
          </div>
          <h2 style="font-family:var(--font-display);font-size:22px;color:var(--ink);margin-bottom:6px">${s.title}</h2>
          ${s.goal ? `<div style="font-size:13px;color:var(--ink-soft)">🎯 每日目标：${s.goal}</div>` : ''}
          ${s.note ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:8px;line-height:1.6">${s.note}</div>` : ''}
          <div style="display:flex;gap:8px;margin-top:14px;">
            <button class="btn btn-primary" id="btnCheckin" style="flex:1">📅 ${checkedToday ? '今日已打卡' : '今日打卡'}</button>
            <button class="btn btn-jade" id="btnAi" style="flex:1">🤖 AI 辅导</button>
          </div>
        </div>

        <!-- AI 学习工具箱 -->
        <div class="section-title">🤖 AI 学习工具</div>
        <div class="ai-tool-grid">
          <button class="ai-tool-card" data-tool="quiz">
            <div class="atc-icon">✍️</div>
            <div class="atc-name">自动出题</div>
            <div class="atc-desc">根据资料生成测验</div>
          </button>
          <button class="ai-tool-card" data-tool="plan">
            <div class="atc-icon">📅</div>
            <div class="atc-name">计划拆解</div>
            <div class="atc-desc">输入考试日期生成</div>
          </button>
          <button class="ai-tool-card" data-tool="mindmap">
            <div class="atc-icon">🧠</div>
            <div class="atc-name">思维导图</div>
            <div class="atc-desc">整理知识结构</div>
          </button>
        </div>

        <!-- 连续打卡状态 -->
        <div class="study-streak-box">
          <div class="ssb-main">
            <div class="ssb-streak">
              <span class="ssb-fire">🔥</span>
              <div>
                <div class="ssb-num">${streak}</div>
                <div class="ssb-label">当前连续</div>
              </div>
            </div>
            <div class="ssb-max">
              <div class="ssb-max-num">${maxStreak}</div>
              <div class="ssb-max-label">历史最长</div>
            </div>
          </div>
          <div class="ssb-progress">
            ${this.renderStreakBar(streak, maxStreak)}
          </div>
        </div>

        <!-- 徽章墙 -->
        <div class="section-title">🎖️ 成就徽章</div>
        <div class="badge-row" id="badgeWall">
          ${this.renderBadges(unlocked)}
        </div>

        <div class="section-title">📅 打卡日历</div>
        <div class="card" style="padding:14px;" id="calBox"></div>

        ${s.materials?.length ? `
          <div class="section-title">📎 学习资料（${s.materials.length}）</div>
          <div class="img-grid">
            ${s.materials.map((m) => `<div class="img-cell"><img src="${m}" alt="资料"></div>`).join('')}
          </div>` : ''}

        <div class="section-title">📝 打卡记录</div>
        <div id="checkinList"></div>
      </div>
    `;

    main.querySelector('[data-act="back"]').onclick = () => router.navigate('study');
    main.querySelector('#btnCheckin').onclick = () => this.checkin(id);
    main.querySelector('#btnAi').onclick = () => this.aiHelp(id);

    // AI 工具箱
    main.querySelectorAll('.ai-tool-card').forEach((card) => {
      card.onclick = () => {
        const tool = card.dataset.tool;
        if (tool === 'quiz') this.aiQuiz(id);
        else if (tool === 'plan') this.aiPlan(id);
        else if (tool === 'mindmap') this.aiMindMap(id);
      };
    });

    this.renderCalendar(s);
    this.renderCheckinList(s);
  },

  /* 渲染徽章墙 */
  renderBadges(unlocked) {
    const unlockedSet = new Set(unlocked.map((b) => b.days));
    return this.badges
      .map((b) => {
        const isUnlocked = unlockedSet.has(b.days);
        return `
        <div class="badge ${isUnlocked ? 'unlocked' : ''}">
          <div class="b-circle">${b.icon}</div>
          <div class="b-name">${b.name}</div>
          <div class="b-desc">${b.days}天</div>
        </div>`;
      })
      .join('');
  },

  /* 渲染连续打卡进度条（向下一徽章） */
  renderStreakBar(streak, maxStreak) {
    const best = Math.max(streak, maxStreak);
    let nextBadge = this.badges.find((b) => b.days > best);
    let prevDays = 0;
    if (nextBadge) {
      const idx = this.badges.indexOf(nextBadge);
      prevDays = idx > 0 ? this.badges[idx - 1].days : 0;
    } else {
      nextBadge = this.badges[this.badges.length - 1];
      prevDays = this.badges[this.badges.length - 2]?.days || 0;
    }
    const range = nextBadge.days - prevDays;
    const cur = Math.min(best, nextBadge.days) - prevDays;
    const pct = range > 0 ? Math.round((cur / range) * 100) : 100;

    if (best >= this.badges[this.badges.length - 1].days) {
      return `<div class="ssb-bar-track"><div class="ssb-bar-fill" style="width:100%"></div></div>
              <div class="ssb-bar-text">已达最高徽章 💎 传奇</div>`;
    }
    return `<div class="ssb-bar-track"><div class="ssb-bar-fill" style="width:${pct}%"></div></div>
            <div class="ssb-bar-text">距下一徽章 ${nextBadge.icon} ${nextBadge.name} 还需 ${nextBadge.days - best} 天</div>`;
  },

  renderCalendar(s) {
    const box = document.getElementById('calBox');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const checkinDates = new Set((s.checkins || []).map((c) => c.date));

    let html = `<div style="text-align:center;font-family:var(--font-display);font-size:16px;margin-bottom:10px;color:var(--ink)">${year}年 ${month + 1}月</div>`;
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center;">';
    ['日', '一', '二', '三', '四', '五', '六'].forEach((d) => {
      html += `<div style="font-size:11px;color:var(--ink-mute);padding:4px 0;">${d}</div>`;
    });
    for (let i = 0; i < firstDay; i++) html += '<div></div>';
    for (let d = 1; d <= days; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const checked = checkinDates.has(dateStr);
      const isToday = dateStr === UI.todayStr();
      html += `<div style="
        aspect-ratio:1; display:flex; align-items:center; justify-content:center;
        font-size:12px; border-radius:50%;
        background: ${checked ? 'var(--forest)' : isToday ? 'var(--paper-deep)' : 'transparent'};
        color: ${checked ? 'var(--paper-light)' : 'var(--ink)'};
        border: ${isToday && !checked ? '1.5px solid var(--forest)' : 'none'};
        font-weight: ${isToday ? '700' : '400'};
      ">${d}</div>`;
    }
    html += '</div>';
    html += `<div style="font-size:11px;color:var(--ink-mute);margin-top:10px;text-align:center;">本月已打卡 ${[...checkinDates].filter(d => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length} 天</div>`;
    box.innerHTML = html;
  },

  renderCheckinList(s) {
    const el = document.getElementById('checkinList');
    const checkins = (s.checkins || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    if (checkins.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">🌱</div><div class="hint">还没有打卡记录，开始第一步吧</div></div>`;
      return;
    }
    el.innerHTML = checkins
      .map(
        (c) => `
      <div class="list-item">
        <div class="li-row">
          <span style="font-size:18px">✅</span>
          <div style="flex:1">
            <div class="li-title" style="font-size:14px">${c.date}</div>
            ${c.note ? `<div class="li-sub">${c.note}</div>` : ''}
          </div>
          <span class="chip green">${c.duration || ''}</span>
        </div>
      </div>`
      )
      .join('');
  },

  async checkin(id) {
    const s = await db.get(db.STORES.study, id);
    const today = UI.todayStr();
    if (s.checkins?.some((c) => c.date === today)) {
      UI.toast('今天已经打过卡啦');
      return;
    }
    const body = `
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:40px">🎉</div>
        <div style="font-family:var(--font-display);font-size:18px;color:var(--ink);margin-top:6px">${today} 打卡</div>
        <div style="font-size:12px;color:var(--ink-mute);margin-top:2px">${s.title}</div>
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">学习时长</label>
          <input class="field" id="c_dur" placeholder="如 45 分钟">
        </div>
        <div>
          <label class="label">心情</label>
          <select class="field" id="c_mood">
            <option>😊 充实</option>
            <option>😌 平静</option>
            <option>🤔 思考</option>
            <option>😴 疲惫</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label class="label">今日收获（可选）</label>
        <textarea class="field" id="c_note" placeholder="学到了什么？有什么困惑？" maxlength="200"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="c_cancel">取消</button>
        <button class="btn btn-primary" id="c_save">✓ 确认打卡</button>
      </div>
    `;
    UI.showSheet('学习打卡', body, (root) => {
      root.querySelector('#c_save').onclick = async () => {
        s.checkins = s.checkins || [];
        s.checkins.push({
          date: today,
          duration: root.querySelector('#c_dur').value.trim(),
          mood: root.querySelector('#c_mood').value,
          note: root.querySelector('#c_note').value.trim()
        });
        await db.put(db.STORES.study, s);

        // 检查是否解锁新徽章
        const newStreak = this.calcStreak(s.checkins);
        const maxStreak = this.calcMaxStreak(s.checkins);
        const best = Math.max(newStreak, maxStreak);
        const justUnlocked = this.badges.find((b) => b.days === best);

        UI.hideSheet();
        if (justUnlocked) {
          UI.toast(`🎖️ 解锁徽章：${justUnlocked.icon} ${justUnlocked.name}！`);
        } else {
          UI.toast('打卡成功，继续加油！');
        }
        this.detail(id);
      };
      root.querySelector('#c_cancel').onclick = () => UI.hideSheet();
    });
  },

  async aiHelp(id) {
    const s = await db.get(db.STORES.study, id);
    const body = `
      <div style="font-size:13px;color:var(--ink-soft);margin-bottom:12px">
        向 AI 提问关于 <b>${s.title}</b>（${s.subject}）的问题
      </div>
      <div class="ai-quick-tags">
        <button class="ai-tag" data-prompt="请讲解这个知识点的核心要点，并举一个例子帮助理解">📖 知识点讲解</button>
        <button class="ai-tag" data-prompt="请根据这个学习任务出 3 道自测题（含答案），帮我检验掌握程度">✍️ 出题自测</button>
        <button class="ai-tag" data-prompt="请帮我梳理这个主题的知识框架，列出重点和难点">🧠 梳理框架</button>
      </div>
      <div class="form-row">
        <textarea class="field" id="ai_q" placeholder="或直接输入你的问题..." rows="3"></textarea>
      </div>
      <div class="form-row">
        <button class="btn btn-jade" id="ai_send" style="width:100%">🤖 向 AI 提问</button>
      </div>
      <div id="ai_out"></div>
    `;
    UI.showSheet('🤖 AI 学习辅导', body, (root) => {
      // 快捷标签
      root.querySelectorAll('.ai-tag').forEach((tag) => {
        tag.onclick = () => {
          root.querySelector('#ai_q').value = tag.dataset.prompt;
          root.querySelector('#ai_q').focus();
        };
      });
      root.querySelector('#ai_send').onclick = async () => {
        const q = root.querySelector('#ai_q').value.trim();
        if (!q) {
          UI.toast('请输入问题');
          return;
        }
        const out = root.querySelector('#ai_out');
        out.innerHTML = `<div class="ai-bubble loading">正在思考你的问题</div>`;
        const context = `学科：${s.subject}，任务：${s.title}${s.note ? '，备注：' + s.note : ''}`;
        const answer = await AI.generate(q, context);
        out.innerHTML = `<div class="ai-bubble">${this.formatAiAnswer(answer)}</div>`;
      };
    });
  },

  /* AI 自动出题测验 */
  async aiQuiz(id) {
    const s = await db.get(db.STORES.study, id);
    const body = `
      <div style="font-size:13px;color:var(--ink-soft);margin-bottom:12px">
        将根据 <b>${s.title}</b>（${s.subject}）的内容自动生成 5 道自测题
      </div>
      <div id="quizLoading" style="text-align:center;padding:20px 0;">
        <div class="spinner" style="margin:0 auto 10px"></div>
        <div style="font-size:12px;color:var(--ink-mute)">AI 正在出题...</div>
      </div>
      <div id="quizContent"></div>
    `;
    UI.showSheet('✍️ AI 自动出题', body, async (root) => {
      const questions = await AI.generateQuiz(s);
      root.querySelector('#quizLoading').style.display = 'none';
      this.renderQuiz(root.querySelector('#quizContent'), questions);
    });
  },

  renderQuiz(container, questions) {
    let answers = {};
    questions.forEach((q, i) => {
      answers[i] = null;
    });

    const render = () => {
      container.innerHTML = `
        <div class="quiz-list">
          ${questions
            .map((q, i) => {
              const typeLabel = q.type === 'choice' ? '选择题' : q.type === 'judge' ? '判断题' : '简答题';
              return `
            <div class="quiz-item">
              <div class="qi-head">
                <span class="qi-num">${i + 1}</span>
                <span class="qi-type">${typeLabel}</span>
              </div>
              <div class="qi-question">${q.q}</div>
              <div class="qi-options">
                ${(q.options || [])
                  .map(
                    (opt) => `
                  <button class="qi-opt" data-q="${i}" data-opt="${opt}">${opt}</button>`
                  )
                  .join('')}
              </div>
              ${q.type === 'short' ? `<textarea class="field qi-short" data-q="${i}" placeholder="请输入你的答案..." rows="2"></textarea>` : ''}
              <div class="qi-result" data-q="${i}"></div>
            </div>`;
            })
            .join('')}
        </div>
        <button class="btn btn-primary" id="quizSubmit" style="width:100%;margin-top:14px">提交并查看答案</button>
      `;

      container.querySelectorAll('.qi-opt').forEach((btn) => {
        btn.onclick = () => {
          const qi = btn.dataset.q;
          const opt = btn.dataset.opt;
          answers[qi] = opt;
          container.querySelectorAll(`.qi-opt[data-q="${qi}"]`).forEach((b) => b.classList.remove('selected'));
          btn.classList.add('selected');
        };
      });

      container.querySelectorAll('.qi-short').forEach((ta) => {
        ta.oninput = () => {
          answers[ta.dataset.q] = ta.value.trim();
        };
      });

      container.querySelector('#quizSubmit').onclick = () => {
        let score = 0;
        questions.forEach((q, i) => {
          const resultEl = container.querySelector(`.qi-result[data-q="${i}"]`);
          const userAns = answers[i];
          if (!userAns) {
            resultEl.innerHTML = `<div class="qi-ans skipped">⏭ 未作答</div><div class="qi-explain">正确答案：${q.answer}</div>`;
          } else {
            // 简答题不计分
            if (q.type === 'short') {
              resultEl.innerHTML = `<div class="qi-ans info">📝 参考答案</div><div class="qi-explain">${q.answer}</div>`;
            } else {
              const correct = userAns.startsWith(q.answer) || userAns === q.answer;
              if (correct) score++;
              resultEl.innerHTML = `
                <div class="qi-ans ${correct ? 'correct' : 'wrong'}">${correct ? '✓ 回答正确' : '✗ 回答错误'}</div>
                <div class="qi-explain">你的答案：${userAns}<br>正确答案：${q.answer}<br>解析：${q.explain}</div>
              `;
            }
          }
          resultEl.style.display = 'block';
        });
        const graded = questions.filter((q) => q.type !== 'short').length;
        container.querySelector('#quizSubmit').style.display = 'none';
        container.insertAdjacentHTML(
          'beforeend',
          `<div class="quiz-score">客观题得分：${score} / ${graded}</div>`
        );
        UI.toast(`测验完成，得分 ${score}/${graded}`);
      };
    };
    render();
  },

  /* AI 学习计划拆解 */
  async aiPlan(id) {
    const s = await db.get(db.STORES.study, id);
    const today = UI.todayStr();
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    const defaultDateStr = `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, '0')}-${String(defaultDate.getDate()).padStart(2, '0')}`;

    const body = `
      <div style="font-size:13px;color:var(--ink-soft);margin-bottom:12px">
        为 <b>${s.title}</b> 制定每日学习计划，自动推送到打卡
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">考试日期</label>
          <input class="field" id="p_date" type="date" value="${defaultDateStr}">
        </div>
        <div>
          <label class="label">每日时长（分钟）</label>
          <input class="field" id="p_min" type="number" value="45" min="10" max="300">
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="p_cancel">取消</button>
        <button class="btn btn-primary" id="p_gen">生成计划</button>
      </div>
      <div id="planResult" style="margin-top:14px"></div>
    `;
    UI.showSheet('📅 学习计划拆解', body, (root) => {
      root.querySelector('#p_cancel').onclick = () => UI.hideSheet();
      root.querySelector('#p_gen').onclick = async () => {
        const examDate = root.querySelector('#p_date').value;
        const dailyMin = parseInt(root.querySelector('#p_min').value) || 45;
        if (!examDate) return UI.toast('请选择考试日期');

        const resultEl = root.querySelector('#planResult');
        resultEl.innerHTML = `<div style="text-align:center;padding:20px 0"><div class="spinner" style="margin:0 auto 10px"></div><div style="font-size:12px;color:var(--ink-mute)">AI 正在拆解学习计划...</div></div>`;

        const plan = await AI.generatePlan(s, examDate, dailyMin);
        this.renderPlan(resultEl, plan, id);
      };
    });
  },

  renderPlan(container, plan, taskId) {
    const days = plan.length;
    container.innerHTML = `
      <div style="background:var(--forest-mist);border-radius:8px;padding:10px 12px;margin-bottom:12px">
        <div style="font-family:var(--font-display);font-size:14px;color:var(--forest)">共 ${days} 天计划</div>
        <div style="font-size:11px;color:var(--ink-soft);margin-top:2px">点击下方按钮将计划推送到学习打卡</div>
      </div>
      <div class="plan-list" style="max-height:300px;overflow-y:auto">
        ${plan
          .map(
            (p) => `
          <div class="plan-item type-${p.type}">
            <div class="pi-day">D${p.day}</div>
            <div class="pi-content">
              <div class="pi-date">${p.date}</div>
              <div class="pi-topic">${p.topic}</div>
              <div class="pi-task">${p.task}</div>
            </div>
            <span class="pi-badge ${p.type}">${p.type === 'learn' ? '学' : p.type === 'review' ? '复' : '模'}</span>
          </div>`
          )
          .join('')}
      </div>
      <button class="btn btn-primary" id="planPush" style="width:100%;margin-top:12px">📅 推送到每日打卡</button>
    `;

    container.querySelector('#planPush').onclick = async () => {
      const task = await db.get(db.STORES.study, taskId);
      // 将计划存入任务的 studyPlan 字段
      task.studyPlan = plan;
      task.examDate = plan[plan.length - 1]?.date;
      await db.put(db.STORES.study, task);
      UI.hideSheet();
      UI.toast(`已推送 ${days} 天学习计划到打卡`);
    };
  },

  /* AI 思维导图 */
  async aiMindMap(id) {
    const s = await db.get(db.STORES.study, id);
    const body = `
      <div style="font-size:13px;color:var(--ink-soft);margin-bottom:12px">
        为 <b>${s.title}</b>（${s.subject}）生成知识结构思维导图
      </div>
      <div id="mmLoading" style="text-align:center;padding:20px 0;">
        <div class="spinner" style="margin:0 auto 10px"></div>
        <div style="font-size:12px;color:var(--ink-mute)">AI 正在梳理知识结构...</div>
      </div>
      <div id="mmContent"></div>
    `;
    UI.showSheet('🧠 思维导图', body, async (root) => {
      const mindMap = await AI.generateMindMap(s);
      root.querySelector('#mmLoading').style.display = 'none';
      this.renderMindMap(root.querySelector('#mmContent'), mindMap);
    });
  },

  renderMindMap(container, data) {
    container.innerHTML = `
      <div class="mindmap-box" id="mindmapBox"></div>
      <div style="font-size:11px;color:var(--ink-mute);text-align:center;margin-top:10px;font-family:var(--font-hand)">中心节点向外展开，点击节点可展开/收起</div>
    `;
    const box = container.querySelector('#mindmapBox');

    const renderNode = (node, isRoot = false, level = 0) => {
      const colors = ['var(--forest)', 'var(--forest-soft)', 'var(--gold)', 'var(--rust)'];
      const color = colors[Math.min(level, colors.length - 1)];
      const childrenHtml =
        node.children && node.children.length
          ? `<div class="mm-children">${node.children.map((c) => renderNode(c, false, level + 1)).join('')}</div>`
          : '';
      return `
        <div class="mm-node ${isRoot ? 'root' : ''}" style="--node-color:${color}">
          <div class="mm-label">${node.title}</div>
          ${childrenHtml}
        </div>
      `;
    };

    box.innerHTML = renderNode(data, true);

    // 节点点击展开/收起
    box.querySelectorAll('.mm-node').forEach((node) => {
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
  },

  /* 格式化 AI 回答：支持简单的标题/列表 */
  formatAiAnswer(text) {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/###\s(.+)/g, '<div style="font-family:var(--font-display);color:var(--forest);margin-top:8px">$1</div>')
      .replace(/^(\d+[.、])\s/gm, '<br>$1 ');
  }
};

router.register('study', () => Study.list());
router.register('study/*', (param) => {
  const [action, id] = param.split('/');
  if (action === 'detail' && id) Study.detail(id);
  else Study.list();
});
