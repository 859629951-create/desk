/* ============================================
   记账本模块 v2
   - 账户分组：银行卡、支付软件、团购
   - 收支流水记录
   - 月度报告（饼图 + 趋势线）
   ============================================ */

const Account = {
  groups: [
    { key: 'bank', label: '银行卡', icon: '🏦' },
    { key: 'pay', label: '支付软件', icon: '📱' },
    { key: 'group', label: '团购', icon: '🛒' }
  ],

  /* 支出分类 */
  categories: [
    { key: 'food', label: '餐饮', icon: '🍚', color: '#2f4a28' },
    { key: 'transport', label: '交通', icon: '🚌', color: '#5a7a52' },
    { key: 'shop', label: '购物', icon: '🛍️', color: '#b8923a' },
    { key: 'fun', label: '娱乐', icon: '🎬', color: '#a05a3a' },
    { key: 'home', label: '居家', icon: '🏠', color: '#3a4a5b' },
    { key: 'other', label: '其他', icon: '📦', color: '#8a9588' }
  ],

  async list() {
    App.setActiveNav('account');
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="fade-up">
        <div class="stat-row" id="accStats"></div>
        <div class="tabs" id="aTabs">
          <div class="tab active" data-tab="accounts">账户</div>
          <div class="tab" data-tab="logs">流水</div>
          <div class="tab" data-tab="advance">垫付</div>
          <div class="tab" data-tab="report">报告</div>
        </div>
        <div id="accContent"></div>
      </div>
    `;
    App.setFab(() => this.addLog());

    let tab = 'accounts';
    const refresh = async () => {
      const accounts = await db.all(db.STORES.account);
      const logs = await db.all(db.STORES.accountLog);

      // 统计
      const totalIn = logs.filter((l) => l.type === 'in').reduce((a, l) => a + l.amount, 0);
      const totalOut = logs.filter((l) => l.type === 'out').reduce((a, l) => a + l.amount, 0);
      const totalAdvance = logs.filter((l) => l.type === 'advance').reduce((a, l) => a + l.amount, 0);
      const unpaidAdvance = logs.filter((l) => l.type === 'advance' && l.advanceStatus !== 'paid').reduce((a, l) => a + l.amount, 0);
      const totalBalance = accounts.reduce((a, c) => a + (c.balance || 0), 0);
      document.getElementById('accStats').innerHTML = `
        <div class="stat-box"><div class="sb-num">¥${totalBalance.toFixed(0)}</div><div class="sb-label">总余额</div></div>
        <div class="stat-box"><div class="sb-num" style="color:var(--forest)">+${totalIn.toFixed(0)}</div><div class="sb-label">总收入</div></div>
        <div class="stat-box"><div class="sb-num" style="color:var(--rust)">-${totalOut.toFixed(0)}</div><div class="sb-label">总支出</div></div>
      `;

      const el = document.getElementById('accContent');
      if (tab === 'accounts') {
        App.setFab(null);
        el.innerHTML = this.groups
          .map((g) => {
            const items = accounts.filter((a) => a.group === g.key);
            const total = items.reduce((a, c) => a + (c.balance || 0), 0);
            return `
            <div class="acc-group">
              <div class="ag-head">
                <div class="ag-title">${g.icon} ${g.label}</div>
                <div class="ag-total">¥${total.toFixed(2)}</div>
              </div>
              ${
                items.length === 0
                  ? `<div style="font-size:12px;color:var(--ink-mute);padding:8px 0;">暂无账户</div>`
                  : items
                      .map(
                        (a) => `
                <div class="acc-item" data-id="${a.id}">
                  <span style="font-size:16px">${g.icon}</span>
                  <span class="ai-name">${a.name}</span>
                  <span class="ai-amount ${a.balance >= 0 ? 'in' : 'out'}">¥${(a.balance || 0).toFixed(2)}</span>
                  <button class="icon-btn" data-act="acc-menu" data-aid="${a.id}" style="width:28px;height:28px;font-size:12px">⋯</button>
                </div>`
                      )
                      .join('')
              }
              <button class="btn btn-ghost" data-act="add-acc" data-group="${g.key}" style="width:100%;font-size:12px;padding:8px;margin-top:4px;">+ 添加${g.label}账户</button>
            </div>`;
          })
          .join('');
        el.querySelectorAll('[data-act="acc-menu"]').forEach((b) => {
          b.onclick = (e) => {
            e.stopPropagation();
            this.accMenu(b.dataset.aid);
          };
        });
        el.querySelectorAll('[data-act="add-acc"]').forEach((b) => {
          b.onclick = () => this.editAccount(null, b.dataset.group);
        });
      } else if (tab === 'logs') {
        App.setFab(() => this.addLog());
        logs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        if (logs.length === 0) {
          el.innerHTML = `<div class="empty"><div class="emoji">💰</div><div class="hint">点击 + 记一笔收支</div></div>`;
          return;
        }
        el.innerHTML = logs
          .slice(0, 100)
          .map(
            (l) => {
              const icon = l.type === 'in' ? '📥' : l.type === 'advance' ? '🏠' : '📤';
              const amountClass = l.type === 'in' ? 'in' : 'out';
              const amountSign = l.type === 'in' ? '+' : '-';
              const advanceTag = l.type === 'advance' ? (l.advanceStatus === 'paid' ? '<span class="chip green">已归还</span>' : '<span class="chip yellow">待归还</span>') : '';
              return `
          <div class="acc-item" data-id="${l.id}">
            <span style="font-size:16px">${icon}</span>
            <div style="flex:1">
              <div class="ai-name">${l.desc || (l.type === 'in' ? '收入' : l.type === 'advance' ? '家庭垫付' : '支出')}${l.type === 'advance' && l.advanceTo ? ' · ' + l.advanceTo : ''}</div>
              <div style="font-size:11px;color:var(--ink-mute)">${UI.formatDate(l.createdAt, true)} · ${l.accountName || ''} ${advanceTag}</div>
            </div>
            <span class="ai-amount ${amountClass}">${amountSign}¥${l.amount.toFixed(2)}</span>
            <button class="icon-btn" data-act="log-menu" data-lid="${l.id}" style="width:28px;height:28px;font-size:12px">⋯</button>
          </div>`;
            }
          )
          .join('');
        el.querySelectorAll('[data-act="log-menu"]').forEach((b) => {
          b.onclick = (e) => {
            e.stopPropagation();
            this.logMenu(b.dataset.lid);
          };
        });
      } else if (tab === 'advance') {
        App.setFab(() => this.addLog());
        const advLogs = logs.filter((l) => l.type === 'advance').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        const totalAdv = advLogs.reduce((a, l) => a + l.amount, 0);
        const unpaid = advLogs.filter((l) => l.advanceStatus !== 'paid');
        const unpaidTotal = unpaid.reduce((a, l) => a + l.amount, 0);
        const paidTotal = totalAdv - unpaidTotal;

        if (advLogs.length === 0) {
          el.innerHTML = `<div class="empty"><div class="emoji">🏠</div><div class="hint">暂无家庭垫付记录</div></div>`;
          return;
        }
        el.innerHTML = `
          <div class="advance-summary">
            <div class="as-row">
              <div class="as-item">
                <div class="as-num">¥${unpaidTotal.toFixed(2)}</div>
                <div class="as-label">待归还</div>
              </div>
              <div class="as-item">
                <div class="as-num" style="color:var(--forest)">¥${paidTotal.toFixed(2)}</div>
                <div class="as-label">已归还</div>
              </div>
              <div class="as-item">
                <div class="as-num" style="color:var(--ink-soft)">¥${totalAdv.toFixed(2)}</div>
                <div class="as-label">合计</div>
              </div>
            </div>
          </div>
          ${unpaid.length > 0 ? `<div class="section-title">⏳ 待归还（${unpaid.length}）</div>` : ''}
          ${unpaid
            .map(
              (l) => `
            <div class="acc-item advance-item unpaid" data-id="${l.id}">
              <span style="font-size:16px">🏠</span>
              <div style="flex:1">
                <div class="ai-name">${l.desc || '家庭垫付'} · ${l.advanceTo || '家人'}</div>
                <div style="font-size:11px;color:var(--ink-mute)">${UI.formatDate(l.createdAt, true)} · ${l.accountName || ''}</div>
              </div>
              <span class="ai-amount out">¥${l.amount.toFixed(2)}</span>
              <button class="icon-btn" data-act="adv-repay" data-lid="${l.id}" style="width:28px;height:28px;font-size:12px;background:var(--forest);color:var(--paper-light);border:none">✓</button>
            </div>`
            )
            .join('')}
          ${paidTotal > 0 ? `<div class="section-title">✅ 已归还</div>` : ''}
          ${advLogs
            .filter((l) => l.advanceStatus === 'paid')
            .map(
              (l) => `
            <div class="acc-item advance-item paid" data-id="${l.id}">
              <span style="font-size:16px">🏠</span>
              <div style="flex:1">
                <div class="ai-name" style="color:var(--ink-mute)">${l.desc || '家庭垫付'} · ${l.advanceTo || '家人'}</div>
                <div style="font-size:11px;color:var(--ink-mute)">${UI.formatDate(l.createdAt, true)}</div>
              </div>
              <span class="ai-amount" style="color:var(--forest)">¥${l.amount.toFixed(2)}</span>
              <button class="icon-btn" data-act="log-menu" data-lid="${l.id}" style="width:28px;height:28px;font-size:12px">⋯</button>
            </div>`
            )
            .join('')}
        `;
        el.querySelectorAll('[data-act="adv-repay"]').forEach((b) => {
          b.onclick = async (e) => {
            e.stopPropagation();
            await this.markAdvancePaid(b.dataset.lid);
          };
        });
        el.querySelectorAll('[data-act="log-menu"]').forEach((b) => {
          b.onclick = (e) => {
            e.stopPropagation();
            this.logMenu(b.dataset.lid);
          };
        });
      } else if (tab === 'report') {
        App.setFab(null);
        await this.renderReport(el, logs);
      }
    };

    document.querySelectorAll('#aTabs .tab').forEach((t) => {
      t.onclick = () => {
        document.querySelectorAll('#aTabs .tab').forEach((x) => x.classList.remove('active'));
        t.classList.add('active');
        tab = t.dataset.tab;
        refresh();
      };
    });
    refresh();
  },

  /* 渲染月度报告 */
  async renderReport(el, logs) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    // 本月流水
    const monthLogs = logs.filter((l) => UI.formatDate(l.createdAt).startsWith(monthStr));
    const monthOut = monthLogs.filter((l) => l.type === 'out');
    const monthIn = monthLogs.filter((l) => l.type === 'in');
    const totalOut = monthOut.reduce((a, l) => a + l.amount, 0);
    const totalIn = monthIn.reduce((a, l) => a + l.amount, 0);

    if (monthLogs.length === 0) {
      el.innerHTML = `<div class="empty"><div class="emoji">📊</div><div class="hint">本月暂无记录，记一笔即可生成报告</div></div>`;
      return;
    }

    // 按分类汇总支出
    const catSums = {};
    monthOut.forEach((l) => {
      const cat = l.category || 'other';
      catSums[cat] = (catSums[cat] || 0) + l.amount;
    });
    const catData = this.categories
      .map((c) => ({ ...c, sum: catSums[c.key] || 0 }))
      .filter((c) => c.sum > 0)
      .sort((a, b) => b.sum - a.sum);

    // 按日汇总支出（趋势线）
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyOut = new Array(daysInMonth + 1).fill(0);
    monthOut.forEach((l) => {
      const day = new Date(l.createdAt).getDate();
      dailyOut[day] += l.amount;
    });

    el.innerHTML = `
      <div class="report-head">
        <div class="rh-title">${year}年${month + 1}月报告</div>
        <div class="rh-summary">
          <div class="rhs-item">
            <div class="rhs-label">收入</div>
            <div class="rhs-num in">+¥${totalIn.toFixed(2)}</div>
          </div>
          <div class="rhs-item">
            <div class="rhs-label">支出</div>
            <div class="rhs-num out">-¥${totalOut.toFixed(2)}</div>
          </div>
          <div class="rhs-item">
            <div class="rhs-label">结余</div>
            <div class="rhs-num">${(totalIn - totalOut).toFixed(2)}</div>
          </div>
        </div>
      </div>

      ${catData.length > 0 ? `
      <div class="chart-box">
        <div class="cb-title">支出分类</div>
        <div class="pie-wrap">
          ${this.renderPieChart(catData, totalOut)}
        </div>
        <div class="cb-legend">
          ${catData
            .map((c) => `
            <div class="lg-item">
              <span class="lg-dot" style="background:${c.color}"></span>
              <span>${c.icon} ${c.label} ¥${c.sum.toFixed(0)}</span>
              <span style="color:var(--ink-mute)">(${Math.round((c.sum / totalOut) * 100)}%)</span>
            </div>`)
            .join('')}
        </div>
      </div>` : ''}

      <div class="chart-box">
        <div class="cb-title">每日支出趋势</div>
        ${this.renderTrendChart(dailyOut, daysInMonth, now.getDate())}
      </div>

      ${catData.length > 0 ? `
      <div class="chart-box">
        <div class="cb-title">分类排行</div>
        ${catData
          .map((c, i) => {
            const pct = Math.round((c.sum / totalOut) * 100);
            return `
          <div class="rank-item">
            <span class="ri-rank">${i + 1}</span>
            <span class="ri-icon">${c.icon}</span>
            <span class="ri-name">${c.label}</span>
            <div class="ri-bar-wrap">
              <div class="ri-bar" style="width:${pct}%;background:${c.color}"></div>
            </div>
            <span class="ri-amount">¥${c.sum.toFixed(0)}</span>
          </div>`;
          })
          .join('')}
      </div>` : ''}
    `;
  },

  /* SVG 饼图 */
  renderPieChart(data, total) {
    const size = 140;
    const cx = size / 2;
    const cy = size / 2;
    const r = 55;
    const innerR = 32;

    let angle = -Math.PI / 2;
    const slices = data.map((d) => {
      const pct = d.sum / total;
      const startAngle = angle;
      const endAngle = angle + pct * Math.PI * 2;
      angle = endAngle;

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const x3 = cx + innerR * Math.cos(endAngle);
      const y3 = cy + innerR * Math.sin(endAngle);
      const x4 = cx + innerR * Math.cos(startAngle);
      const y4 = cy + innerR * Math.sin(startAngle);

      const largeArc = pct > 0.5 ? 1 : 0;
      const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;

      return `<path d="${path}" fill="${d.color}" stroke="#fff" stroke-width="1.5"/>`;
    });

    return `
      <div style="display:flex;justify-content:center;padding:8px 0">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          ${slices.join('')}
          <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-family="var(--font-num)" font-size="13" fill="var(--ink)">总支出</text>
          <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-family="var(--font-num)" font-size="15" fill="var(--forest)" font-weight="700">¥${total.toFixed(0)}</text>
        </svg>
      </div>
    `;
  },

  /* SVG 趋势线图 */
  renderTrendChart(dailyOut, daysInMonth, todayDay) {
    const width = 300;
    const height = 120;
    const padX = 28;
    const padY = 16;
    const chartW = width - padX * 2;
    const chartH = height - padY * 2;

    const maxVal = Math.max(...dailyOut.slice(1, todayDay + 1), 10);
    const stepX = chartW / (daysInMonth - 1);

    // 数据点
    const points = [];
    for (let d = 1; d <= todayDay; d++) {
      const x = padX + (d - 1) * stepX;
      const y = padY + chartH - (dailyOut[d] / maxVal) * chartH;
      points.push({ x, y, val: dailyOut[d], day: d });
    }

    // 折线路径
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    // 面积路径
    const areaPath = linePath + ` L ${points[points.length - 1].x} ${padY + chartH} L ${points[0].x} ${padY + chartH} Z`;

    // Y 轴刻度
    const yTicks = [0, maxVal / 2, maxVal];

    return `
      <div style="overflow-x:auto">
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block;margin:0 auto">
          <!-- 网格线 -->
          ${yTicks
            .map((v) => {
              const y = padY + chartH - (v / maxVal) * chartH;
              return `<line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" stroke="var(--ink-line)" stroke-width="0.5" stroke-dasharray="2 2"/>
                      <text x="${padX - 4}" y="${y + 3}" text-anchor="end" font-size="8" fill="var(--ink-mute)">${v.toFixed(0)}</text>`;
            })
            .join('')}

          <!-- 面积 -->
          <path d="${areaPath}" fill="rgba(47,74,40,0.1)"/>
          <!-- 折线 -->
          <path d="${linePath}" fill="none" stroke="var(--forest)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>

          <!-- 数据点 -->
          ${points
            .map((p) => {
              if (p.val > 0) {
                return `<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="var(--forest)"/>`;
              }
              return '';
            })
            .join('')}

          <!-- X 轴标签 -->
          <text x="${padX}" y="${height - 4}" text-anchor="middle" font-size="8" fill="var(--ink-mute)">1日</text>
          <text x="${padX + (Math.ceil(daysInMonth / 2) - 1) * stepX}" y="${height - 4}" text-anchor="middle" font-size="8" fill="var(--ink-mute)">${Math.ceil(daysInMonth / 2)}日</text>
          <text x="${width - padX}" y="${height - 4}" text-anchor="middle" font-size="8" fill="var(--ink-mute)">${daysInMonth}日</text>

          <!-- 今日标记 -->
          ${todayDay > 0 ? `<line x1="${padX + (todayDay - 1) * stepX}" y1="${padY}" x2="${padX + (todayDay - 1) * stepX}" y2="${padY + chartH}" stroke="var(--gold)" stroke-width="0.8" stroke-dasharray="3 2"/>
          <text x="${padX + (todayDay - 1) * stepX}" y="${padY - 4}" text-anchor="middle" font-size="7" fill="var(--gold)">今日</text>` : ''}
        </svg>
      </div>
      <div style="font-size:11px;color:var(--ink-mute);text-align:center;margin-top:6px;font-family:var(--font-hand)">
        本月已过 ${todayDay} 天 · 日均支出 ¥${(dailyOut.slice(1, todayDay + 1).reduce((a, b) => a + b, 0) / Math.max(todayDay, 1)).toFixed(2)}
      </div>
    `;
  },

  editAccount(id, groupKey) {
    const isEdit = !!id;
    const body = `
      <div class="form-row">
        <label class="label">账户名称</label>
        <input class="field" id="f_name" placeholder="如：招商银行 / 支付宝" maxlength="20">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">账户分组</label>
          <select class="field" id="f_group">
            ${this.groups.map((g) => `<option value="${g.key}">${g.icon} ${g.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="label">当前余额</label>
          <input class="field" id="f_bal" type="number" step="0.01" placeholder="0.00">
        </div>
      </div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="f_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="f_save">${isEdit ? '保存' : '添加'}</button>
      </div>`;
    UI.showSheet(isEdit ? '编辑账户' : '添加账户', body, (root) => {
      let loaded = false;
      const self = this;

      // 先同步绑定事件
      root.querySelector('#f_save').onclick = async () => {
        if (isEdit && !loaded) {
          UI.toast('数据加载中，请稍候');
          return;
        }
        const name = root.querySelector('#f_name').value.trim();
        if (!name) return UI.toast('请输入账户名称');
        const payload = {
          name,
          group: root.querySelector('#f_group').value,
          balance: parseFloat(root.querySelector('#f_bal').value) || 0
        };
        if (isEdit) {
          const a = await db.get(db.STORES.account, id);
          Object.assign(a, payload);
          await db.put(db.STORES.account, a);
        } else {
          await db.add(db.STORES.account, payload);
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加');
        self.list();
      };
      const cancelBtn = root.querySelector('#f_cancel');
      if (cancelBtn) cancelBtn.onclick = () => UI.hideSheet();

      // 再异步加载编辑数据
      (async () => {
        if (isEdit) {
          try {
            const a = await db.get(db.STORES.account, id);
            if (!a) {
              UI.toast('未找到该账户');
              UI.hideSheet();
              return;
            }
            root.querySelector('#f_name').value = a.name || '';
            root.querySelector('#f_group').value = a.group || groupKey || 'bank';
            root.querySelector('#f_bal').value = a.balance || 0;
            loaded = true;
          } catch (err) {
            console.error('加载账户失败', err);
            UI.toast('加载失败：' + (err && err.message ? err.message : err));
            UI.hideSheet();
          }
        } else if (groupKey) {
          root.querySelector('#f_group').value = groupKey;
          loaded = true;
        } else {
          loaded = true;
        }
      })();
    });
  },

  accMenu(id) {
    const body = `
      <div class="choice-grid">
        <button class="choice" data-act="edit">✏️ 编辑</button>
        <button class="choice" data-act="del" style="color:var(--rust)">🗑 删除</button>
      </div>`;
    UI.showSheet('操作', body, (root) => {
      root.querySelector('[data-act="edit"]').onclick = () => {
        UI.hideSheet();
        this.editAccount(id);
      };
      root.querySelector('[data-act="del"]').onclick = async () => {
        UI.hideSheet();
        if (await UI.confirm('删除这个账户？')) {
          await db.remove(db.STORES.account, id);
          this.list();
        }
      };
    });
  },

  addLog() {
    const body = `
      <div class="form-row">
        <label class="label">收支类型</label>
        <div class="choice-grid">
          <button class="choice active" data-type="out" id="t_out">📤 支出</button>
          <button class="choice" data-type="in" id="t_in">📥 收入</button>
          <button class="choice" data-type="advance" id="t_adv">🏠 家庭垫付</button>
        </div>
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">金额</label>
          <input class="field" id="f_amt" type="number" step="0.01" placeholder="0.00">
        </div>
        <div>
          <label class="label">账户</label>
          <select class="field" id="f_acc"></select>
        </div>
      </div>
      <div class="form-row" id="catRow">
        <label class="label">支出分类</label>
        <div class="cat-grid">
          ${this.categories.map((c) => `<button class="cat-btn" data-cat="${c.key}">${c.icon} ${c.label}</button>`).join('')}
        </div>
      </div>
      <div class="form-row" id="advRow" style="display:none">
        <label class="label">垫付给谁</label>
        <input class="field" id="f_adv_to" placeholder="如：家人姓名" maxlength="20">
      </div>
      <div class="form-row" id="advStatusRow" style="display:none">
        <label class="label">垫付状态</label>
        <div class="choice-grid">
          <button class="choice active" data-adv-status="unpaid" id="as_unpaid">⏳ 待归还</button>
          <button class="choice" data-adv-status="paid" id="as_paid">✅ 已归还</button>
        </div>
      </div>
      <div class="form-row">
        <label class="label">说明</label>
        <input class="field" id="f_desc" placeholder="如：午餐 / 工资" maxlength="20">
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="f_cancel">取消</button>
        <button class="btn btn-primary" id="f_save">记录</button>
      </div>`;
    UI.showSheet('记一笔', body, async (root) => {
      let type = 'out';
      let category = 'food';
      let advStatus = 'unpaid';
      const catRow = root.querySelector('#catRow');
      const advRow = root.querySelector('#advRow');
      const advStatusRow = root.querySelector('#advStatusRow');

      root.querySelector('#t_out').onclick = () => {
        type = 'out';
        root.querySelector('#t_out').classList.add('active');
        root.querySelector('#t_in').classList.remove('active');
        root.querySelector('#t_adv').classList.remove('active');
        catRow.style.display = 'block';
        advRow.style.display = 'none';
        advStatusRow.style.display = 'none';
      };
      root.querySelector('#t_in').onclick = () => {
        type = 'in';
        root.querySelector('#t_in').classList.add('active');
        root.querySelector('#t_out').classList.remove('active');
        root.querySelector('#t_adv').classList.remove('active');
        catRow.style.display = 'none';
        advRow.style.display = 'none';
        advStatusRow.style.display = 'none';
      };
      root.querySelector('#t_adv').onclick = () => {
        type = 'advance';
        root.querySelector('#t_adv').classList.add('active');
        root.querySelector('#t_out').classList.remove('active');
        root.querySelector('#t_in').classList.remove('active');
        catRow.style.display = 'none';
        advRow.style.display = 'block';
        advStatusRow.style.display = 'block';
      };

      root.querySelector('#as_unpaid').onclick = () => {
        advStatus = 'unpaid';
        root.querySelector('#as_unpaid').classList.add('active');
        root.querySelector('#as_paid').classList.remove('active');
      };
      root.querySelector('#as_paid').onclick = () => {
        advStatus = 'paid';
        root.querySelector('#as_paid').classList.add('active');
        root.querySelector('#as_unpaid').classList.remove('active');
      };

      root.querySelectorAll('.cat-btn').forEach((b) => {
        b.onclick = () => {
          category = b.dataset.cat;
          root.querySelectorAll('.cat-btn').forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
        };
      });
      root.querySelector('.cat-btn').classList.add('active');

      const accounts = await db.all(db.STORES.account);
      const sel = root.querySelector('#f_acc');
      if (accounts.length === 0) {
        sel.innerHTML = '<option value="">请先添加账户</option>';
      } else {
        sel.innerHTML = accounts
          .map((a) => `<option value="${a.id}">${this.groups.find((g) => g.key === a.group)?.icon || ''} ${a.name}</option>`)
          .join('');
      }

      root.querySelector('#f_save').onclick = async () => {
        const amount = parseFloat(root.querySelector('#f_amt').value);
        if (!amount || amount <= 0) return UI.toast('请输入有效金额');
        const accId = sel.value;
        if (!accId) return UI.toast('请先添加账户');
        const acc = accounts.find((a) => a.id === accId);
        const desc = root.querySelector('#f_desc').value.trim();

        const logData = {
          type,
          amount,
          accountId: accId,
          accountName: acc.name,
          desc,
          category: type === 'out' ? category : undefined
        };

        if (type === 'advance') {
          logData.advanceTo = root.querySelector('#f_adv_to').value.trim() || '家人';
          logData.advanceStatus = advStatus;
          logData.category = 'home';
        }

        await db.add(db.STORES.accountLog, logData);
        // 更新账户余额：垫付也算支出（钱出去了），归还时单独处理
        if (type === 'in') {
          acc.balance = (acc.balance || 0) + amount;
        } else {
          // out 或 advance 都减少余额
          acc.balance = (acc.balance || 0) - amount;
        }
        await db.put(db.STORES.account, acc);
        UI.hideSheet();
        UI.toast(type === 'advance' ? '已记录家庭垫付' : '已记录');
        this.list();
      };
      root.querySelector('#f_cancel').onclick = () => UI.hideSheet();
    });
  },

  async markAdvancePaid(id) {
    const log = await db.get(db.STORES.accountLog, id);
    if (!log || log.type !== 'advance') return;
    if (await UI.confirm(`确认「${log.desc || '家庭垫付'}」已归还 ¥${log.amount.toFixed(2)}？\n归还金额将退回账户余额。`)) {
      log.advanceStatus = 'paid';
      log.repaidAt = Date.now();
      await db.put(db.STORES.accountLog, log);
      // 归还时把金额加回账户
      const acc = await db.get(db.STORES.account, log.accountId);
      if (acc) {
        acc.balance = (acc.balance || 0) + log.amount;
        await db.put(db.STORES.account, acc);
      }
      UI.toast('已标记为归还，金额已退回账户');
      this.list();
    }
  },

  logMenu(id) {
    const body = `
      <div class="choice-grid">
        <button class="choice" data-act="repay">✅ 标记归还</button>
        <button class="choice" data-act="del" style="color:var(--rust)">🗑 删除</button>
      </div>`;
    UI.showSheet('操作', body, async (root) => {
      const log = await db.get(db.STORES.accountLog, id);
      const isAdvance = log && log.type === 'advance';
      const repayBtn = root.querySelector('[data-act="repay"]');
      if (!isAdvance) {
        repayBtn.style.display = 'none';
      } else {
        repayBtn.textContent = log.advanceStatus === 'paid' ? '↩️ 撤销归还' : '✅ 标记归还';
      }
      if (isAdvance) {
        repayBtn.onclick = async () => {
          UI.hideSheet();
          if (log.advanceStatus === 'paid') {
            // 撤销归还
            log.advanceStatus = 'unpaid';
            delete log.repaidAt;
            await db.put(db.STORES.accountLog, log);
            const acc = await db.get(db.STORES.account, log.accountId);
            if (acc) {
              acc.balance = (acc.balance || 0) - log.amount;
              await db.put(db.STORES.account, acc);
            }
            UI.toast('已撤销归还');
            this.list();
          } else {
            await this.markAdvancePaid(id);
          }
        };
      }
      root.querySelector('[data-act="del"]').onclick = async () => {
        UI.hideSheet();
        if (await UI.confirm('删除这笔记录？账户余额会回退。')) {
          const log = await db.get(db.STORES.accountLog, id);
          const acc = await db.get(db.STORES.account, log.accountId);
          if (acc) {
            // 删除时余额回退：in 减回去，out/advance 加回来；已归还的 advance 不再重复加
            if (log.type === 'in') {
              acc.balance = (acc.balance || 0) - log.amount;
            } else if (log.type === 'advance' && log.advanceStatus === 'paid') {
              // 已归还的 advance 删除时：只需减掉之前退回的金额
              acc.balance = (acc.balance || 0) - log.amount;
            } else {
              acc.balance = (acc.balance || 0) + log.amount;
            }
            await db.put(db.STORES.account, acc);
          }
          await db.remove(db.STORES.accountLog, id);
          this.list();
        }
      };
    });
  }
};

router.register('account', () => Account.list());
