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
          <div class="dh-stat"><span class="num">·</span><span class="label">待买</span></div>
        </div>
      </div>

      <!-- 今日待办速览 -->
      <div class="todo-preview" id="todoPreview">
        <div class="tp-head">
          <span class="tp-title">今日待办</span>
          <span class="tp-count" id="todoCount">0</span>
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

  // 每日一言（按日期轮换）
  const quotes = [
    '日拱一卒，功不唐捐',
    '不积跬步，无以至千里',
    '腹有诗书气自华',
    '业精于勤，荒于嬉',
    '千里之行，始于足下',
    '学而不思则罔，思而不学则殆',
    '宝剑锋从磨砺出',
    '书中自有黄金屋'
  ];
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  document.querySelector('#dailyQuote .dq-text').textContent = quotes[dayOfYear % quotes.length];

  // 异步加载各模块数据
  (async () => {
    const [studies, accounts, logs, travels, recipes, ings, museums, relics, works, punchs, interests, pets] = await Promise.all([
      db.all(db.STORES.study),
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
      db.all(db.STORES.pet)
    ]);

    // 今日待办速览 - 汇总各模块待办
    const todos = [];
    const today = UI.todayStr();

    // 学习：未完成任务 + 今日未打卡
    studies.filter((s) => !s.done).slice(0, 3).forEach((s) => {
      const checkedToday = s.checkins?.some((c) => c.date === today);
      todos.push({
        icon: '📚',
        text: s.title,
        sub: checkedToday ? '今日已打卡' : '今日未打卡',
        route: 'study/detail/' + s.id,
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

    // 打卡清单：未完成
    punchs.filter((p) => !p.done).slice(0, 2).forEach((p) => {
      todos.push({
        icon: '📍',
        text: p.name,
        sub: '想去打卡',
        route: 'punch',
        done: false,
        sort: 4
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
        <div class="tp-item ${t.done ? 'done' : ''}" data-route="${t.route}">
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
        item.onclick = () => router.navigate(item.dataset.route);
      });
    }

    // Hero 统计
    const studyTodo = studies.filter((s) => !s.done).length;
    const workTodo = works.filter((w) => (w.progress || 0) < 100).length;
    const buyTodo = ings.filter((i) => !i.have).length;
    document.getElementById('heroStats').innerHTML = `
      <div class="dh-stat"><span class="num">${studyTodo}</span><span class="label">待学</span></div>
      <div class="dh-stat-vline"></div>
      <div class="dh-stat"><span class="num">${workTodo}</span><span class="label">待办</span></div>
      <div class="dh-stat-vline"></div>
      <div class="dh-stat"><span class="num">${buyTodo}</span><span class="label">待买</span></div>
    `;

    // 学习卡片 - 大卡
    const studyDone = studies.filter((s) => s.done).length;
    const todayCheckin = studies.filter((s) => s.checkins?.some((c) => c.date === UI.todayStr())).length;
    // 计算总连续天数
    const allCheckinDates = new Set();
    studies.forEach((s) => (s.checkins || []).forEach((c) => allCheckinDates.add(c.date)));
    let streak = 0;
    let checkDate = new Date();
    while (allCheckinDates.has(UI.formatDate(checkDate.getTime()))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    document.getElementById('dcStudy').innerHTML = `
      <div class="dc-lg-num">${studyDone}<span class="dc-lg-unit">/${studies.length}</span></div>
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
});
