/* ============================================
   首页 Dashboard v3 - 整齐网格 + 墨绿层次
   ============================================ */

router.register('home', () => {
  App.setActiveNav('home');
  App.setFab(null);
  const main = document.getElementById('appMain');

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 6 ? '夜深了，早点休息' : hour < 11 ? '早安，新的一天' : hour < 14 ? '午安，休息片刻' : hour < 18 ? '下午好，继续加油' : hour < 22 ? '晚安，辛苦了' : '夜深了，早点休息';
  const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  main.innerHTML = `
    <div class="fade-up">
      <!-- Hero 区域 -->
      <div class="dash-hero">
        <div class="dh-deco dh-deco-1"></div>
        <div class="dh-deco dh-deco-2"></div>
        <div class="dh-top">
          <div class="dh-left">
            <div class="dh-date">${now.getDate()}</div>
            <div class="dh-month">${now.getMonth() + 1}月 · ${weekday}</div>
          </div>
          <div class="dh-greet">${greeting}</div>
        </div>
        <div class="dh-divider"></div>
        <div class="dh-stats" id="heroStats">
          <div class="dh-stat"><span class="num">·</span><span class="label">待学</span></div>
          <div class="dh-stat-vline"></div>
          <div class="dh-stat"><span class="num">·</span><span class="label">待办</span></div>
          <div class="dh-stat-vline"></div>
          <div class="dh-stat"><span class="num">·</span><span class="label">购物</span></div>
        </div>
        <div class="dh-quote" id="dailyQuoteBar">
          <span class="dh-quote-text" id="quoteText">加载中...</span>
        </div>
      </div>

      <!-- 今日待办速览 -->
      <div class="todo-preview" id="todoPreview">
        <div class="tp-head">
          <span class="tp-title">今日待办</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="tp-count" id="todoCount">0</span>
            <button id="addTodoBtn" style="width:24px;height:24px;border-radius:50%;border:1.5px solid var(--ink-line);background:var(--paper-card);color:var(--ink);font-size:16px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>
          </div>
        </div>
        <div class="tp-list" id="todoList">
          <div class="tp-loading">加载中...</div>
        </div>
      </div>

      <!-- 主导航三大模块（强调） -->
      <div class="section-title">今日重点</div>
      <div class="dash-grid-3" id="mainGrid">
        <div class="dash-card-lg" data-route="study">
          <div class="dc-lg-icon">📚</div>
          <div class="dc-lg-title">学习</div>
          <div class="dc-lg-body" id="dcStudy">加载中...</div>
        </div>
        <div class="dash-card-lg" data-route="account">
          <div class="dc-lg-icon">💰</div>
          <div class="dc-lg-title">记账</div>
          <div class="dc-lg-body" id="dcAccount">加载中...</div>
        </div>
        <div class="dash-card-lg" data-route="travel">
          <div class="dc-lg-icon">✈️</div>
          <div class="dc-lg-title">旅游</div>
          <div class="dc-lg-body" id="dcTravel">加载中...</div>
        </div>
      </div>

      <!-- 其他模块 -->
      <div class="section-title">生活百事</div>
      <div class="dash-grid" id="dashGrid">
        <div class="dash-card accent-gold" data-route="recipe">
          <div class="dc-bar"></div>
          <div class="dc-head">
            <span class="dc-icon">🍳</span>
            <span class="dc-title">下厨</span>
          </div>
          <div class="dc-body" id="dcRecipe">加载中...</div>
        </div>
        <div class="dash-card accent-rust" data-route="museum">
          <div class="dc-bar"></div>
          <div class="dc-head">
            <span class="dc-icon">🏺</span>
            <span class="dc-title">博物馆</span>
          </div>
          <div class="dc-body" id="dcMuseum">加载中...</div>
        </div>
        <div class="dash-card accent-blue" data-route="work">
          <div class="dc-bar"></div>
          <div class="dc-head">
            <span class="dc-icon">💼</span>
            <span class="dc-title">工作</span>
          </div>
          <div class="dc-body" id="dcWork">加载中...</div>
        </div>
        <div class="dash-card accent-rust" data-route="punch">
          <div class="dc-bar"></div>
          <div class="dc-head">
            <span class="dc-icon">📍</span>
            <span class="dc-title">打卡</span>
          </div>
          <div class="dc-body" id="dcPunch">加载中...</div>
        </div>
        <div class="dash-card" data-route="interest">
          <div class="dc-bar"></div>
          <div class="dc-head">
            <span class="dc-icon">💡</span>
            <span class="dc-title">兴趣</span>
          </div>
          <div class="dc-body" id="dcInterest">加载中...</div>
        </div>
        <div class="dash-card accent-gold" data-route="pet">
          <div class="dc-bar"></div>
          <div class="dc-head">
            <span class="dc-icon">🐾</span>
            <span class="dc-title">宠物</span>
          </div>
          <div class="dc-body" id="dcPet">加载中...</div>
        </div>
      </div>

      <!-- 每日一言 -->
      <div class="dash-quote" id="dailyQuote">
        <span class="dq-mark">「</span>
        <span class="dq-text">日拱一卒，功不唐捐</span>
        <span class="dq-mark">」</span>
      </div>
    </div>
  `;

  // 卡片点击导航
  main.querySelectorAll('[data-route]').forEach((c) => {
    c.addEventListener('click', () => router.navigate(c.dataset.route));
  });

  // 每日一言（按日期轮换 + AI 生成）
  const quotes = [
    '日拱一卒，功不唐捐',
    '不积跬步，无以至千里',
    '腹有诗书气自华',
    '业精于勤，荒于嬉',
    '千里之行，始于足下',
    '学而不思则罔，思而不学则殆',
    '宝剑锋从磨砺出',
    '书中自有黄金屋',
    '路漫漫其修远兮，吾将上下而求索',
    '天行健，君子以自强不息'
  ];
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const dqEl = document.querySelector('#dailyQuote .dq-text');
  if (dqEl) {
    // 先用本地金句显示
    dqEl.textContent = quotes[dayOfYear % quotes.length];
    // 异步尝试 AI 生成今日金句（每天只生成一次）
    (async () => {
      const today = UI.todayStr();
      try {
        const cached = await db.query(db.STORES.dailyQuote, q => q.date === today);
        if (cached.length > 0) {
          dqEl.textContent = cached[0].text;
          return;
        }
        const prompt = '请随机生成一条经典金句（古今诗词、古文名句或中外哲理格言）。要求：1.积极向上 2.不超过30字 3.标注出处。返回JSON：{"text":"金句","source":"出处"}';
        const resp = await AI._callOnline(prompt, '');
        const cleaned = (AI._stripCodeFence ? AI._stripCodeFence(resp) : resp).trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          const data = JSON.parse(match[0]);
          dqEl.textContent = data.text;
          try {
            await db.add(db.STORES.dailyQuote, { text: data.text, source: data.source || '', date: today });
          } catch(e) {}
        }
      } catch(e) {}
    })();
  }

  // 异步加载各模块数据
  (async () => {
    const [langSubjects, langTasks, profSubjects, profTasks, accounts, logs, travels, recipes, ings, museums, relics, works, punchs, interests, pets, dailyTodos] = await Promise.all([
      db.all(db.STORES.languageSubject),
      db.all(db.STORES.languageTask),
      db.all(db.STORES.profSubject),
      db.all(db.STORES.profTask),
      db.all(db.STORES.account),
      db.all(db.STORES.accountLog),
      db.all(db.STORES.travel),
      db.all(db.STORES.recipe),
      db.all(db.STORES.recipeIngredients),
      db.all(db.STORES.museum),
      db.all(db.STORES.relic),
      db.all(db.STORES.work),
      db.all(db.STORES.punch),
      db.all(db.STORES.interest),
      db.all(db.STORES.pet),
      db.all(db.STORES.dailyTodo)
    ]);

    // 今日待办速览 - 汇总各模块待办
    const todos = [];
    const today = UI.todayStr();
    const subjectMap = {};
    langSubjects.forEach(s => subjectMap[s.id] = s);
    profSubjects.forEach(s => subjectMap[s.id] = s);

    // 学习：未完成且今日未打卡的语言任务（自动加入今日待办）
    langTasks.filter(t => !t.done).slice(0, 5).forEach(t => {
      const checkedToday = (t.checkins || []).some(c => c.date === today);
      const subj = subjectMap[t.subjectId];
      todos.push({
        icon: subj?.icon || '📚',
        text: t.content,
        sub: checkedToday ? '今日已打卡' : '今日未打卡',
        route: 'study/lang/' + t.subjectId + '/' + t.id,
        done: checkedToday,
        sort: checkedToday ? 2 : 0
      });
    });

    // 专业：未完成且今日未打卡的专业任务（自动加入今日待办）
    profTasks.filter(t => !t.done).slice(0, 5).forEach(t => {
      const checkedToday = (t.checkins || []).some(c => c.date === today);
      const subj = subjectMap[t.subjectId];
      todos.push({
        icon: subj?.icon || '📑',
        text: t.content,
        sub: checkedToday ? '今日已打卡' : '今日未打卡',
        route: 'study/prof/' + t.subjectId + '/' + t.id,
        done: checkedToday,
        sort: checkedToday ? 2 : 0
      });
    });

    // 工作：进行中
    works.filter((w) => (w.progress || 0) < 100).slice(0, 2).forEach((w) => {
      todos.push({
        icon: '💼',
        text: w.title,
        sub: `进度 ${w.progress || 0}%`,
        route: 'work',
        done: false,
        sort: 1
      });
    });

    // 购物：待买食材
    const needBuy = ings.filter((i) => !i.have).slice(0, 3);
    needBuy.forEach((i) => {
      todos.push({
        icon: '🛒',
        text: i.name,
        sub: '待买食材',
        route: 'recipe',
        done: false,
        sort: 3
      });
    });

    // 手动待办：今日未完成的
    dailyTodos.filter((d) => d.date === today && !d.done).slice(0, 5).forEach((d) => {
      todos.push({
        icon: '📝',
        text: d.text,
        sub: '手动待办',
        route: null,
        done: d.done,
        sort: 0,
        manualId: d.id
      });
    });

    // 按优先级排序：未完成在前
    todos.sort((a, b) => a.sort - b.sort);

    const todoListEl = document.getElementById('todoList');
    const todoCountEl = document.getElementById('todoCount');
    const undoneCount = todos.filter((t) => !t.done).length;
    todoCountEl.textContent = undoneCount;

    if (todos.length === 0) {
      todoListEl.innerHTML = `
        <div class="tp-empty">
          <span style="font-size:24px">🌿</span>
          <span>今日暂无待办，享受时光吧</span>
        </div>`;
    } else {
      todoListEl.innerHTML = todos
        .slice(0, 5)
        .map(
          (t) => `
        <div class="tp-item ${t.done ? 'done' : ''}" data-route="${t.route || ''}" data-manual-id="${t.manualId || ''}" style="cursor:${t.manualId ? 'pointer' : 'pointer'};">
          <span class="tp-dot ${t.done ? 'done' : ''}">${t.done ? '✓' : ''}</span>
          <div class="tp-content">
            <span class="tp-text">${t.text}</span>
            <span class="tp-sub">${t.sub}</span>
          </div>
          <span class="tp-icon">${t.icon}</span>
        </div>`
        )
        .join('');

      todoListEl.querySelectorAll('.tp-item').forEach((item) => {
        item.onclick = () => {
          if (item.dataset.manualId) {
            // 手动待办：点击标记完成
            const id = item.dataset.manualId;
            db.get(db.STORES.dailyTodo, id).then(record => {
              if (record) {
                record.done = true;
                db.put(db.STORES.dailyTodo, record);
                item.classList.add('done');
                item.querySelector('.tp-dot').textContent = '✓';
                item.querySelector('.tp-dot').classList.add('done');
                const undoneCount = todoListEl.querySelectorAll('.tp-item:not(.done)').length;
                const todoCountEl = document.getElementById('todoCount');
                if (todoCountEl) todoCountEl.textContent = undoneCount;
              }
            });
          } else if (item.dataset.route) {
            router.navigate(item.dataset.route);
          }
        };
      });
    }

    // 添加手动待办按钮
    const addTodoBtn = document.getElementById('addTodoBtn');
    if (addTodoBtn) {
      addTodoBtn.onclick = () => {
        const body = `
          <div style="padding:8px;">
            <textarea id="newTodoText" class="field" rows="3" placeholder="输入待办事项..." style="width:100%;resize:none;margin-bottom:12px;"></textarea>
            <button class="btn btn-primary" id="saveTodoBtn" style="width:100%;">添加</button>
          </div>
        `;
        UI.showSheet('新增待办', body, (root) => {
          root.querySelector('#saveTodoBtn').onclick = async () => {
            const text = root.querySelector('#newTodoText').value.trim();
            if (!text) {
              UI.toast('请输入待办内容');
              return;
            }
            await db.add(db.STORES.dailyTodo, {
              text: text,
              date: UI.todayStr(),
              done: false,
              createdAt: Date.now()
            });
            UI.hideSheet();
            UI.toast('已添加待办');
            // 重新加载首页以刷新待办列表
            router.navigate('home');
          };
        });
      };
    }

    // Hero 统计 —— 待学 = 语言+专业未完成任务总数
    const studyTodo = langTasks.filter((t) => !t.done).length + profTasks.filter((t) => !t.done).length;
    const workTodo = works.filter((w) => (w.progress || 0) < 100).length;
    const buyTodo = ings.filter((i) => !i.have).length;
    document.getElementById('heroStats').innerHTML = `
      <div class="dh-stat"><span class="num">${studyTodo}</span><span class="label">待学</span></div>
      <div class="dh-stat-vline"></div>
      <div class="dh-stat"><span class="num">${workTodo}</span><span class="label">待办</span></div>
      <div class="dh-stat-vline"></div>
      <div class="dh-stat"><span class="num">${buyTodo}</span><span class="label">购物</span></div>
    `;

    // 学习卡片 - 大卡（语言+专业任务合并统计）
    const allTasks = [...langTasks, ...profTasks];
    const studyDone = allTasks.filter((t) => t.done).length;
    const todayCheckin = allTasks.filter((t) => (t.checkins || []).some((c) => c.date === UI.todayStr())).length;
    // 计算总连续天数（合并两种任务的打卡日期）
    const allCheckinDates = new Set();
    allTasks.forEach((t) => (t.checkins || []).forEach((c) => allCheckinDates.add(c.date)));
    let streak = 0;
    let checkDate = new Date();
    while (allCheckinDates.has(UI.formatDate(checkDate.getTime()))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    document.getElementById('dcStudy').innerHTML = `
      <div class="dc-lg-num">${studyDone}<span class="dc-lg-unit">/${allTasks.length}</span></div>
      <div class="dc-lg-sub">已完成任务</div>
      <div class="dc-lg-tags">
        <span class="dc-lg-tag">🔥 连续 ${streak} 天</span>
        <span class="dc-lg-tag">今日 ${todayCheckin} 打卡</span>
      </div>
    `;

    // 记账卡片 - 大卡
    const monthLogs = logs.filter((l) => UI.formatDate(l.createdAt).startsWith(monthStr));
    const monthOut = monthLogs.filter((l) => l.type === 'out').reduce((a, l) => a + l.amount, 0);
    const monthIn = monthLogs.filter((l) => l.type === 'in').reduce((a, l) => a + l.amount, 0);
    const totalBalance = accounts.reduce((a, c) => a + (c.balance || 0), 0);
    document.getElementById('dcAccount').innerHTML = `
      <div class="dc-lg-num">¥${totalBalance.toFixed(0)}</div>
      <div class="dc-lg-sub">账户总余额</div>
      <div class="dc-lg-tags">
        <span class="dc-lg-tag out">支 ¥${monthOut.toFixed(0)}</span>
        <span class="dc-lg-tag in">收 ¥${monthIn.toFixed(0)}</span>
      </div>
    `;

    // 旅游卡片 - 大卡
    const travelTodo = travels.filter((t) => !t.done).length;
    const travelDone = travels.filter((t) => t.done).length;
    document.getElementById('dcTravel').innerHTML = `
      <div class="dc-lg-num">${travelTodo}<span class="dc-lg-unit">想去</span></div>
      <div class="dc-lg-sub">${travelDone} 处已踏足</div>
      <div class="dc-lg-tags">
        <span class="dc-lg-tag">${travels.length} 个目的地</span>
      </div>
    `;

    // 下厨卡片
    document.getElementById('dcRecipe').innerHTML = `
      <span class="highlight gold">${recipes.length}</span><span style="font-size:12px;color:var(--ink-mute)"> 道菜谱</span>
      <div class="dc-foot">待买食材 ${buyTodo} 种</div>
    `;

    // 博物馆卡片
    document.getElementById('dcMuseum').innerHTML = `
      <span class="highlight rust">${museums.length}</span><span style="font-size:12px;color:var(--ink-mute)"> 座博物馆</span>
      <div class="dc-foot">${relics.length} 件文物留影</div>
    `;

    // 工作卡片
    const workAvg = works.length ? Math.round(works.reduce((a, w) => a + (w.progress || 0), 0) / works.length) : 0;
    document.getElementById('dcWork').innerHTML = `
      <span class="highlight">${workAvg}%</span><span style="font-size:12px;color:var(--ink-mute)"> 平均进度</span>
      <div class="dc-foot">${workTodo} 项进行中</div>
    `;

    // 打卡卡片
    const punchTodo = punchs.filter((p) => !p.done).length;
    document.getElementById('dcPunch').innerHTML = `
      <span class="highlight rust">${punchTodo}</span><span style="font-size:12px;color:var(--ink-mute)"> 想去</span>
      <div class="dc-foot">${punchs.length} 个地点</div>
    `;

    // 兴趣卡片
    const intTodo = interests.filter((i) => !i.done).length;
    document.getElementById('dcInterest').innerHTML = `
      <span class="highlight">${intTodo}</span><span style="font-size:12px;color:var(--ink-mute)"> 想做</span>
      <div class="dc-foot">${interests.length} 件想做的事</div>
    `;

    // 宠物卡片
    const petEl = document.getElementById('dcPet');
    if (petEl) {
      if (pets.length === 0) {
        petEl.innerHTML = `<span style="font-size:12px;color:var(--ink-mute)">点击添加宠物</span>`;
      } else {
        const names = pets.map((p) => p.name).join('、');
        petEl.innerHTML = `
          <span class="highlight gold">${pets.length}</span><span style="font-size:12px;color:var(--ink-mute)"> 只宝贝</span>
          <div class="dc-foot">${names.length > 20 ? names.slice(0, 20) + '...' : names}</div>
        `;
      }
    }
  })();

  // 每日金句
  (async () => {
    const today = UI.todayStr();
    const quoteEl = document.getElementById('quoteText');
    if (!quoteEl) return;
    // 尝试从缓存获取
    try {
      const cached = await db.query(db.STORES.dailyQuote, q => q.date === today);
      if (cached.length > 0) {
        quoteEl.textContent = cached[0].text;
        return;
      }
    } catch(e) {}
    // 本地备用金句
    const fallback = ['日拱一卒，功不唐捐','不积跬步，无以至千里','腹有诗书气自华','业精于勤，荒于嬉','博学之，审问之，慎思之，明辨之，笃行之','路漫漫其修远兮，吾将上下而求索','天行健，君子以自强不息','知之者不如好之者，好之者不如乐之者','学而不思则罔，思而不学则殆','千里之行，始于足下'];
    const d = new Date();
    const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    quoteEl.textContent = fallback[dayOfYear % fallback.length];
    // 尝试 AI 生成
    quoteEl.textContent = '✨ 获取中...';
    try {
      const prompt = '请随机生成一条经典金句（古今诗词、古文名句或中外哲理格言）。要求：1.积极向上 2.不超过30字 3.标注出处。返回JSON：{"text":"金句","source":"出处"}';
      const resp = await AI._callOnline(prompt, '');
      const cleaned = (AI._stripCodeFence ? AI._stripCodeFence(resp) : resp).trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        const data = JSON.parse(match[0]);
        quoteEl.textContent = data.text;
        try {
          await db.add(db.STORES.dailyQuote, { text: data.text, source: data.source || '', date: today });
        } catch(e) {}
      } else {
        quoteEl.textContent = fallback[dayOfYear % fallback.length];
      }
    } catch(e) {
      quoteEl.textContent = fallback[dayOfYear % fallback.length];
    }
  })();

});
