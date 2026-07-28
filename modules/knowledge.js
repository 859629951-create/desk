/* ============================================
   知识库模块 - 小红书等分享内容收集
   ============================================ */

const Knowledge = {
  categories: ['全部', '美食', '旅行', '学习', '生活', '穿搭', '美妆', '健身', '读书', '育儿', '职场', '科技', '法律', '其他'],
  currentCategory: '全部',

  render() {
    const main = document.getElementById('appMain');
    App.setFab(null);
    main.innerHTML = `<div id="kbContainer" class="fade-up"></div>`;
    this._loadAndRender();
  },

  async _loadAndRender() {
    const el = document.getElementById('kbContainer');
    if (!el) return;

    const allItems = await db.all(db.STORES.knowledge);
    allItems.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const unread = allItems.filter(i => !i.read).length;
    const catCounts = {};
    allItems.forEach(i => {
      const c = i.category || '其他';
      catCounts[c] = (catCounts[c] || 0) + 1;
    });

    const filtered = this.currentCategory === '全部'
      ? allItems
      : allItems.filter(i => (i.category || '其他') === this.currentCategory);

    el.innerHTML = `
      <div class="card" style="padding:16px;margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <h2 style="font-family:var(--font-display);font-size:20px;">📖 知识库</h2>
          <span class="chip gray">${allItems.length} 条</span>
        </div>
        <div style="font-size:12px;color:var(--ink-mute);margin-bottom:12px;">
          ${unread > 0 ? `📬 ${unread} 条未读 · ` : ''}从小红书等 App 分享即可自动收集
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${this.categories.map(cat => {
            const count = cat === '全部' ? allItems.length : (catCounts[cat] || 0);
            const active = this.currentCategory === cat;
            return `<button class="kb-cat-chip ${active ? 'active' : ''}" data-cat="${cat}">${cat}${count > 0 ? ` ${count}` : ''}</button>`;
          }).join('')}
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <button class="btn btn-jade" id="kbManualAdd" style="flex:1;font-size:12px;">🔗 粘贴链接导入</button>
        <button class="btn btn-ghost" id="kbExport" style="flex:1;font-size:12px;">📄 导出</button>
      </div>

      <div id="kbList"></div>
      <div style="height:20px;"></div>
    `;

    // 分类切换
    el.querySelectorAll('.kb-cat-chip').forEach(btn => {
      btn.onclick = () => {
        this.currentCategory = btn.dataset.cat;
        this._loadAndRender();
      };
    });

    // 手动添加
    document.getElementById('kbManualAdd').onclick = () => this._manualAdd();
    document.getElementById('kbExport').onclick = () => this._export(allItems);

    // 渲染列表
    this._renderList(filtered);
  },

  _renderList(items) {
    const el = document.getElementById('kbList');
    if (!el) return;
    if (items.length === 0) {
      el.innerHTML = `
        <div class="empty">
          <div class="emoji">📭</div>
          <div class="hint">还没有内容</div>
          <div class="hint" style="font-size:11px;margin-top:6px;">在小红书点击「分享」→ 选择「今日有雨」即可导入</div>
        </div>`;
      return;
    }

    el.innerHTML = items.map(item => `
      <div class="kb-item ${item.read ? '' : 'unread'}" data-id="${item.id}">
        <div class="kb-item-header">
          <span class="kb-item-cat">${this._catIcon(item.category)} ${item.category || '其他'}</span>
          <span class="kb-item-source">${item.source || ''}</span>
        </div>
        <div class="kb-item-title">${item.title || '未命名'}</div>
        ${item.summary ? `<div class="kb-item-summary">${item.summary}</div>` : ''}
        ${item.tags && item.tags.length > 0 ? `<div class="kb-item-tags">${item.tags.map(t => `<span class="chip gray" style="font-size:10px;">#${t}</span>`).join('')}</div>` : ''}
        <div class="kb-item-footer">
          <span class="kb-item-date">${UI.relativeDate(item.createdAt)}</span>
          ${item.url ? `<span class="kb-item-open">查看原文 →</span>` : ''}
        </div>
      </div>
    `).join('');

    el.querySelectorAll('.kb-item').forEach(el => {
      el.onclick = () => {
        const id = el.dataset.id;
        const item = items.find(i => i.id === id);
        if (item) this._showDetail(item);
      };
    });
  },

  _catIcon(cat) {
    const icons = {
      '美食': '🍜', '旅行': '✈️', '学习': '📚', '生活': '🌿',
      '穿搭': '👗', '美妆': '💄', '健身': '💪', '读书': '📖',
      '育儿': '👶', '职场': '💼', '科技': '💻', '法律': '⚖️', '其他': '📌'
    };
    return icons[cat] || '📌';
  },

  _showDetail(item) {
    // 标记已读
    if (!item.read) {
      item.read = true;
      db.put(db.STORES.knowledge, item);
    }

    const body = `
      <div style="margin-bottom:12px;">
        <span class="chip gray">${this._catIcon(item.category)} ${item.category || '其他'}</span>
        ${item.source ? `<span class="chip blue" style="margin-left:4px;">${item.source}</span>` : ''}
        ${item.read ? '' : '<span class="chip yellow" style="margin-left:4px;">未读</span>'}
      </div>
      <h3 style="font-size:17px;font-weight:600;margin-bottom:10px;line-height:1.4;">${item.title || '未命名'}</h3>
      ${item.summary ? `<div style="font-size:14px;color:var(--ink-soft);line-height:1.7;margin-bottom:12px;">${item.summary}</div>` : ''}
      ${item.tags && item.tags.length > 0 ? `
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
          ${item.tags.map(t => `<span class="chip gray" style="font-size:11px;">#${t}</span>`).join('')}
        </div>
      ` : ''}
      <div style="font-size:11px;color:var(--ink-mute);margin-bottom:16px;">
        收集于 ${UI.formatDate(item.createdAt, true)}
      </div>
      ${item.url ? `
        <div class="form-actions" style="margin-top:16px;">
          <button class="btn btn-primary" id="kbOpenUrl" style="flex:1;">🔗 打开原文</button>
        </div>
      ` : ''}
      <div class="form-actions" style="margin-top:8px;">
        <button class="btn btn-ghost" id="kbEdit" style="flex:1;">✏️ 编辑</button>
        <button class="btn btn-ghost" id="kbDelete" style="flex:1;color:#c44;">🗑 删除</button>
      </div>
    `;

    UI.showSheet('知识详情', body, (root) => {
      if (item.url) {
        root.querySelector('#kbOpenUrl').onclick = () => {
          window.open(item.url, '_blank');
        };
      }
      root.querySelector('#kbEdit').onclick = () => {
        UI.hideSheet();
        this._edit(item);
      };
      root.querySelector('#kbDelete').onclick = async () => {
        if (await UI.confirm('确定删除这条知识？')) {
          await db.remove(db.STORES.knowledge, item.id);
          UI.hideSheet();
          UI.toast('已删除');
          this._loadAndRender();
        }
      };
    });
  },

  _edit(item) {
    const body = `
      <div class="form-group">
        <label>标题</label>
        <input id="kbEditTitle" value="${item.title || ''}" />
      </div>
      <div class="form-group">
        <label>分类</label>
        <select id="kbEditCat">
          ${this.categories.filter(c => c !== '全部').map(c =>
            `<option value="${c}" ${item.category === c ? 'selected' : ''}>${c}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>摘要</label>
        <textarea id="kbEditSummary" rows="4">${item.summary || ''}</textarea>
      </div>
      <div class="form-group">
        <label>标签（逗号分隔）</label>
        <input id="kbEditTags" value="${(item.tags || []).join(', ')}" />
      </div>
      <div class="form-group">
        <label>原文链接</label>
        <input id="kbEditUrl" value="${item.url || ''}" />
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="kbEditCancel">取消</button>
        <button class="btn btn-primary" id="kbEditSave">保存</button>
      </div>
    `;

    UI.showSheet('编辑知识', body, (root) => {
      root.querySelector('#kbEditCancel').onclick = () => UI.hideSheet();
      root.querySelector('#kbEditSave').onclick = async () => {
        item.title = root.querySelector('#kbEditTitle').value.trim();
        item.category = root.querySelector('#kbEditCat').value;
        item.summary = root.querySelector('#kbEditSummary').value.trim();
        item.tags = root.querySelector('#kbEditTags').value.split(',').map(t => t.trim()).filter(Boolean);
        item.url = root.querySelector('#kbEditUrl').value.trim();
        await db.put(db.STORES.knowledge, item);
        UI.hideSheet();
        UI.toast('已保存');
        this._loadAndRender();
      };
    });
  },

  async _manualAdd() {
    const body = `
      <div class="form-group">
        <label>粘贴链接或内容</label>
        <textarea id="kbManualInput" rows="5" placeholder="粘贴小红书/微博/知乎等链接，或直接粘贴文字内容"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="kbManualCancel">取消</button>
        <button class="btn btn-primary" id="kbManualOk">智能导入</button>
      </div>
    `;

    UI.showSheet('粘贴链接导入', body, (root) => {
      root.querySelector('#kbManualCancel').onclick = () => UI.hideSheet();
      root.querySelector('#kbManualOk').onclick = async () => {
        const input = root.querySelector('#kbManualInput').value.trim();
        if (!input) { UI.toast('请输入内容'); return; }
        UI.hideSheet();
        await this._processManualInput(input);
      };
    });
  },

  async _processManualInput(input) {
    UI.toast('正在智能提取...');

    // 尝试判断是否包含 URL
    const urlMatch = input.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : '';

    try {
      const prompt = `以下内容来自用户手动输入（可能是链接或文本）。请提取关键信息并智能分类。

内容：
${input}

请返回 JSON 格式（只返回 JSON）：
{
  "title": "简洁标题（不超过30字）",
  "summary": "核心内容摘要（50-100字）",
  "category": "从以下选一：美食、旅行、学习、生活、穿搭、美妆、健身、读书、育儿、职场、科技、法律、其他",
  "tags": ["标签1", "标签2"],
  "source": "来源平台"
}`;

      const resp = await AI._callOnline(prompt, '');
      const cleaned = AI._stripCodeFence(resp);
      const match = cleaned.match(/\{[\s\S]*\}/);
      let info = {};
      if (match) {
        try { info = JSON.parse(match[0]); } catch(e) {}
      }

      info.title = info.title || input.substring(0, 30);
      info.summary = info.summary || input;
      info.category = info.category || '其他';
      info.tags = info.tags || [];
      info.source = info.source || (url ? this._detectSource(url) : '手动');

      await db.add(db.STORES.knowledge, {
        title: info.title,
        summary: info.summary,
        category: info.category,
        tags: info.tags,
        source: info.source,
        url: url,
        rawContent: input,
        read: false
      });

      UI.toast(`已导入：${info.title}`);
      this._loadAndRender();
    } catch (e) {
      // AI 失败也要保存
      await db.add(db.STORES.knowledge, {
        title: input.substring(0, 30),
        summary: input,
        category: '其他',
        tags: [],
        source: url ? this._detectSource(url) : '手动',
        url: url,
        rawContent: input,
        read: false
      });
      UI.toast('已导入（未分类）');
      this._loadAndRender();
    }
  },

  _detectSource(url) {
    if (!url) return '未知';
    if (url.includes('xiaohongshu') || url.includes('xhslink')) return '小红书';
    if (url.includes('weibo')) return '微博';
    if (url.includes('mp.weixin')) return '微信公众号';
    if (url.includes('zhihu')) return '知乎';
    if (url.includes('bilibili') || url.includes('b23.tv')) return '哔哩哔哩';
    return '网页';
  },

  _export(items) {
    if (items.length === 0) { UI.toast('知识库是空的'); return; }
    UI.toast('正在生成...');

    const grouped = {};
    items.forEach(i => {
      const cat = i.category || '其他';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(i);
    });

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>知识库</title>
      <style>
        body{font-family:'Noto Serif SC',serif;padding:40px;color:#2b2622;background:#faf5ec;}
        h1{font-family:'DM Serif Display',serif;text-align:center;font-size:28px;margin-bottom:4px;}
        .sub{text-align:center;color:#8a7e6f;font-size:12px;margin-bottom:30px;}
        h2{font-size:16px;border-bottom:2px solid #2f4a28;padding-bottom:4px;margin-top:24px;color:#2f4a28;}
        .item{padding:12px 0;border-bottom:1px solid #e8dfd0;}
        .title{font-weight:600;font-size:14px;margin-bottom:4px;}
        .summary{font-size:12px;color:#5a5048;line-height:1.5;}
        .meta{font-size:11px;color:#8a7e6f;margin-top:4px;}
        a{color:#2f4a28;text-decoration:none;}
        a:hover{text-decoration:underline;}
      </style></head><body>
      <h1>📖 知识库</h1>
      <div class="sub">共 ${items.length} 条 · ${UI.todayStr()}</div>`;

    for (const cat in grouped) {
      html += `<h2>${cat} (${grouped[cat].length})</h2>`;
      grouped[cat].forEach(i => {
        html += `<div class="item">
          <div class="title">${i.title || '未命名'}</div>
          ${i.summary ? `<div class="summary">${i.summary}</div>` : ''}
          <div class="meta">${i.source || ''} · ${UI.formatDate(i.createdAt)}${i.url ? ` · <a href="${i.url}" target="_blank">查看原文</a>` : ''}</div>
        </div>`;
      });
    }
    html += `</body></html>`;

    const w = window.open('', '_blank');
    if (!w) { UI.toast('请允许弹出窗口'); return; }
    w.document.write(html);
    w.document.close();
  }
};

window.Knowledge = Knowledge;

router.register('knowledge', () => Knowledge.render());
