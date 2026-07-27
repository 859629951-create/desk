/* ============================================
   学习中心 v5
   - 语言：多邻国打卡 + 自定义语言科目（英语/法语等）+ 学习任务记录
   - 专业：专业科目（商法/民法/LEC等）+ 学习任务打卡 + 读书计划 + 文献阅读
   - 研究生：论文进度 + 课程表（学期/当前周）+ 上课记录 + 思维导图
   - 每日新闻热点：DeepSeek API 每天 10 条
   ============================================ */

const StudyCenter = {
  tabs: [
    { key: 'language', label: '语言', icon: '🌍' },
    { key: 'professional', label: '专业', icon: '📚' },
    { key: 'graduate', label: '研究生', icon: '🎓' },
    { key: 'news', label: '新闻', icon: '📰' }
  ],

  currentTab: 'language',

  async list() {
    App.setActiveNav('study');
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="fade-up">
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
    else if (tab === 'professional') this.renderProfessional();
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

    // 各科目任务统计
    const allTasks = await db.all(db.STORES.languageTask);

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

      <!-- 添加科目按钮 -->
      <button class="btn btn-jade" id="addSubject" style="width:100%;margin-bottom:12px;">＋ 添加科目</button>
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
    this.renderLanguageSubjects(subjects, allTasks);
  },

  async renderLanguageSubjects(subjects, allTasks) {
    const el = document.getElementById('subjectList');
    if (!el) return;
    if (subjects.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">🌍</div><div class="hint">添加语言科目（英语、法语、日语等），记录学习进度</div></div>`;
      return;
    }
    el.innerHTML = subjects.map(s => {
      const sTasks = allTasks.filter(t => t.subjectId === s.id);
      const doneCount = sTasks.filter(t => t.done).length;
      return `
        <div class="list-item" data-id="${s.id}" style="margin-bottom:10px;cursor:pointer;">
          <div class="li-row">
            <span style="font-size:20px">${s.icon || '📖'}</span>
            <div style="flex:1">
              <div class="li-title">${s.name}</div>
              <div class="li-tags">
                <span class="chip gray">${sTasks.length} 个任务</span>
                ${doneCount > 0 ? `<span class="chip green">✓ ${doneCount} 完成</span>` : ''}
              </div>
            </div>
            <button class="icon-btn" data-act="menu" data-sid="${s.id}" style="width:32px;height:32px;font-size:14px">⋯</button>
          </div>
        </div>
      `;
    }).join('');

    el.querySelectorAll('.list-item').forEach(item => {
      const id = item.dataset.id;
      item.querySelector('[data-act="menu"]').onclick = (e) => {
        e.stopPropagation();
        this.subjectMenu(id);
      };
      item.onclick = (e) => {
        if (e.target.closest('[data-act="menu"]')) return;
        this.showSubjectDetail(id);
      };
    });
  },

  async showSubjectDetail(subjectId) {
    const subject = await db.get(db.STORES.languageSubject, subjectId);
    const allTasks = await db.all(db.STORES.languageTask);
    const tasks = allTasks.filter(t => t.subjectId === subjectId).sort((a, b) => {
      // 未完成排前面，高优先级排前面
      if ((a.done || false) !== (b.done || false)) return (a.done || false) ? 1 : -1;
      const prioMap = { '高': 0, '中': 1, '低': 2 };
      return (prioMap[a.priority] || 2) - (prioMap[b.priority] || 2);
    });
    const totalCount = tasks.length;
    const doneCount = tasks.filter(t => t.done).length;
    const main = document.getElementById('appMain');

    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" id="sdBack">‹ 返回</button>
        <div class="card" style="padding:16px;margin-bottom:14px;">
          <h2 style="font-family:var(--font-display);font-size:20px;">${subject?.icon || '📖'} ${subject?.name || '科目'}</h2>
          <div class="li-tags" style="margin-top:8px">
            <span class="chip gray">${totalCount} 个任务</span>
            <span class="chip green">✓ ${doneCount} 完成</span>
          </div>
        </div>
        <div id="taskList"></div>
      </div>
    `;
    document.getElementById('sdBack').onclick = () => this.goBack('language');

    // 设置 FAB 用于添加任务
    App.setFab(() => this.showTaskDetail(subjectId, null));

    const today = UI.todayStr();
    const renderTasks = () => {
      const listEl = document.getElementById('taskList');
      if (!listEl) return;
      if (tasks.length === 0) {
        listEl.innerHTML = `<div class="empty"><div class="emoji">📋</div><div class="hint">还没有任务，点击 + 添加</div></div>`;
        return;
      }
      const prioColorMap = { '高': 'var(--cinnabar)', '中': 'var(--gold)', '低': 'var(--ink-mute)' };
      const freqLabelMap = { '每天': '每天', '每周': '每周', '自定义': '自定义' };
      listEl.innerHTML = tasks.map(t => {
        const prioColor = prioColorMap[t.priority] || 'var(--ink-mute)';
        const freqLabel = freqLabelMap[t.frequency] || (t.customFreq || '');
        const tCheckins = t.checkins || [];
        const tCheckedToday = tCheckins.some(c => c.date === today);
        const tStreak = this._calcStreak(tCheckins);
        return `
          <div class="list-item" data-tid="${t.id}" style="margin-bottom:8px;cursor:pointer;${t.done ? 'opacity:0.6;' : ''}">
            <div class="li-row">
              <div style="width:4px;height:32px;border-radius:2px;background:${prioColor};margin-right:10px;flex-shrink:0;"></div>
              <button class="check ${t.done ? 'done' : ''}" data-act="toggle" data-tid="${t.id}" style="width:22px;height:22px;border-width:1.5px;flex-shrink:0;">✓</button>
              <div style="flex:1">
                <div class="li-title" style="${t.done ? 'text-decoration:line-through;' : ''}">${t.content}</div>
                <div class="li-tags" style="margin-top:4px">
                  ${freqLabel ? `<span class="chip gray">${freqLabel}</span>` : ''}
                  ${tStreak > 0 ? `<span class="chip yellow">🔥${tStreak}</span>` : ''}
                  ${tCheckedToday ? '<span class="chip green">✓ 今日已打卡</span>' : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // 勾选完成/取消完成
      listEl.querySelectorAll('[data-act="toggle"]').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const tid = btn.dataset.tid;
          const task = await db.get(db.STORES.languageTask, tid);
          task.done = !task.done;
          await db.put(db.STORES.languageTask, task);
          // 更新本地数组
          const localTask = tasks.find(t => t.id === tid);
          if (localTask) localTask.done = task.done;
          renderTasks();
        };
      });

      // 点击任务卡片打开详情
      listEl.querySelectorAll('.list-item').forEach(item => {
        item.onclick = (e) => {
          if (e.target.closest('[data-act="toggle"]')) return;
          this.showTaskDetail(subjectId, item.dataset.tid);
        };
      });
    };

    renderTasks();
  },

  /* 任务编辑弹窗（新建/编辑共用） */
  _showTaskEditor(subjectId, taskId) {
    const isEdit = !!taskId;
    const body = `
      <div class="form-row">
        <label class="label">任务内容 *</label>
        <textarea class="field" id="tf_content" placeholder="如：背 50 个单词、做 2 篇阅读理解" rows="3" maxlength="200"></textarea>
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">执行频次</label>
          <select class="field" id="tf_freq">
            <option value="每天">每天</option>
            <option value="每周">每周</option>
            <option value="自定义">自定义</option>
          </select>
        </div>
        <div>
          <label class="label">优先级</label>
          <select class="field" id="tf_prio">
            <option value="中">中</option>
            <option value="高">高</option>
            <option value="低">低</option>
          </select>
        </div>
      </div>
      <div class="form-row" id="tf_custom_row" style="display:none;">
        <label class="label">自定义频次描述</label>
        <input class="field" id="tf_custom" placeholder="如：每周一三五" maxlength="30">
      </div>
      <div class="form-row">
        <label class="label">备注</label>
        <textarea class="field" id="tf_note" placeholder="可选备注" rows="2" maxlength="200"></textarea>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="tf_del" style="color:var(--cinnabar);flex:1;">🗑 删除</button>' : ''}
        <button class="btn btn-ghost" id="tf_cancel">${isEdit ? '取消' : '取消'}</button>
        <button class="btn btn-primary" id="tf_save">${isEdit ? '保存' : '添加任务'}</button>
      </div>
    `;

    UI.showSheet(isEdit ? '编辑任务' : '添加任务', body, (root) => {
      let loaded = true;
      const freqSel = root.querySelector('#tf_freq');
      const customRow = root.querySelector('#tf_custom_row');

      freqSel.onchange = () => {
        customRow.style.display = freqSel.value === '自定义' ? '' : 'none';
      };

      root.querySelector('#tf_cancel').onclick = () => UI.hideSheet();

      // 编辑模式：删除按钮
      const delBtn = root.querySelector('#tf_del');
      if (delBtn) {
        delBtn.onclick = async () => {
          if (await UI.confirm('确定删除这个学习任务？打卡记录也将删除。')) {
            await db.remove(db.STORES.languageTask, taskId);
            UI.hideSheet();
            UI.toast('已删除');
            this.showSubjectDetail(subjectId);
          }
        };
      }

      root.querySelector('#tf_save').onclick = async () => {
        if (isEdit && !loaded) {
          UI.toast('数据加载中，请稍候');
          return;
        }
        const content = root.querySelector('#tf_content').value.trim();
        if (!content) {
          UI.toast('请输入任务内容');
          return;
        }
        const frequency = freqSel.value;
        const priority = root.querySelector('#tf_prio').value;
        const customFreq = root.querySelector('#tf_custom').value.trim();
        const note = root.querySelector('#tf_note').value.trim();

        if (isEdit) {
          const task = await db.get(db.STORES.languageTask, taskId);
          Object.assign(task, { content, frequency, customFreq, note, priority });
          await db.put(db.STORES.languageTask, task);
        } else {
          await db.add(db.STORES.languageTask, {
            subjectId, content, frequency, customFreq, note, priority, done: false, checkins: []
          });
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加任务');
        this.showSubjectDetail(subjectId);
      };

      // 编辑模式：异步加载已有数据
      if (isEdit) {
        loaded = false;
        (async () => {
          const task = await db.get(db.STORES.languageTask, taskId);
          if (task) {
            root.querySelector('#tf_content').value = task.content || '';
            root.querySelector('#tf_freq').value = task.frequency || '每天';
            root.querySelector('#tf_prio').value = task.priority || '中';
            root.querySelector('#tf_custom').value = task.customFreq || '';
            root.querySelector('#tf_note').value = task.note || '';
            customRow.style.display = task.frequency === '自定义' ? '' : 'none';
          }
          loaded = true;
        })();
      }
    });
  },

  /* ====== 打卡相关工具方法（从 Study 迁移） ====== */
  _badges: [
    { days: 3, icon: '🌱', name: '初芽', desc: '连续打卡 3 天' },
    { days: 7, icon: '🌿', name: '青苗', desc: '连续打卡 7 天' },
    { days: 14, icon: '🌳', name: '成树', desc: '连续打卡 14 天' },
    { days: 30, icon: '🏆', name: '坚持', desc: '连续打卡 30 天' },
    { days: 60, icon: '👑', name: '王者', desc: '连续打卡 60 天' },
    { days: 100, icon: '💎', name: '传奇', desc: '连续打卡 100 天' }
  ],

  _calcStreak(checkins) {
    if (!checkins || !checkins.length) return 0;
    const dates = new Set(checkins.map(c => c.date));
    let streak = 0;
    const d = new Date();
    if (!dates.has(UI.formatDate(d.getTime()))) d.setDate(d.getDate() - 1);
    while (dates.has(UI.formatDate(d.getTime()))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  },

  _calcMaxStreak(checkins) {
    if (!checkins || !checkins.length) return 0;
    const dates = checkins.map(c => c.date).sort();
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

  _unlockedBadges(streak, maxStreak) {
    const best = Math.max(streak, maxStreak);
    return this._badges.filter(b => best >= b.days);
  },

  _isCheckedToday(checkins, frequency) {
    const today = UI.todayStr();
    if (!frequency || frequency === '每天') {
      return checkins?.some(c => c.date === today);
    }
    if (frequency === '每周') {
      const now = new Date();
      const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek);
      const mondayStr = UI.formatDate(monday.getTime());
      return checkins?.some(c => c.date >= mondayStr && c.date <= today);
    }
    // 自定义频次：只要今天打过卡就算
    return checkins?.some(c => c.date === today);
  },

  /* ====== 任务详情页（全屏，含打卡/徽章/日历/记录） ====== */
  async showTaskDetail(subjectId, taskId) {
    // 如果 taskId 为 null，走编辑弹窗新建
    if (!taskId) {
      this._showTaskEditor(subjectId, null);
      return;
    }

    const task = await db.get(db.STORES.languageTask, taskId);
    if (!task) return;
    const subject = await db.get(db.STORES.languageSubject, subjectId);
    const checkins = task.checkins || [];
    const streak = this._calcStreak(checkins);
    const maxStreak = this._calcMaxStreak(checkins);
    const unlocked = this._unlockedBadges(streak, maxStreak);
    const checkedToday = this._isCheckedToday(checkins, task.frequency);
    const today = UI.todayStr();

    const main = document.getElementById('appMain');
    App.setFab(() => this._showTaskEditor(subjectId, taskId));

    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" id="tdBack">‹ 返回</button>
        <div class="card" style="padding:16px;margin-bottom:14px;">
          <div class="tape green" style="top:-8px;left:20px;"></div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
            <span class="chip blue">${subject?.icon || '📖'} ${subject?.name || '科目'}</span>
            <span class="chip ${task.priority === '高' ? 'red' : task.priority === '中' ? 'yellow' : 'gray'}">${task.priority === '高' ? '🔴' : task.priority === '中' ? '🟡' : '⚪'} ${task.priority || '中'}</span>
            <span class="chip gray">${task.frequency === '每天' ? '📅 每天' : task.frequency === '每周' ? '📆 每周' : '⚙️ ' + (task.customFreq || '自定义')}</span>
            ${task.done ? '<span class="chip green">已完成</span>' : ''}
          </div>
          <h2 style="font-family:var(--font-display);font-size:22px;color:var(--ink);margin-bottom:6px">${task.content}</h2>
          ${task.note ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:6px;line-height:1.6">${task.note}</div>` : ''}
          <div style="display:flex;gap:8px;margin-top:14px;">
            <button class="btn btn-primary" id="tdCheckin" style="flex:1${checkedToday ? ';opacity:0.6' : ''}" ${checkedToday ? 'disabled' : ''}>${checkedToday ? '✓ 今日已打卡' : '📅 立即打卡'}</button>
            <button class="btn btn-ghost" id="tdEdit" style="flex:1">✏️ 编辑</button>
          </div>
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
          <div class="ssb-progress">${this._renderStreakBar(streak, maxStreak)}</div>
        </div>

        <!-- 成就徽章 -->
        <div class="section-title">🎖️ 成就徽章</div>
        <div class="badge-row">${this._renderBadges(unlocked)}</div>

        <!-- 打卡日历 -->
        <div class="section-title">📅 打卡日历</div>
        <div class="card" style="padding:14px;" id="tdCalendar"></div>

        <!-- 打卡记录 -->
        <div class="section-title">📝 打卡记录</div>
        <div id="tdCheckinList"></div>

        <div style="height:20px"></div>
      </div>
    `;

    document.getElementById('tdBack').onclick = () => this.showSubjectDetail(subjectId);
    document.getElementById('tdEdit').onclick = () => this._showTaskEditor(subjectId, taskId);

    // 打卡按钮
    if (!checkedToday) {
      document.getElementById('tdCheckin').onclick = () => this._doCheckin(taskId, subjectId, db.STORES.languageTask);
    }

    // 渲染日历
    this._renderCalendar(checkins);
    // 渲染打卡记录
    this._renderCheckinList(checkins);
  },

  /* 打卡操作 */
  async _doCheckin(taskId, subjectId, store) {
    // store = db.STORES.languageTask 或 db.STORES.profTask
    const task = await db.get(store, taskId);
    if (!task) return;
    const today = UI.todayStr();

    const body = `
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:40px">🎉</div>
        <div style="font-family:var(--font-display);font-size:18px;color:var(--ink);margin-top:6px">${today} 打卡</div>
        <div style="font-size:12px;color:var(--ink-mute);margin-top:2px">${task.content}</div>
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">学习时长</label>
          <input class="field" id="tc_dur" placeholder="如 45 分钟">
        </div>
        <div>
          <label class="label">心情</label>
          <select class="field" id="tc_mood">
            <option>😊 充实</option>
            <option>😌 平静</option>
            <option>🤔 思考</option>
            <option>😴 疲惫</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label class="label">今日收获（可选）</label>
        <textarea class="field" id="tc_note" placeholder="学到了什么？" maxlength="200"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="tc_cancel">取消</button>
        <button class="btn btn-primary" id="tc_save">✓ 确认打卡</button>
      </div>
    `;
    UI.showSheet('学习打卡', body, (root) => {
      root.querySelector('#tc_cancel').onclick = () => UI.hideSheet();
      root.querySelector('#tc_save').onclick = async () => {
        task.checkins = task.checkins || [];
        task.checkins.push({
          date: today,
          duration: root.querySelector('#tc_dur').value.trim(),
          mood: root.querySelector('#tc_mood').value,
          note: root.querySelector('#tc_note').value.trim()
        });
        await db.put(store, task);

        // 检查是否解锁新徽章
        const newStreak = this._calcStreak(task.checkins);
        const newMax = this._calcMaxStreak(task.checkins);
        const best = Math.max(newStreak, newMax);
        const justUnlocked = this._badges.find(b => b.days === best);

        UI.hideSheet();
        if (justUnlocked) {
          UI.toast(`🎖️ 解锁徽章：${justUnlocked.icon} ${justUnlocked.name}！`);
        } else {
          UI.toast('打卡成功，继续加油！');
        }
        // 根据 store 判断刷新页面
        if (store === db.STORES.profTask) {
          this.showProfTaskDetail(subjectId, taskId);
        } else {
          this.showTaskDetail(subjectId, taskId);
        }
      };
    });
  },

  /* 渲染徽章墙 */
  _renderBadges(unlocked) {
    const unlockedSet = new Set(unlocked.map(b => b.days));
    return this._badges.map(b => {
      const isUnlocked = unlockedSet.has(b.days);
      return `
        <div class="badge ${isUnlocked ? 'unlocked' : ''}">
          <div class="b-circle">${b.icon}</div>
          <div class="b-name">${b.name}</div>
          <div class="b-desc">${b.days}天</div>
        </div>`;
    }).join('');
  },

  /* 渲染连续打卡进度条 */
  _renderStreakBar(streak, maxStreak) {
    const best = Math.max(streak, maxStreak);
    let nextBadge = this._badges.find(b => b.days > best);
    let prevDays = 0;
    if (nextBadge) {
      const idx = this._badges.indexOf(nextBadge);
      prevDays = idx > 0 ? this._badges[idx - 1].days : 0;
    } else {
      nextBadge = this._badges[this._badges.length - 1];
      prevDays = this._badges[this._badges.length - 2]?.days || 0;
    }
    const range = nextBadge.days - prevDays;
    const cur = Math.min(best, nextBadge.days) - prevDays;
    const pct = range > 0 ? Math.round((cur / range) * 100) : 100;

    if (best >= this._badges[this._badges.length - 1].days) {
      return `<div class="ssb-bar-track"><div class="ssb-bar-fill" style="width:100%"></div></div>
              <div class="ssb-bar-text">已达最高徽章 💎 传奇</div>`;
    }
    return `<div class="ssb-bar-track"><div class="ssb-bar-fill" style="width:${pct}%"></div></div>
            <div class="ssb-bar-text">距下一徽章 ${nextBadge.icon} ${nextBadge.name} 还需 ${nextBadge.days - best} 天</div>`;
  },

  /* 渲染打卡日历 */
  _renderCalendar(checkins) {
    const box = document.getElementById('tdCalendar');
    if (!box) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const checkinDates = new Set(checkins.map(c => c.date));

    let html = `<div style="text-align:center;font-family:var(--font-display);font-size:16px;margin-bottom:10px;color:var(--ink)">${year}年 ${month + 1}月</div>`;
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center;">';
    ['日', '一', '二', '三', '四', '五', '六'].forEach(d => {
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

  /* 渲染打卡记录列表 */
  _renderCheckinList(checkins) {
    const el = document.getElementById('tdCheckinList');
    if (!el) return;
    const sorted = (checkins || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">🌱</div><div class="hint">还没有打卡记录，开始第一步吧</div></div>`;
      return;
    }
    el.innerHTML = sorted.map(c => `
      <div class="list-item">
        <div class="li-row">
          <span style="font-size:18px">✅</span>
          <div style="flex:1">
            <div class="li-title" style="font-size:14px">${c.date}</div>
            ${c.note ? `<div class="li-sub">${c.note}</div>` : ''}
          </div>
          <span class="chip green">${c.duration || ''}</span>
        </div>
      </div>
    `).join('');
  },

  /* ====== 专业任务详情页（全屏，含打卡/徽章/日历/记录） ====== */
  async showProfTaskDetail(subjectId, taskId) {
    // 如果 taskId 为 null，走编辑弹窗新建
    if (!taskId) {
      this.showProfTaskEditor(subjectId, null);
      return;
    }

    const task = await db.get(db.STORES.profTask, taskId);
    if (!task) return;
    const subject = await db.get(db.STORES.profSubject, subjectId);
    const checkins = task.checkins || [];
    const streak = this._calcStreak(checkins);
    const maxStreak = this._calcMaxStreak(checkins);
    const unlocked = this._unlockedBadges(streak, maxStreak);
    const checkedToday = this._isCheckedToday(checkins, task.frequency);

    const main = document.getElementById('appMain');
    App.setFab(() => this.showProfTaskEditor(subjectId, taskId));

    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" id="tdBack">‹ 返回</button>
        <div class="card" style="padding:16px;margin-bottom:14px;">
          <div class="tape green" style="top:-8px;left:20px;"></div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
            <span class="chip blue">${subject?.icon || '📖'} ${subject?.name || '科目'}</span>
            <span class="chip ${task.priority === '高' ? 'red' : task.priority === '中' ? 'yellow' : 'gray'}">${task.priority === '高' ? '🔴' : task.priority === '中' ? '🟡' : '⚪'} ${task.priority || '中'}</span>
            <span class="chip gray">${task.frequency === '每天' ? '📅 每天' : task.frequency === '每周' ? '📆 每周' : '⚙️ ' + (task.customFreq || '自定义')}</span>
            ${task.done ? '<span class="chip green">已完成</span>' : ''}
          </div>
          <h2 style="font-family:var(--font-display);font-size:22px;color:var(--ink);margin-bottom:6px">${task.content}</h2>
          ${task.note ? `<div style="font-size:13px;color:var(--ink-soft);margin-top:6px;line-height:1.6">${task.note}</div>` : ''}
          <div style="display:flex;gap:8px;margin-top:14px;">
            <button class="btn btn-primary" id="tdCheckin" style="flex:1${checkedToday ? ';opacity:0.6' : ''}" ${checkedToday ? 'disabled' : ''}>${checkedToday ? '✓ 今日已打卡' : '📅 立即打卡'}</button>
            <button class="btn btn-ghost" id="tdEdit" style="flex:1">✏️ 编辑</button>
          </div>
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
          <div class="ssb-progress">${this._renderStreakBar(streak, maxStreak)}</div>
        </div>

        <!-- 成就徽章 -->
        <div class="section-title">🎖️ 成就徽章</div>
        <div class="badge-row">${this._renderBadges(unlocked)}</div>

        <!-- 打卡日历 -->
        <div class="section-title">📅 打卡日历</div>
        <div class="card" style="padding:14px;" id="tdCalendar"></div>

        <!-- 打卡记录 -->
        <div class="section-title">📝 打卡记录</div>
        <div id="tdCheckinList"></div>

        <div style="height:20px"></div>
      </div>
    `;

    document.getElementById('tdBack').onclick = () => this.showProfSubjectDetail(subjectId);
    document.getElementById('tdEdit').onclick = () => this.showProfTaskEditor(subjectId, taskId);

    // 打卡按钮
    if (!checkedToday) {
      document.getElementById('tdCheckin').onclick = () => this._doCheckin(taskId, subjectId, db.STORES.profTask);
    }

    // 渲染日历
    this._renderCalendar(checkins);
    // 渲染打卡记录
    this._renderCheckinList(checkins);
  },

  /* 专业任务编辑弹窗（新建/编辑共用） */
  showProfTaskEditor(subjectId, taskId) {
    const isEdit = !!taskId;
    const body = `
      <div class="form-row">
        <label class="label">任务内容 *</label>
        <textarea class="field" id="tf_content" placeholder="如：背诵商法总论第三章、做 2 道案例分析" rows="3" maxlength="200"></textarea>
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">执行频次</label>
          <select class="field" id="tf_freq">
            <option value="每天">每天</option>
            <option value="每周">每周</option>
            <option value="自定义">自定义</option>
          </select>
        </div>
        <div>
          <label class="label">优先级</label>
          <select class="field" id="tf_prio">
            <option value="中">中</option>
            <option value="高">高</option>
            <option value="低">低</option>
          </select>
        </div>
      </div>
      <div class="form-row" id="tf_custom_row" style="display:none;">
        <label class="label">自定义频次描述</label>
        <input class="field" id="tf_custom" placeholder="如：每周一三五" maxlength="30">
      </div>
      <div class="form-row">
        <label class="label">备注</label>
        <textarea class="field" id="tf_note" placeholder="可选备注" rows="2" maxlength="200"></textarea>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="tf_del" style="color:var(--cinnabar);flex:1;">🗑 删除</button>' : ''}
        <button class="btn btn-ghost" id="tf_cancel">${isEdit ? '取消' : '取消'}</button>
        <button class="btn btn-primary" id="tf_save">${isEdit ? '保存' : '添加任务'}</button>
      </div>
    `;

    UI.showSheet(isEdit ? '编辑任务' : '添加任务', body, (root) => {
      let loaded = true;
      const freqSel = root.querySelector('#tf_freq');
      const customRow = root.querySelector('#tf_custom_row');

      freqSel.onchange = () => {
        customRow.style.display = freqSel.value === '自定义' ? '' : 'none';
      };

      root.querySelector('#tf_cancel').onclick = () => UI.hideSheet();

      // 编辑模式：删除按钮
      const delBtn = root.querySelector('#tf_del');
      if (delBtn) {
        delBtn.onclick = async () => {
          if (await UI.confirm('确定删除这个学习任务？打卡记录也将删除。')) {
            await db.remove(db.STORES.profTask, taskId);
            UI.hideSheet();
            UI.toast('已删除');
            this.showProfSubjectDetail(subjectId);
          }
        };
      }

      root.querySelector('#tf_save').onclick = async () => {
        if (isEdit && !loaded) {
          UI.toast('数据加载中，请稍候');
          return;
        }
        const content = root.querySelector('#tf_content').value.trim();
        if (!content) {
          UI.toast('请输入任务内容');
          return;
        }
        const frequency = freqSel.value;
        const priority = root.querySelector('#tf_prio').value;
        const customFreq = root.querySelector('#tf_custom').value.trim();
        const note = root.querySelector('#tf_note').value.trim();

        if (isEdit) {
          const task = await db.get(db.STORES.profTask, taskId);
          Object.assign(task, { content, frequency, customFreq, note, priority });
          await db.put(db.STORES.profTask, task);
        } else {
          await db.add(db.STORES.profTask, {
            subjectId, content, frequency, customFreq, note, priority, done: false, checkins: []
          });
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加任务');
        this.showProfSubjectDetail(subjectId);
      };

      // 编辑模式：异步加载已有数据
      if (isEdit) {
        loaded = false;
        (async () => {
          const task = await db.get(db.STORES.profTask, taskId);
          if (task) {
            root.querySelector('#tf_content').value = task.content || '';
            root.querySelector('#tf_freq').value = task.frequency || '每天';
            root.querySelector('#tf_prio').value = task.priority || '中';
            root.querySelector('#tf_custom').value = task.customFreq || '';
            root.querySelector('#tf_note').value = task.note || '';
            customRow.style.display = task.frequency === '自定义' ? '' : 'none';
          }
          loaded = true;
        })();
      }
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
        if (await UI.confirm('删除这个科目？相关任务也会删除。')) {
          await db.remove(db.STORES.languageSubject, id);
          const tasks = await db.all(db.STORES.languageTask);
          for (const t of tasks.filter(t => t.subjectId === id)) {
            await db.remove(db.STORES.languageTask, t.id);
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

  /* ====== 专业板块 ====== */
  async renderProfessional() {
    const el = document.getElementById('scContent');
    App.setFab(() => this.addProfSubject());

    const subjects = await db.all(db.STORES.profSubject);
    subjects.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const allTasks = await db.all(db.STORES.profTask);
    const today = UI.todayStr();

    // 统计
    const totalTasks = allTasks.length;
    const doneTasks = allTasks.filter(t => t.done).length;
    const todayCheckin = allTasks.filter(t => (t.checkins || []).some(c => c.date === today)).length;

    // 读书/文献
    const books = await db.all(db.STORES.book);
    books.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const papers = await db.all(db.STORES.paper);
    papers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    el.innerHTML = `
      <div class="sc-stats-row">
        <div class="sc-stat-mini"><span class="n">${subjects.length}</span><span class="l">专业科目</span></div>
        <div class="sc-stat-mini"><span class="n">${totalTasks}</span><span class="l">学习任务</span></div>
        <div class="sc-stat-mini"><span class="n" style="color:var(--forest)">${doneTasks}</span><span class="l">已完成</span></div>
        <div class="sc-stat-mini"><span class="n" style="color:var(--gold)">${todayCheckin}</span><span class="l">今日打卡</span></div>
      </div>

      <button class="btn btn-jade" id="addProfSubject" style="width:100%;margin-bottom:12px;">＋ 添加专业科目</button>
      <div id="profSubjectList"></div>

      <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>📚 读书计划</span>
        <button class="btn btn-jade" id="addBookBtnP" style="font-size:11px;padding:4px 10px;">＋ 添加</button>
      </div>
      <div id="profBookList"></div>

      <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>📄 文献阅读</span>
        <button class="btn btn-jade" id="addPaperBtnP" style="font-size:11px;padding:4px 10px;">＋ 添加</button>
      </div>
      <div id="profPaperList"></div>
    `;

    document.getElementById('addProfSubject').onclick = () => this.addProfSubject();
    document.getElementById('addBookBtnP').onclick = () => this.addBook();
    document.getElementById('addPaperBtnP').onclick = () => this.addPaper();

    // 渲染专业科目列表
    this._renderProfSubjects(subjects, allTasks);

    // 渲染读书（复用原有逻辑，渲染到不同容器）
    this._renderProfBooks(books);
    this._renderProfPapers(papers);
  },

  /* 渲染专业板块的读书列表（复用 renderBooks 逻辑，渲染到 profBookList） */
  async _renderProfBooks(books) {
    const el = document.getElementById('profBookList');
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

  /* 渲染专业板块的文献列表（复用 renderPapers 逻辑，渲染到 profPaperList） */
  async _renderProfPapers(papers) {
    const el = document.getElementById('profPaperList');
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

  /* ====== 专业科目相关方法 ====== */
  async _renderProfSubjects(subjects, allTasks) {
    const el = document.getElementById('profSubjectList');
    if (!el) return;
    if (subjects.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">📚</div><div class="hint">添加专业科目（商法学、民法学、LEC等），安排学习任务</div></div>`;
      return;
    }
    el.innerHTML = subjects.map(s => {
      const sTasks = allTasks.filter(t => t.subjectId === s.id);
      const doneCount = sTasks.filter(t => t.done).length;
      return `
        <div class="list-item" data-id="${s.id}" style="margin-bottom:10px;cursor:pointer;">
          <div class="li-row">
            <span style="font-size:20px">${s.icon || '📖'}</span>
            <div style="flex:1">
              <div class="li-title">${s.name}</div>
              <div class="li-tags">
                <span class="chip gray">${sTasks.length} 个任务</span>
                ${doneCount > 0 ? `<span class="chip green">✓ ${doneCount} 完成</span>` : ''}
              </div>
            </div>
            <button class="icon-btn" data-act="menu" data-sid="${s.id}" style="width:32px;height:32px;font-size:14px">⋯</button>
          </div>
        </div>
      `;
    }).join('');

    el.querySelectorAll('.list-item').forEach(item => {
      const id = item.dataset.id;
      item.querySelector('[data-act="menu"]').onclick = (e) => {
        e.stopPropagation();
        this.profSubjectMenu(id);
      };
      item.onclick = (e) => {
        if (e.target.closest('[data-act="menu"]')) return;
        this.showProfSubjectDetail(id);
      };
    });
  },

  async showProfSubjectDetail(subjectId) {
    const subject = await db.get(db.STORES.profSubject, subjectId);
    const allTasks = await db.all(db.STORES.profTask);
    const tasks = allTasks.filter(t => t.subjectId === subjectId).sort((a, b) => {
      if ((a.done || false) !== (b.done || false)) return (a.done || false) ? 1 : -1;
      const prioMap = { '高': 0, '中': 1, '低': 2 };
      return (prioMap[a.priority] || 2) - (prioMap[b.priority] || 2);
    });
    const totalCount = tasks.length;
    const doneCount = tasks.filter(t => t.done).length;
    const main = document.getElementById('appMain');

    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" id="sdBack">‹ 返回</button>
        <div class="card" style="padding:16px;margin-bottom:14px;">
          <h2 style="font-family:var(--font-display);font-size:20px;">${subject?.icon || '📖'} ${subject?.name || '科目'}</h2>
          <div class="li-tags" style="margin-top:8px">
            <span class="chip gray">${totalCount} 个任务</span>
            <span class="chip green">✓ ${doneCount} 完成</span>
          </div>
        </div>
        <div id="taskList"></div>
      </div>
    `;
    document.getElementById('sdBack').onclick = () => this.goBack('professional');

    // 设置 FAB 用于添加任务
    App.setFab(() => this.showProfTaskDetail(subjectId, null));

    const today = UI.todayStr();
    const renderTasks = () => {
      const listEl = document.getElementById('taskList');
      if (!listEl) return;
      if (tasks.length === 0) {
        listEl.innerHTML = `<div class="empty"><div class="emoji">📋</div><div class="hint">还没有任务，点击 + 添加</div></div>`;
        return;
      }
      const prioColorMap = { '高': 'var(--cinnabar)', '中': 'var(--gold)', '低': 'var(--ink-mute)' };
      const freqLabelMap = { '每天': '每天', '每周': '每周', '自定义': '自定义' };
      listEl.innerHTML = tasks.map(t => {
        const prioColor = prioColorMap[t.priority] || 'var(--ink-mute)';
        const freqLabel = freqLabelMap[t.frequency] || (t.customFreq || '');
        const tCheckins = t.checkins || [];
        const tCheckedToday = tCheckins.some(c => c.date === today);
        const tStreak = this._calcStreak(tCheckins);
        return `
          <div class="list-item" data-tid="${t.id}" style="margin-bottom:8px;cursor:pointer;${t.done ? 'opacity:0.6;' : ''}">
            <div class="li-row">
              <div style="width:4px;height:32px;border-radius:2px;background:${prioColor};margin-right:10px;flex-shrink:0;"></div>
              <button class="check ${t.done ? 'done' : ''}" data-act="toggle" data-tid="${t.id}" style="width:22px;height:22px;border-width:1.5px;flex-shrink:0;">✓</button>
              <div style="flex:1">
                <div class="li-title" style="${t.done ? 'text-decoration:line-through;' : ''}">${t.content}</div>
                <div class="li-tags" style="margin-top:4px">
                  ${freqLabel ? `<span class="chip gray">${freqLabel}</span>` : ''}
                  ${tStreak > 0 ? `<span class="chip yellow">🔥${tStreak}</span>` : ''}
                  ${tCheckedToday ? '<span class="chip green">✓ 今日已打卡</span>' : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // 勾选完成/取消完成
      listEl.querySelectorAll('[data-act="toggle"]').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const tid = btn.dataset.tid;
          const task = await db.get(db.STORES.profTask, tid);
          task.done = !task.done;
          await db.put(db.STORES.profTask, task);
          const localTask = tasks.find(t => t.id === tid);
          if (localTask) localTask.done = task.done;
          renderTasks();
        };
      });

      // 点击任务卡片打开详情
      listEl.querySelectorAll('.list-item').forEach(item => {
        item.onclick = (e) => {
          if (e.target.closest('[data-act="toggle"]')) return;
          this.showProfTaskDetail(subjectId, item.dataset.tid);
        };
      });
    };

    renderTasks();
  },

  addProfSubject(editId) {
    const isEdit = !!editId;
    const icons = ['📖', '⚖️', '📑', '📜', '🏛️', '🧑‍⚖️', '💼', '📊', '📝', '🎓', '📘', '📗'];
    const body = `
      <div class="form-row">
        <label class="label">科目名称</label>
        <input class="field" id="ls_name" placeholder="如：商法学、民法学、LEC" maxlength="20">
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
    UI.showSheet(isEdit ? '编辑科目' : '添加专业科目', body, (root) => {
      root.querySelector('#ls_save').onclick = async () => {
        const name = root.querySelector('#ls_name').value.trim();
        if (!name) return UI.toast('请输入科目名称');
        const icon = root.querySelector('#ls_icons input:checked').value;
        if (isEdit) {
          const old = await db.get(db.STORES.profSubject, editId);
          Object.assign(old, { name, icon });
          await db.put(db.STORES.profSubject, old);
        } else {
          const all = await db.all(db.STORES.profSubject);
          await db.add(db.STORES.profSubject, { name, icon, sortOrder: all.length });
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加');
        this.renderProfessional();
      };
      if (isEdit) {
        (async () => {
          const s = await db.get(db.STORES.profSubject, editId);
          if (s) {
            root.querySelector('#ls_name').value = s.name || '';
            const radio = root.querySelector(`#ls_icons input[value="${s.icon}"]`);
            if (radio) radio.checked = true;
          }
        })();
      }
    });
  },

  profSubjectMenu(id) {
    const body = `
      <div class="choice-grid">
        <button class="choice" data-act="edit">✏️ 编辑</button>
        <button class="choice" data-act="del" style="color:var(--rust)">🗑 删除</button>
      </div>
    `;
    UI.showSheet('科目操作', body, (root) => {
      root.querySelector('[data-act="edit"]').onclick = () => { UI.hideSheet(); this.addProfSubject(id); };
      root.querySelector('[data-act="del"]').onclick = async () => {
        UI.hideSheet();
        if (await UI.confirm('删除这个科目？相关任务也会删除。')) {
          await db.remove(db.STORES.profSubject, id);
          const tasks = await db.all(db.STORES.profTask);
          for (const t of tasks.filter(t => t.subjectId === id)) {
            await db.remove(db.STORES.profTask, t.id);
          }
          UI.toast('已删除');
          this.renderProfessional();
        }
      };
    });
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
          this.renderProfessional();
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
        this.renderProfessional();
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
    main.querySelector('[data-act="back"]').onclick = () => this.goBack('professional');
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
          this.renderProfessional();
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
        this.renderProfessional();
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
    main.querySelector('[data-act="back"]').onclick = () => this.goBack('professional');
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
            html += `<td class="sc-ct-cell has-course merged" rowspan="${rowspan}" data-cid="${course.id}" data-day="${d}" data-period="${p+1}" style="background:${course.color || 'var(--forest-mist)'};border-color:${course.color || 'var(--forest)'};vertical-align:middle;color:${this._contrastTextColor(course.color || '#2f4a28')};">
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
        <button class="choice" data-act="add-log">📖 本周上课记录</button>
        <button class="choice" data-act="edit">✏️ 编辑</button>
        <button class="choice" data-act="del" style="color:var(--rust)">🗑 删除</button>
      </div>`;
    UI.showSheet('课程操作', body, (root) => {
      root.querySelector('[data-act="add-log"]').onclick = () => { UI.hideSheet(); this.quickAddClassLog(id); };
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
        <div style="display:flex;align-items:center;gap:14px;">
          <div class="sc-hue-wheel" id="cs_hue_wheel"></div>
          <div class="sc-hue-preview" id="cs_hue_preview" style="background:#2f4a28;">
            <span class="sc-hue-hex" id="cs_hue_hex">#2f4a28</span>
          </div>
          <input type="hidden" id="cs_color_val" value="#2f4a28">
        </div>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="cs_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="cs_save">${isEdit ? '保存' : '添加'}</button>
      </div>
    `;
    UI.showSheet(isEdit ? '编辑课程' : '添加课程', body, (root) => {
      // 初始化色轮
      const wheel = root.querySelector('#cs_hue_wheel');
      const preview = root.querySelector('#cs_hue_preview');
      const hexLabel = root.querySelector('#cs_hue_hex');
      const hiddenInput = root.querySelector('#cs_color_val');
      this._initHueWheel(wheel, 160, (hue) => {
        const color = `hsl(${hue}, 55%, 38%)`;
        const hex = this._hslToHex(hue, 55, 38);
        preview.style.background = color;
        hexLabel.textContent = hex;
        hiddenInput.value = hex;
      });

      root.querySelector('#cs_save').onclick = async () => {
        const name = root.querySelector('#cs_name').value.trim();
        if (!name) return UI.toast('请输入课程名称');
        const day = parseInt(root.querySelector('#cs_day').value);
        const weekType = root.querySelector('#cs_weektype').value;
        const periods = Array.from(root.querySelectorAll('#cs_periods input:checked')).map(i => parseInt(i.value));
        if (periods.length === 0) return UI.toast('请选择至少一节课');
        const color = hiddenInput.value;
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
              hiddenInput.value = c.color;
              preview.style.background = c.color;
              hexLabel.textContent = c.color;
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

  /* 初始化色轮 */
  _initHueWheel(container, size, onPick) {
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;cursor:crosshair;display:block;touch-action:none;`;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const cx = size / 2, cy = size / 2;
    const outerR = size / 2 - 4;
    const innerR = outerR * 0.45;

    // 用离屏 canvas 缓存色轮，避免每次 pick 重绘
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const oCtx = offscreen.getContext('2d');
    oCtx.scale(dpr, dpr);
    for (let angle = 0; angle < 360; angle++) {
      const sa = (angle - 1) * Math.PI / 180;
      const ea = (angle + 1) * Math.PI / 180;
      oCtx.beginPath();
      oCtx.moveTo(cx, cy);
      oCtx.arc(cx, cy, outerR, sa, ea);
      oCtx.closePath();
      oCtx.fillStyle = `hsl(${angle}, 55%, 38%)`;
      oCtx.fill();
    }
    oCtx.beginPath();
    oCtx.arc(cx, cy, innerR, 0, Math.PI * 2);
    oCtx.fillStyle = '#faf5ec';
    oCtx.fill();

    let currentHue = 150;
    let dragging = false;

    function draw() {
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(offscreen, 0, 0, size, size);
      // 指示点
      const a = (currentHue - 90) * Math.PI / 180;
      const ir = (outerR + innerR) / 2;
      const ix = cx + ir * Math.cos(a);
      const iy = cy + ir * Math.sin(a);
      ctx.beginPath();
      ctx.arc(ix, iy, 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ix, iy, 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    draw();

    function pick(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left - rect.width / 2;
      const y = clientY - rect.top - rect.height / 2;
      const dist = Math.sqrt(x * x + y * y) / (rect.width / 2);
      if (dist < 0.45 || dist > 1.05) return;
      let angle = Math.atan2(y, x) * 180 / Math.PI + 90;
      if (angle < 0) angle += 360;
      currentHue = Math.round(angle);
      draw();
      onPick(currentHue);
    }

    canvas.addEventListener('mousedown', (e) => { dragging = true; pick(e.clientX, e.clientY); });
    canvas.addEventListener('mousemove', (e) => { if (dragging) pick(e.clientX, e.clientY); });
    window.addEventListener('mouseup', () => { dragging = false; });
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); dragging = true; pick(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (dragging) pick(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    canvas.addEventListener('touchend', () => { dragging = false; });
  },

  /* HSL 转 HEX */
  _hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  },

  /* 根据背景色计算对比文字颜色（深背景用白字，浅背景用黑字） */
  _contrastTextColor(hex) {
    if (!hex || hex.startsWith('var(')) return '#fff';
    const c = hex.replace('#', '');
    if (c.length < 6) return '#fff';
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum > 150 ? '#1a1a1a' : '#ffffff';
  },

  /* 上课记录 */
  async quickAddClassLog(courseId) {
    const course = await db.get(db.STORES.course, courseId);
    if (!course) return;
    const today = UI.todayStr();
    const body = `
      <div class="form-row">
        <label class="label">课程</label>
        <input class="field" value="${course.name}" disabled style="opacity:0.6">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">日期</label>
          <input class="field" type="date" id="ql_date" value="${today}">
        </div>
        <div>
          <label class="label">考勤</label>
          <select class="field" id="ql_att">
            <option value="present">✅ 出勤</option>
            <option value="late">⏰ 迟到</option>
            <option value="absent">❌ 缺勤</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label class="label">上课内容</label>
        <textarea class="field" id="ql_content" placeholder="今天讲了什么..." rows="3" maxlength="500"></textarea>
      </div>
      <div class="form-row">
        <label class="label">作业</label>
        <textarea class="field" id="ql_homework" placeholder="布置的作业..." rows="2" maxlength="300"></textarea>
      </div>
      <div class="form-row">
        <label class="label">作业照片</label>
        <div class="img-grid" id="ql_hw_photos">
          <div class="upload-trigger" id="ql_hw_add">📷<span>添加照片</span></div>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="ql_cancel">取消</button>
        <button class="btn btn-primary" id="ql_save">添加记录</button>
      </div>`;
    UI.showSheet('快捷上课记录', body, (root) => {
      let hwPhotos = [];
      function renderPhotos() {
        const grid = root.querySelector('#ql_hw_photos');
        const addBtn = '<div class="upload-trigger" id="ql_hw_add">📷<span>添加照片</span></div>';
        grid.innerHTML = hwPhotos.map((p, i) => `<div class="img-cell"><img src="${p}" alt="照片"><button class="del" data-i="${i}">✕</button></div>`).join('') + addBtn;
        grid.querySelectorAll('.del').forEach(d => { d.onclick = () => { hwPhotos.splice(+d.dataset.i, 1); renderPhotos(); }; });
        const addEl = root.querySelector('#ql_hw_add');
        if (addEl) addEl.onclick = async () => { const imgs = await UI.pickImages(6); hwPhotos.push(...imgs); renderPhotos(); };
      }
      renderPhotos();
      root.querySelector('#ql_save').onclick = async () => {
        await db.add(db.STORES.classLog, {
          courseId: course.id,
          courseName: course.name,
          date: root.querySelector('#ql_date').value,
          attendance: root.querySelector('#ql_att').value,
          content: root.querySelector('#ql_content').value.trim(),
          homework: root.querySelector('#ql_homework').value.trim(),
          homeworkPhotos: hwPhotos
        });
        UI.hideSheet();
        UI.toast('已添加上课记录');
      };
      root.querySelector('#ql_cancel').onclick = () => UI.hideSheet();
    });
  },

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
      <div class="form-row">
        <label class="label">作业照片</label>
        <div class="img-grid" id="cl_hw_photos">
          <div class="upload-trigger" id="cl_hw_add">📷<span>添加照片</span></div>
        </div>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="cl_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="cl_save">${isEdit ? '保存' : '添加'}</button>
      </div>
    `;
    UI.showSheet(isEdit ? '编辑上课记录' : '添加上课记录', body, (root) => {
      let hwPhotos = [];
      function renderPhotos() {
        const grid = root.querySelector('#cl_hw_photos');
        const addBtn = '<div class="upload-trigger" id="cl_hw_add">📷<span>添加照片</span></div>';
        grid.innerHTML = hwPhotos.map((p, i) => `<div class="img-cell"><img src="${p}" alt="照片"><button class="del" data-i="${i}">✕</button></div>`).join('') + addBtn;
        grid.querySelectorAll('.del').forEach(d => { d.onclick = () => { hwPhotos.splice(+d.dataset.i, 1); renderPhotos(); }; });
        const addEl = root.querySelector('#cl_hw_add');
        if (addEl) addEl.onclick = async () => { const imgs = await UI.pickImages(6); hwPhotos.push(...imgs); renderPhotos(); };
      }
      renderPhotos();
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
          homework: root.querySelector('#cl_homework').value.trim(),
          homeworkPhotos: hwPhotos
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
            // 加载已有作业照片
            if (l.homeworkPhotos && l.homeworkPhotos.length > 0) {
              hwPhotos = [...l.homeworkPhotos];
              renderPhotos();
            }
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
        <div class="sc-news-item" style="position:relative;overflow:hidden;" data-news-id="${n.id}">
          <div class="sc-news-content" style="transition:transform 0.2s;display:flex;gap:10px;">
            <div class="sc-news-rank">${i + 1}</div>
            <div style="flex:1;">
              <div class="sc-news-headline">${n.title}</div>
              ${n.summary ? `<div class="sc-news-summary">${n.summary}</div>` : ''}
              ${n.source ? `<div class="sc-news-source">来源：${n.source}</div>` : ''}
            </div>
          </div>
          <button class="sc-news-action" style="position:absolute;right:0;top:0;bottom:0;width:80px;background:var(--forest);color:var(--paper-light);font-size:12px;border:none;opacity:0;transition:opacity 0.2s;">科普口播</button>
        </div>
      `).join('');
    }
    el.innerHTML = html;

    // 添加触摸滑动事件和口播按钮绑定
    el.querySelectorAll('.sc-news-item').forEach(item => {
      let startX = 0, currentX = 0, isDragging = false;
      const content = item.querySelector('.sc-news-content');
      const actionBtn = item.querySelector('.sc-news-action');

      item.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
      });
      item.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
        let diff = currentX - startX;
        if (diff > 0) diff = 0;
        if (diff < -80) diff = -80;
        content.style.transform = `translateX(${diff}px)`;
        if (actionBtn) actionBtn.style.opacity = Math.min(1, -diff / 50);
      });
      item.addEventListener('touchend', () => {
        isDragging = false;
        const diff = currentX - startX;
        if (diff < -50) {
          content.style.transform = 'translateX(-80px)';
          if (actionBtn) actionBtn.style.opacity = '1';
        } else {
          content.style.transform = '';
          if (actionBtn) actionBtn.style.opacity = '0';
        }
      });

      // 绑定口播按钮
      if (actionBtn) {
        const newsId = item.dataset.newsId;
        actionBtn.onclick = () => {
          const newsItem = news.find(n => n.id === newsId);
          if (newsItem) this.showNewsScript(newsItem);
        };
      }
    });
  },

  async showNewsScript(news) {
    // 从缓存查找
    let cached = await db.query(db.STORES.newsScript, s => s.newsId === news.id);
    if (cached.length > 0) {
      this.displayScriptSheet(cached[0].text);
      return;
    }
    UI.toast('正在生成科普文案...');
    try {
      const prompt = `基于以下新闻，生成一段约300字的科普短视频口播文案。要求通俗易懂、引人入胜，适合短视频口播风格。\n\n新闻：${news.title}\n摘要：${news.summary}\n\n请直接输出文案内容，不要加标题。`;
      const text = await AI._callOnline(prompt, '');
      const cleaned = AI._stripCodeFence ? AI._stripCodeFence(text) : text.replace(/```[\s\S]*?```/g, '').trim();
      await db.add(db.STORES.newsScript, { newsId: news.id, title: news.title, text: cleaned, date: UI.todayStr() });
      this.displayScriptSheet(cleaned);
    } catch (e) {
      UI.toast('生成失败');
    }
  },

  displayScriptSheet(text) {
    const body = `
      <div style="font-size:14px;color:var(--ink-soft);line-height:1.8;white-space:pre-wrap;">${text}</div>
      <div class="form-actions" style="margin-top:16px;">
        <button class="btn btn-primary" id="copyScript" style="flex:1;">📋 一键复制</button>
      </div>`;
    UI.showSheet('科普口播文案', body, (root) => {
      root.querySelector('#copyScript').onclick = () => {
        navigator.clipboard.writeText(text).then(() => UI.toast('已复制到剪贴板')).catch(() => {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          UI.toast('已复制到剪贴板');
        });
      };
    });
  },

  async fetchNews() {
    UI.toast('正在获取今日新闻热点...');
    try {
      const prompt = `请生成今日（${UI.todayStr()}）的 10 条新闻热点。
要求：
1. 优先推送时政新闻和法律类内容（至少 6 条），其余涵盖科技、社会、财经等
2. 每条新闻包含标题和简短摘要（50字以内）
3. 返回纯 JSON 数组格式，每条格式为：{"title":"标题","summary":"摘要","source":"来源","category":"分类"}
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
  },

  /* ====== 旧学习数据迁移 ====== */
  async migrateOldStudyData() {
    const MIGRATE_FLAG = '_studyMigrated_v1';
    if (localStorage.getItem(MIGRATE_FLAG)) return 'already';

    const oldTasks = await db.all(db.STORES.study);
    if (!oldTasks.length) {
      localStorage.setItem(MIGRATE_FLAG, '1');
      return 'empty';
    }

    const iconMap = {
      'LEC 法律英语': '⚖️', '法语': '🇫🇷', '商法学': '📑', '民法学': '📑',
      '其他': '📖'
    };

    // 语言类科目名称集合（用于判断分流）
    const languageNames = new Set(['法语', '英语', '日语', '德语', '西班牙语', '意大利语', '俄语', '韩语', '葡萄牙语', 'LEC 法律英语']);

    // 收集所有学科
    const subjectNames = [...new Set(oldTasks.map(t => t.subject || '其他'))];
    const langSubjectIdMap = {};
    const profSubjectIdMap = {};
    let langSortOrder = 0;
    let profSortOrder = 0;

    for (const name of subjectNames) {
      const isLanguage = languageNames.has(name);

      if (isLanguage) {
        // 语言类 → languageSubject
        const existing = await db.query(db.STORES.languageSubject, s => s.name === name);
        if (existing.length > 0) {
          langSubjectIdMap[name] = existing[0].id;
        } else {
          const subj = await db.add(db.STORES.languageSubject, {
            name,
            icon: iconMap[name] || '📖',
            sortOrder: langSortOrder++
          });
          langSubjectIdMap[name] = subj.id;
        }
      } else {
        // 非语言类 → profSubject
        const existing = await db.query(db.STORES.profSubject, s => s.name === name);
        if (existing.length > 0) {
          profSubjectIdMap[name] = existing[0].id;
        } else {
          const subj = await db.add(db.STORES.profSubject, {
            name,
            icon: iconMap[name] || '📖',
            sortOrder: profSortOrder++
          });
          profSubjectIdMap[name] = subj.id;
        }
      }
    }

    // 迁移任务
    let migrated = 0;
    for (const old of oldTasks) {
      const name = old.subject || '其他';
      const isLanguage = languageNames.has(name);
      const subjectId = isLanguage ? langSubjectIdMap[name] : profSubjectIdMap[name];
      if (!subjectId) continue;

      // 转换频次
      let frequency = '每天';
      if (old.frequency) {
        if (old.frequency.type === 'daily') frequency = '每天';
        else if (old.frequency.type === 'weekly') frequency = '每周';
        else if (old.frequency.type === 'once') frequency = '每天';
        else if (old.frequency.type === 'custom') frequency = '自定义';
      }

      const store = isLanguage ? db.STORES.languageTask : db.STORES.profTask;

      await db.add(store, {
        subjectId,
        content: old.title || '未命名任务',
        note: old.note || '',
        priority: '中',
        frequency,
        customFreq: old.frequency?.type === 'custom' ? `每${old.frequency.days || 1}天` : '',
        done: old.done || false,
        checkins: (old.checkins || []).map(c => ({
          date: c.date,
          duration: c.duration || '',
          mood: c.mood || '',
          note: c.note || ''
        })),
        createdAt: old.createdAt || Date.now()
      });
      migrated++;
    }

    localStorage.setItem(MIGRATE_FLAG, '1');
    return `migrated ${migrated} tasks from ${subjectNames.length} subjects`;
  }
};

router.register('study', () => StudyCenter.list());
router.register('study/*', (param) => {
  const segs = param.split('/');
  const action = segs[0];

  // 新路由：study/lang/{subjectId}/{taskId}
  if (action === 'lang' && segs.length >= 3) {
    const subjectId = segs[1];
    const taskId = segs[2];
    StudyCenter.showTaskDetail(subjectId, taskId);
    return;
  }

  // 新路由：study/subject/{subjectId}
  if (action === 'subject' && segs.length >= 2) {
    StudyCenter.showSubjectDetail(segs[1]);
    return;
  }

  // 新路由：study/prof/{subjectId}/{taskId}
  if (action === 'prof' && segs.length >= 3) {
    StudyCenter.showProfTaskDetail(segs[1], segs[2]);
    return;
  }
  // 新路由：study/profsubj/{subjectId}
  if (action === 'profsubj' && segs.length >= 2) {
    StudyCenter.showProfSubjectDetail(segs[1]);
    return;
  }

  // 兼容旧的学习任务详情路由（重定向到学习中心）
  if (action === 'detail' && segs[1]) {
    // 旧 study 数据已被迁移，引导用户去学习中心
    router.navigate('study');
    return;
  }

  StudyCenter.list();
});

// 首次加载时自动执行迁移
StudyCenter.migrateOldStudyData().then(result => {
  if (result && result !== 'already' && result !== 'empty') {
    console.log('[StudyCenter] 旧数据迁移完成:', result);
  }
});

window.StudyCenter = StudyCenter;
