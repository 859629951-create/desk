/* ============================================
   我会下厨模块
   - 菜谱管理（上传菜谱图片/文字）
   - AI 识别原料与做法
   - 买菜清单（标记已有/待买）
   ============================================ */

const Recipe = {
  cuisines: ['家常菜', '川菜', '粤菜', '西餐', '烘焙', '汤品', '其他'],

  async list() {
    App.setActiveNav('recipe');
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="fade-up">
        <div class="stat-row">
          <div class="stat-box"><div class="sb-num" id="r_total">·</div><div class="sb-label">菜谱数</div></div>
          <div class="stat-box"><div class="sb-num" id="r_buy">·</div><div class="sb-label">待买食材</div></div>
          <div class="stat-box"><div class="sb-num" id="r_have">·</div><div class="sb-label">已备齐</div></div>
        </div>
        <div class="tabs" id="rTabs">
          <div class="tab active" data-filter="all">全部菜谱</div>
          <div class="tab" data-filter="buy">🛒 买菜清单</div>
        </div>
        <div id="recipeList"></div>
      </div>
    `;
    App.setFab(() => this.edit());

    let filter = 'all';
    const refresh = async () => {
      const all = await db.all(db.STORES.recipe);
      all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const ings = await db.all(db.STORES.recipeIngredients);

      document.getElementById('r_total').textContent = all.length;
      document.getElementById('r_buy').textContent = ings.filter((i) => !i.have).length;
      document.getElementById('r_have').textContent = ings.filter((i) => i.have).length;

      const el = document.getElementById('recipeList');
      if (filter === 'buy') {
        const buyList = ings.filter((i) => !i.have);
        if (buyList.length === 0) {
          el.innerHTML = `<div class="empty"><div class="emoji">🛒</div><div class="hint">食材都备齐啦，开始下厨吧</div></div>`;
          return;
        }
        // 按菜谱分组
        const grouped = {};
        buyList.forEach((i) => {
          if (!grouped[i.recipeId]) grouped[i.recipeId] = { name: i.recipeName, items: [] };
          grouped[i.recipeId].items.push(i);
        });
        el.innerHTML = Object.values(grouped)
          .map(
            (g) => `
            <div class="list-item">
              <div class="li-row">
                <span style="font-size:20px">🍳</span>
                <div class="li-title">${g.name}</div>
              </div>
              <div class="li-tags" style="margin-top:8px">
                ${g.items.map((i) => `<span class="chip red" data-ing="${i.id}">${i.name} ✕</span>`).join('')}
              </div>
              <div style="font-size:11px;color:var(--ink-mute);margin-top:8px">点击食材标记为已购买</div>
            </div>`
          )
          .join('');
        el.querySelectorAll('[data-ing]').forEach((c) => {
          c.onclick = async () => {
            const ing = await db.get(db.STORES.recipeIngredients, c.dataset.ing);
            ing.have = true;
            await db.put(db.STORES.recipeIngredients, ing);
            refresh();
          };
        });
      } else {
        if (all.length === 0) {
          el.innerHTML = `<div class="empty"><div class="emoji">🍳</div><div class="hint">点击 + 添加你的第一道菜谱</div></div>`;
          return;
        }
        el.innerHTML = all
          .map(
            (r) => `
            <div class="list-item" data-id="${r.id}">
              <div class="li-row">
                ${r.image ? `<img src="${r.image}" style="width:54px;height:54px;border-radius:8px;object-fit:cover;">` : '<span style="font-size:28px">🍽️</span>'}
                <div style="flex:1" data-act="open">
                  <div class="li-title">${r.name}</div>
                  <div class="li-tags">
                    <span class="chip yellow">${r.cuisine}</span>
                    ${r.cooked ? '<span class="chip green">已做过</span>' : ''}
                  </div>
                </div>
                <button class="icon-btn" data-act="menu" style="width:32px;height:32px;font-size:14px">⋯</button>
              </div>
            </div>`
          )
          .join('');
        el.querySelectorAll('.list-item').forEach((item) => {
          const id = item.dataset.id;
          item.querySelector('[data-act="open"]').onclick = () => router.navigate('recipe/detail/' + id);
          item.querySelector('[data-act="menu"]').onclick = (e) => {
            e.stopPropagation();
            this.showMenu(id);
          };
        });
      }
    };

    document.querySelectorAll('#rTabs .tab').forEach((tab) => {
      tab.onclick = () => {
        document.querySelectorAll('#rTabs .tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        filter = tab.dataset.filter;
        refresh();
      };
    });

    refresh();
  },

  showMenu(id) {
    const body = `
      <div class="choice-grid">
        <button class="choice" data-act="edit">✏️ 编辑</button>
        <button class="choice" data-act="buy">🛒 买菜清单</button>
        <button class="choice" data-act="toggle">${''}标记已做</button>
        <button class="choice" data-act="del" style="color:var(--cinnabar)">🗑 删除</button>
      </div>
    `;
    UI.showSheet('操作', body, async (root) => {
      const r = await db.get(db.STORES.recipe, id);
      root.querySelector('[data-act="edit"]').onclick = () => {
        UI.hideSheet();
        this.edit(id);
      };
      root.querySelector('[data-act="buy"]').onclick = () => {
        UI.hideSheet();
        router.navigate('recipe/detail/' + id);
      };
      root.querySelector('[data-act="toggle"]').onclick = async () => {
        UI.hideSheet();
        r.cooked = !r.cooked;
        await db.put(db.STORES.recipe, r);
        this.list();
      };
      root.querySelector('[data-act="del"]').onclick = async () => {
        UI.hideSheet();
        if (await UI.confirm('删除这道菜谱及其原料清单？')) {
          await db.remove(db.STORES.recipe, id);
          const ings = await db.query(db.STORES.recipeIngredients, (i) => i.recipeId === id);
          for (const ing of ings) await db.remove(db.STORES.recipeIngredients, ing.id);
          this.list();
        }
      };
    });
  },

  edit(id) {
    const isEdit = !!id;
    const body = `
      <div class="form-row">
        <label class="label">菜名</label>
        <input class="field" id="f_name" placeholder="如：番茄炒蛋" maxlength="30">
      </div>
      <div class="form-row-2">
        <div>
          <label class="label">菜系</label>
          <select class="field" id="f_cuisine">
            ${this.cuisines.map((c) => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="label">难度</label>
          <select class="field" id="f_diff">
            <option>⭐ 简单</option>
            <option>⭐⭐ 中等</option>
            <option>⭐⭐⭐ 较难</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <label class="label">菜谱图片</label>
        <div class="img-grid" id="imgGrid">
          <div class="upload-trigger" id="imgAdd">📷<span>上传菜谱</span></div>
        </div>
      </div>
      <div class="form-row">
        <label class="label">菜谱文字（粘贴菜谱或输入做法）</label>
        <textarea class="field" id="f_text" placeholder="可粘贴菜谱内容，AI 会自动提取原料与做法" rows="5"></textarea>
      </div>
      <div class="form-row">
        <button class="btn btn-jade" id="f_ai" style="width:100%">🤖 AI 识别原料与做法</button>
      </div>
      <div id="aiResult"></div>
      <div class="form-actions">
        ${isEdit ? '<button class="btn btn-ghost" id="f_cancel">取消</button>' : ''}
        <button class="btn btn-primary" id="f_save">${isEdit ? '保存' : '添加菜谱'}</button>
      </div>
    `;

    UI.showSheet(isEdit ? '编辑菜谱' : '新建菜谱', body, async (root) => {
      let image = '';
      let extractedIngredients = [];
      let extractedSteps = [];

      if (isEdit) {
        const r = await db.get(db.STORES.recipe, id);
        root.querySelector('#f_name').value = r.name || '';
        root.querySelector('#f_cuisine').value = r.cuisine || this.cuisines[0];
        root.querySelector('#f_diff').value = r.difficulty || '⭐ 简单';
        root.querySelector('#f_text').value = r.recipeText || '';
        image = r.image || '';
        extractedIngredients = r.ingredients || [];
        extractedSteps = r.steps || [];
        if (image) renderImg();
        renderExtracted();
      }

      function renderImg() {
        const grid = root.querySelector('#imgGrid');
        grid.innerHTML = `
          <div class="img-cell">
            <img src="${image}" alt="菜谱">
            <button class="del" id="imgDel">✕</button>
          </div>
          <div class="upload-trigger" id="imgAdd">📷<span>更换</span></div>
        `;
        root.querySelector('#imgDel').onclick = () => {
          image = '';
          grid.innerHTML = '<div class="upload-trigger" id="imgAdd">📷<span>上传菜谱</span></div>';
          bindImgAdd();
        };
        bindImgAdd();
      }
      function bindImgAdd() {
        root.querySelector('#imgAdd').onclick = async () => {
          const img = await UI.pickImage();
          if (img) {
            image = img;
            renderImg();
          }
        };
      }
      bindImgAdd();

      function renderExtracted() {
        const el = root.querySelector('#aiResult');
        if (!extractedIngredients.length && !extractedSteps.length) {
          el.innerHTML = '';
          return;
        }
        el.innerHTML = `
          <div class="section-title" style="margin-top:6px">🥬 原料清单</div>
          <div class="li-tags">
            ${extractedIngredients.map((i, idx) => `
              <span class="chip ${i.have ? 'green' : 'red'}" data-idx="${idx}">${i.have ? '✓' : '○'} ${i.name}</span>
            `).join('')}
          </div>
          <div style="font-size:11px;color:var(--ink-mute);margin-top:4px">点击原料标记已有/待买</div>
          ${extractedSteps.length ? `
            <div class="section-title">👨‍🍳 做法步骤</div>
            <ol style="font-size:13px;color:var(--ink-soft);padding-left:18px;line-height:1.8;">
              ${extractedSteps.map((s) => `<li>${s}</li>`).join('')}
            </ol>` : ''}
        `;
        el.querySelectorAll('[data-idx]').forEach((c) => {
          c.onclick = () => {
            const i = extractedIngredients[+c.dataset.idx];
            i.have = !i.have;
            renderExtracted();
          };
        });
      }

      root.querySelector('#f_ai').onclick = async () => {
        const text = root.querySelector('#f_text').value.trim();
        if (!text) {
          UI.toast('请先输入或粘贴菜谱文字');
          return;
        }
        const out = root.querySelector('#aiResult');
        out.innerHTML = `<div class="ai-bubble loading">正在识别原料与做法</div>`;
        // 本地提取 + AI 提示
        const ings = AI.extractIngredients(text);
        const steps = text
          .split(/\d+[.、)]|\n|步骤/)
          .map((s) => s.trim())
          .filter((s) => s.length > 5 && !/^[原料|材料|食材]/.test(s))
          .slice(0, 10);
        const hint = await AI.generate('请帮我整理这道菜谱的原料清单和做法步骤', text);
        // extractIngredients 已返回 {name, have} 对象数组，直接使用即可
        extractedIngredients = ings.map((n) => {
          if (typeof n === 'string') return { name: n, have: false };
          return { name: n.name || String(n), have: n.have || false };
        });
        extractedSteps = steps;
        renderExtracted();
        out.innerHTML += `<div class="ai-bubble" style="margin-top:8px">${hint.replace(/\n/g, '<br>')}</div>`;
        UI.toast('已识别 ' + ings.length + ' 种原料');
      };

      root.querySelector('#f_save').onclick = async () => {
        const name = root.querySelector('#f_name').value.trim();
        if (!name) {
          UI.toast('请输入菜名');
          return;
        }
        const payload = {
          name,
          cuisine: root.querySelector('#f_cuisine').value,
          difficulty: root.querySelector('#f_diff').value,
          image,
          recipeText: root.querySelector('#f_text').value.trim(),
          ingredients: extractedIngredients,
          steps: extractedSteps
        };
        if (isEdit) {
          const r = await db.get(db.STORES.recipe, id);
          Object.assign(r, payload);
          await db.put(db.STORES.recipe, r);
          // 同步原料到买菜清单
          await this.syncIngredients(id, name, extractedIngredients);
        } else {
          const r = await db.add(db.STORES.recipe, { ...payload, cooked: false });
          await this.syncIngredients(r.id, name, extractedIngredients);
        }
        UI.hideSheet();
        UI.toast(isEdit ? '已保存' : '已添加菜谱');
        this.list();
      };

      if (isEdit) {
        root.querySelector('#f_cancel').onclick = () => UI.hideSheet();
      }
    });
  },

  async syncIngredients(recipeId, recipeName, ingredients) {
    // 删除旧的
    const old = await db.query(db.STORES.recipeIngredients, (i) => i.recipeId === recipeId);
    for (const o of old) await db.remove(db.STORES.recipeIngredients, o.id);
    // 添加新的
    for (const ing of ingredients) {
      await db.add(db.STORES.recipeIngredients, {
        recipeId,
        recipeName,
        name: ing.name,
        have: ing.have
      });
    }
  },

  async detail(id) {
    App.setActiveNav('recipe');
    const r = await db.get(db.STORES.recipe, id);
    if (!r) return router.navigate('recipe');
    const main = document.getElementById('appMain');
    App.setFab(null);

    main.innerHTML = `
      <div class="fade-up">
        <button class="detail-back" data-act="back">‹ 返回</button>
        <div class="card" style="margin-bottom:14px;overflow:hidden;">
          ${r.image ? `<img src="${r.image}" style="width:100%;aspect-ratio:16/9;object-fit:cover;">` : ''}
          <div style="padding:14px;">
            <div class="tape yellow" style="top:-8px;left:20px;"></div>
            <h2 style="font-family:var(--font-display);font-size:22px;color:var(--ink)">${r.name}</h2>
            <div class="li-tags" style="margin-top:8px">
              <span class="chip yellow">${r.cuisine}</span>
              <span class="chip">${r.difficulty || ''}</span>
              ${r.cooked ? '<span class="chip green">已做过</span>' : ''}
            </div>
          </div>
        </div>

        ${r.ingredients?.length ? `
          <div class="section-title">🥬 原料清单</div>
          <div class="card" style="padding:14px;">
            <div id="ingList"></div>
            <div style="display:flex;gap:8px;margin-top:12px;">
              <button class="btn btn-ghost" id="markAllBuy" style="flex:1;font-size:12px">全部待买</button>
              <button class="btn btn-jade" id="markAllHave" style="flex:1;font-size:12px">全部已备</button>
            </div>
          </div>` : ''}

        ${r.steps?.length ? `
          <div class="section-title">👨‍🍳 做法步骤</div>
          <div class="card" style="padding:14px;">
            <ol style="font-size:13px;color:var(--ink-soft);padding-left:18px;line-height:1.9;">
              ${r.steps.map((s) => `<li style="margin-bottom:6px;">${s}</li>`).join('')}
            </ol>
          </div>` : ''}

        ${r.recipeText ? `
          <div class="section-title">📝 原始菜谱</div>
          <div class="card" style="padding:14px;font-size:13px;color:var(--ink-soft);line-height:1.7;white-space:pre-wrap;">${r.recipeText}</div>` : ''}

        <div style="height:20px"></div>
        <button class="btn btn-primary" id="editBtn" style="width:100%">✏️ 编辑这道菜谱</button>
      </div>
    `;

    main.querySelector('[data-act="back"]').onclick = () => router.navigate('recipe');
    main.querySelector('#editBtn').onclick = () => this.edit(id);

    if (r.ingredients?.length) {
      const renderIngs = async () => {
        const ings = await db.query(db.STORES.recipeIngredients, (i) => i.recipeId === id);
        const el = document.getElementById('ingList');
        el.innerHTML = ings
          .map(
            (i) => `
          <div class="acc-item" data-ing="${i.id}">
            <button class="check ${i.have ? 'done' : ''}" style="width:22px;height:22px;border-width:1.5px;">✓</button>
            <span class="ai-name">${i.name}</span>
            <span class="chip ${i.have ? 'green' : 'red'}">${i.have ? '已备' : '待买'}</span>
          </div>`
          )
          .join('');
        el.querySelectorAll('[data-ing]').forEach((row) => {
          row.onclick = async () => {
            const ing = await db.get(db.STORES.recipeIngredients, row.dataset.ing);
            ing.have = !ing.have;
            await db.put(db.STORES.recipeIngredients, ing);
            renderIngs();
          };
        });
      };
      renderIngs();

      main.querySelector('#markAllBuy').onclick = async () => {
        const ings = await db.query(db.STORES.recipeIngredients, (i) => i.recipeId === id);
        for (const i of ings) {
          i.have = false;
          await db.put(db.STORES.recipeIngredients, i);
        }
        renderIngs();
        UI.toast('已标记为全部待买');
      };
      main.querySelector('#markAllHave').onclick = async () => {
        const ings = await db.query(db.STORES.recipeIngredients, (i) => i.recipeId === id);
        for (const i of ings) {
          i.have = true;
          await db.put(db.STORES.recipeIngredients, i);
        }
        renderIngs();
        UI.toast('已标记为全部已备');
      };
    }
  }
};

router.register('recipe', () => Recipe.list());
router.register('recipe/*', (param) => {
  const [action, id] = param.split('/');
  if (action === 'detail' && id) Recipe.detail(id);
  else Recipe.list();
});
