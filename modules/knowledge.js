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
        ${item.keyPoints ? `<div class="kb-item-keypoints">${item.keyPoints.split('\n').slice(0, 2).join('\n')}${item.keyPoints.split('\n').length > 2 ? '...' : ''}</div>` : ''}
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
      ${item.summary ? `<div style="font-size:13px;color:var(--ink-mute);line-height:1.6;margin-bottom:14px;padding:8px 12px;background:var(--paper-deep);border-radius:8px;">📋 ${item.summary}</div>` : ''}
      ${item.keyPoints ? `
        <div style="margin-bottom:14px;">
          <div style="font-size:12px;font-weight:600;color:var(--forest);margin-bottom:6px;">✨ 核心价值点</div>
          <div style="font-size:13px;color:var(--ink);line-height:1.8;white-space:pre-wrap;padding:10px 12px;background:rgba(47,74,40,0.05);border-radius:8px;border-left:3px solid var(--forest);">${item.keyPoints}</div>
        </div>
      ` : ''}
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
        <textarea id="kbEditSummary" rows="3">${item.summary || ''}</textarea>
      </div>
      <div class="form-group">
        <label>核心价值点</label>
        <textarea id="kbEditKeyPoints" rows="5" placeholder="每行一个要点，用「• 」开头">${item.keyPoints || ''}</textarea>
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
        item.keyPoints = root.querySelector('#kbEditKeyPoints').value.trim();
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
    UI.toast('正在识别内容...');

    try {
      // 调用 KbSkill 进行内容识别
      UI.toast('正在采集信息...');
      const result = await KbSkill.analyze(input);

      await db.add(db.STORES.knowledge, {
        title: result.title,
        summary: result.summary,
        keyPoints: result.keyPoints,
        category: result.category,
        tags: result.tags,
        source: result.source,
        url: input.match(/https?:\/\/[^\s]+/)?.[0] || '',
        rawContent: input,
        read: false
      });

      UI.toast(`已导入：${result.title}`);
      this._loadAndRender();
    } catch (e) {
      console.warn('KbSkill 分析失败:', e.message);

      // 降级：保存原始内容
      const url = input.match(/https?:\/\/[^\s]+/)?.[0] || '';
      const source = this._detectSource(url);
      const fallbackTitle = input.substring(0, 30);

      await db.add(db.STORES.knowledge, {
        title: fallbackTitle,
        summary: input,
        keyPoints: '',
        category: '其他',
        tags: [],
        source: source,
        url: url,
        rawContent: input,
        read: false
      });

      // 根据错误类型给出精准提示
      const msg = e.message;
      if (msg === 'API_KEY_NOT_CONFIGURED' || msg === 'API_KEY_INVALID') {
        UI.toast('AI Key 无效，请到「设置」配置有效的 API Key');
      } else if (msg === 'API_RATE_LIMIT') {
        UI.toast('AI 请求过于频繁，已导入原始内容');
      } else if (msg === 'NETWORK_ERROR') {
        UI.toast('网络连接失败，已导入原始内容');
      } else {
        UI.toast('AI 分析失败，已导入原始内容（可在详情中编辑）');
      }
      this._loadAndRender();
    }
  },

  _detectSource(url) {
    if (!url) return '未知';
    if (url.includes('xiaohongshu') || url.includes('xhslink')) return '小红书';
    if (url.includes('douyin') || url.includes('iesdouyin')) return '抖音';
    if (url.includes('weibo')) return '微博';
    if (url.includes('mp.weixin')) return '微信公众号';
    if (url.includes('zhihu')) return '知乎';
    if (url.includes('bilibili') || url.includes('b23.tv')) return '哔哩哔哩';
    if (url.includes('kuaishou')) return '快手';
    if (url.includes('taobao') || url.includes('tmall')) return '淘宝';
    if (url.includes('jd.com')) return '京东';
    return '网页';
  },

  /* 从分享文本中提取抖音信息 */
  _parseDouyinShare(text) {
    // 抖音分享格式: "8.41 复制打开抖音，看看【哈是琪的图文作品】从前任们传承下来的北京咖啡 https://v.douyin.com/xxx/"
    const authorMatch = text.match(/【(.+?)的(.+?)】/);
    const titleMatch = text.match(/】(.+?)(?:\s+https?|$)/);
    return {
      author: authorMatch ? authorMatch[1] : '',
      type: authorMatch ? authorMatch[2] : '',  // 图文作品/视频等
      title: titleMatch ? titleMatch[1].trim() : ''
    };
  },

  /* 尝试通过 CORS 代理抓取 URL 内容 */
  async _fetchUrlContent(url) {
    const proxies = [
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
      (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`
    ];

    for (const proxy of proxies) {
      try {
        const proxyUrl = proxy(url);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (!resp.ok) continue;
        const html = await resp.text();
        if (!html || html.length < 100) continue;

        // 从 HTML 中提取有用文本
        return this._extractTextFromHtml(html, url);
      } catch (e) {
        console.warn('代理抓取失败:', e.message);
        continue;
      }
    }
    return null;
  },

  /* 从 HTML 中提取标题、描述、正文 */
  _extractTextFromHtml(html, url) {
    let title = '';
    let description = '';
    let bodyText = '';

    // 提取 <title>
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) title = titleMatch[1].trim();

    // 提取 meta description
    const descMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([\s\S]*?)["']/i);
    if (descMatch) description = descMatch[1].trim();

    // 提取 og:title
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([\s\S]*?)["']/i);
    if (ogTitleMatch) title = ogTitleMatch[1].trim();

    // 提取正文：去掉 script/style/tag
    bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // 截取前 3000 字符
    if (bodyText.length > 3000) bodyText = bodyText.substring(0, 3000);

    return { title, description, bodyText, url };
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
