/* ============================================
   证件管理模块 - 上传/查看/加水印保存
   ============================================ */

const IdDocs = {
  categories: [
    { key: 'all', label: '全部', icon: '📋' },
    { key: 'idcard', label: '身份证', icon: '🪪' },
    { key: 'passport', label: '护照', icon: '🛂' },
    { key: 'driver', label: '驾驶证', icon: '🚗' },
    { key: 'hukou', label: '户口本', icon: '📕' },
    { key: 'degree', label: '学位证', icon: '🎓' },
    { key: 'other', label: '其他', icon: '📄' }
  ],

  currentCategory: 'all',

  /* 预设水印模板 */
  watermarkPresets: [
    '仅供证件办理使用',
    '仅供XX银行开户使用',
    '仅供租房备案使用',
    '仅供入职资料使用',
    '复印件与原件一致',
    '仅限本人使用'
  ],

  /* 水印默认设置 */
  defaultWatermark: {
    text: '仅供证件办理使用',
    fontSize: 28,
    opacity: 0.18,
    color: '#333333',
    position: 'tile',    // tile | center | topLeft | topRight | bottomLeft | bottomRight
    rotate: -25
  },

  render() {
    const main = document.getElementById('appMain');
    App.setFab(() => this._upload());
    main.innerHTML = `<div id="idDocsContainer" class="fade-up"></div>`;
    this._loadAndRender();
  },

  async _loadAndRender() {
    const el = document.getElementById('idDocsContainer');
    if (!el) return;

    const allItems = await db.all(db.STORES.idDocs);
    allItems.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const catCounts = {};
    allItems.forEach(i => {
      const c = i.category || 'other';
      catCounts[c] = (catCounts[c] || 0) + 1;
    });

    const filtered = this.currentCategory === 'all'
      ? allItems
      : allItems.filter(i => (i.category || 'other') === this.currentCategory);

    el.innerHTML = `
      <div class="card" style="padding:16px;margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <h2 style="font-family:var(--font-display);font-size:20px;">🪪 证件管理</h2>
          <span class="chip gray">${allItems.length} 张</span>
        </div>
        <div style="font-size:12px;color:var(--ink-mute);margin-bottom:12px;">
          上传证件照片，一键保存到相册，支持加水印防滥用
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${this.categories.map(cat => {
            const count = cat.key === 'all' ? allItems.length : (catCounts[cat.key] || 0);
            const active = this.currentCategory === cat.key;
            return `<button class="kb-cat-chip ${active ? 'active' : ''}" data-cat="${cat.key}">${cat.icon} ${cat.label}${count > 0 ? ` ${count}` : ''}</button>`;
          }).join('')}
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <button class="btn btn-jade" id="iddUploadBtn" style="flex:1;font-size:12px;">📷 上传证件</button>
        <button class="btn btn-ghost" id="iddWatermarkSettings" style="font-size:12px;">⚙️ 水印设置</button>
      </div>

      <div id="idDocsGrid" class="id-docs-grid"></div>
      <div style="height:20px;"></div>
    `;

    // 分类切换
    el.querySelectorAll('.kb-cat-chip').forEach(btn => {
      btn.onclick = () => {
        this.currentCategory = btn.dataset.cat;
        this._loadAndRender();
      };
    });

    document.getElementById('iddUploadBtn').onclick = () => this._upload();
    document.getElementById('iddWatermarkSettings').onclick = () => this._watermarkSettings();

    this._renderGrid(filtered);
  },

  _renderGrid(items) {
    const el = document.getElementById('idDocsGrid');
    if (!el) return;

    if (items.length === 0) {
      const catLabel = this.categories.find(c => c.key === this.currentCategory)?.label || '全部';
      el.innerHTML = `
        <div class="empty" style="grid-column:1/-1;">
          <div class="emoji">🪪</div>
          <div class="hint">还没有${catLabel === '全部' ? '' : catLabel}证件</div>
          <div class="hint" style="font-size:11px;margin-top:6px;">点击「上传证件」或右下角 + 按钮添加</div>
        </div>`;
      return;
    }

    el.innerHTML = items.map(item => {
      const catInfo = this.categories.find(c => c.key === (item.category || 'other'));
      const catLabel = catInfo?.label || '其他';
      const catIcon = catInfo?.icon || '📄';
      return `
        <div class="id-doc-card" data-id="${item.id}">
          <div class="idd-thumb" style="background-image:url(${item.thumbnail || item.imageData})"></div>
          <div class="idd-info">
            <div class="idd-title">${item.title || '未命名'}</div>
            <div class="idd-meta">
              <span>${catIcon} ${catLabel}</span>
              <span>${UI.relativeDate(item.createdAt)}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    el.querySelectorAll('.id-doc-card').forEach(card => {
      card.onclick = () => {
        const id = card.dataset.id;
        const item = items.find(i => i.id === id);
        if (item) this._showDetail(item);
      };
    });
  },

  _showDetail(item) {
    const catInfo = this.categories.find(c => c.key === (item.category || 'other'));
    const body = `
      <div style="margin-bottom:12px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span class="chip gray">${catInfo?.icon || '📄'} ${catInfo?.label || '其他'}</span>
        ${item.notes ? `<span class="chip blue" style="font-size:11px;">📝 ${item.notes}</span>` : ''}
      </div>
      <div style="border-radius:12px;overflow:hidden;margin-bottom:14px;background:var(--ink-line);">
        <img src="${item.imageData}" style="width:100%;display:block;" alt="${item.title}" />
      </div>
      <div style="font-size:11px;color:var(--ink-mute);margin-bottom:16px;text-align:center;">
        上传于 ${UI.formatDate(item.createdAt, true)}
      </div>
      <div class="form-actions" style="margin-bottom:8px;">
        <button class="btn btn-primary" id="iddSaveAlbum" style="flex:1;">💾 保存到相册</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:8px 12px;background:var(--paper-deep);border-radius:8px;font-size:12px;">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap;">
          <input type="checkbox" id="iddWatermarkToggle" style="width:16px;height:16px;" />
          <span>添加水印</span>
        </label>
        <div style="flex:1;display:flex;align-items:center;gap:6px;" id="iddWatermarkOpts">
          <select id="iddWmPreset" style="font-size:11px;flex:1;padding:4px;border-radius:6px;border:1px solid var(--ink-line);">
            ${this.watermarkPresets.map(t => `<option value="${t}" ${this.defaultWatermark.text === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          <input id="iddWmCustom" type="text" placeholder="自定义" value="${this.defaultWatermark.text}" style="font-size:11px;flex:1;padding:4px;border-radius:6px;border:1px solid var(--ink-line);" />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="iddEdit" style="flex:1;">✏️ 编辑</button>
        <button class="btn btn-ghost" id="iddDelete" style="flex:1;color:#c44;">🗑 删除</button>
      </div>
    `;

    UI.showSheet(item.title || '证件详情', body, (root) => {
      // 水印选项联动
      const toggle = root.querySelector('#iddWatermarkToggle');
      const opts = root.querySelector('#iddWatermarkOpts');
      const preset = root.querySelector('#iddWmPreset');
      const custom = root.querySelector('#iddWmCustom');

      toggle.onchange = () => {
        opts.style.opacity = toggle.checked ? '1' : '0.4';
        opts.style.pointerEvents = toggle.checked ? 'auto' : 'none';
      };
      // 初始状态
      opts.style.opacity = '0.4';
      opts.style.pointerEvents = 'none';

      preset.onchange = () => {
        custom.value = preset.value;
      };
      custom.oninput = () => {
        // 如果自定义文字匹配某个预设，同步选中
        const match = this.watermarkPresets.find(p => p === custom.value);
        if (match) preset.value = match;
      };

      root.querySelector('#iddSaveAlbum').onclick = async () => {
        const useWatermark = toggle.checked;
        const wmText = custom.value.trim() || this.defaultWatermark.text;
        UI.toast(useWatermark ? '正在生成带水印的图片...' : '正在保存...');
        await this._saveToAlbum(item.imageData, useWatermark ? wmText : null);
      };

      root.querySelector('#iddEdit').onclick = () => {
        UI.hideSheet();
        this._edit(item);
      };

      root.querySelector('#iddDelete').onclick = async () => {
        if (await UI.confirm('确定删除这张证件照片？')) {
          await db.remove(db.STORES.idDocs, item.id);
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
        <label>证件名称</label>
        <input id="iddEditTitle" value="${item.title || ''}" placeholder="如：身份证正面" />
      </div>
      <div class="form-group">
        <label>证件类型</label>
        <select id="iddEditCat">
          ${this.categories.filter(c => c.key !== 'all').map(c =>
            `<option value="${c.key}" ${(item.category || 'other') === c.key ? 'selected' : ''}>${c.icon} ${c.label}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>备注</label>
        <input id="iddEditNotes" value="${item.notes || ''}" placeholder="如：有效期至2028年" />
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="iddEditCancel">取消</button>
        <button class="btn btn-primary" id="iddEditSave">保存</button>
      </div>
    `;

    UI.showSheet('编辑证件', body, (root) => {
      root.querySelector('#iddEditCancel').onclick = () => {
        UI.hideSheet();
        this._showDetail(item);
      };
      root.querySelector('#iddEditSave').onclick = async () => {
        item.title = root.querySelector('#iddEditTitle').value.trim() || '未命名';
        item.category = root.querySelector('#iddEditCat').value;
        item.notes = root.querySelector('#iddEditNotes').value.trim();
        await db.put(db.STORES.idDocs, item);
        UI.hideSheet();
        UI.toast('已保存');
        this._loadAndRender();
      };
    });
  },

  /* 上传证件 */
  async _upload() {
    const body = `
      <div class="form-group">
        <label>证件类型</label>
        <select id="iddUpCat">
          ${this.categories.filter(c => c.key !== 'all').map(c =>
            `<option value="${c.key}">${c.icon} ${c.label}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>证件名称</label>
        <input id="iddUpTitle" placeholder="如：身份证正面、护照信息页" />
      </div>
      <div class="form-group">
        <label>备注（选填）</label>
        <input id="iddUpNotes" placeholder="如：有效期、签发机关" />
      </div>
      <div style="text-align:center;margin:12px 0;">
        <button class="btn btn-jade" id="iddPickImage" style="width:100%;padding:16px;font-size:14px;">
          📷 选择照片
        </button>
        <div id="iddPreview" style="margin-top:10px;display:none;">
          <img id="iddPreviewImg" style="max-width:100%;max-height:200px;border-radius:10px;" />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="iddUpCancel">取消</button>
        <button class="btn btn-primary" id="iddUpSave" disabled>保存证件</button>
      </div>
    `;

    let selectedImage = null;

    UI.showSheet('上传证件', body, (root) => {
      root.querySelector('#iddUpCancel').onclick = () => UI.hideSheet();

      root.querySelector('#iddPickImage').onclick = async () => {
        const dataUrl = await UI.pickImage();
        if (!dataUrl) return;
        selectedImage = dataUrl;
        const preview = root.querySelector('#iddPreview');
        const img = root.querySelector('#iddPreviewImg');
        img.src = dataUrl;
        preview.style.display = 'block';
        root.querySelector('#iddUpSave').disabled = false;
      };

      root.querySelector('#iddUpSave').onclick = async () => {
        if (!selectedImage) {
          UI.toast('请先选择照片');
          return;
        }
        const title = root.querySelector('#iddUpTitle').value.trim() || '未命名证件';
        const category = root.querySelector('#iddUpCat').value;
        const notes = root.querySelector('#iddUpNotes').value.trim();

        // 生成缩略图
        const thumbnail = await this._generateThumbnail(selectedImage, 300);

        await db.add(db.STORES.idDocs, {
          title,
          category,
          notes,
          imageData: selectedImage,
          thumbnail
        });

        UI.hideSheet();
        UI.toast(`已保存：${title}`);
        this._loadAndRender();
      };
    });
  },

  /* 生成缩略图 */
  _generateThumbnail(dataUrl, maxSize) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = dataUrl;
    });
  },

  /* 水印设置 */
  _watermarkSettings() {
    const wm = JSON.parse(localStorage.getItem('idDocs_watermark') || JSON.stringify(this.defaultWatermark));
    const body = `
      <div class="form-group">
        <label>水印文字</label>
        <input id="iddWsText" value="${wm.text || ''}" placeholder="水印文字内容" />
      </div>
      <div class="form-group">
        <label>预设模板</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${this.watermarkPresets.map(t => `
            <button class="chip gray idd-ws-preset" data-text="${t}" style="cursor:pointer;font-size:11px;">${t}</button>
          `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label>字号: <span id="iddWsSizeLabel">${wm.fontSize || 28}</span>px</label>
        <input type="range" id="iddWsSize" min="16" max="60" value="${wm.fontSize || 28}" style="width:100%;" />
      </div>
      <div class="form-group">
        <label>透明度: <span id="iddWsOpacityLabel">${Math.round((wm.opacity || 0.18) * 100)}</span>%</label>
        <input type="range" id="iddWsOpacity" min="5" max="60" value="${Math.round((wm.opacity || 0.18) * 100)}" style="width:100%;" />
      </div>
      <div class="form-group">
        <label>位置</label>
        <select id="iddWsPos">
          <option value="tile" ${wm.position === 'tile' ? 'selected' : ''}>平铺（推荐）</option>
          <option value="center" ${wm.position === 'center' ? 'selected' : ''}>居中</option>
          <option value="topLeft" ${wm.position === 'topLeft' ? 'selected' : ''}>左上角</option>
          <option value="topRight" ${wm.position === 'topRight' ? 'selected' : ''}>右上角</option>
          <option value="bottomLeft" ${wm.position === 'bottomLeft' ? 'selected' : ''}>左下角</option>
          <option value="bottomRight" ${wm.position === 'bottomRight' ? 'selected' : ''}>右下角</option>
        </select>
      </div>
      <div class="form-group">
        <label>旋转角度: <span id="iddWsRotateLabel">${wm.rotate || -25}</span>°</label>
        <input type="range" id="iddWsRotate" min="-60" max="60" value="${wm.rotate || -25}" style="width:100%;" />
      </div>
      <div class="form-group">
        <label>水印颜色</label>
        <input type="color" id="iddWsColor" value="${wm.color || '#333333'}" style="width:100%;height:36px;border-radius:8px;border:1px solid var(--ink-line);" />
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="iddWsReset">恢复默认</button>
        <button class="btn btn-primary" id="iddWsSave">保存设置</button>
      </div>
    `;

    UI.showSheet('水印设置', body, (root) => {
      const updateLabels = () => {
        root.querySelector('#iddWsSizeLabel').textContent = root.querySelector('#iddWsSize').value;
        root.querySelector('#iddWsOpacityLabel').textContent = root.querySelector('#iddWsOpacity').value;
        root.querySelector('#iddWsRotateLabel').textContent = root.querySelector('#iddWsRotate').value;
      };

      root.querySelector('#iddWsSize').oninput = updateLabels;
      root.querySelector('#iddWsOpacity').oninput = updateLabels;
      root.querySelector('#iddWsRotate').oninput = updateLabels;

      root.querySelectorAll('.idd-ws-preset').forEach(btn => {
        btn.onclick = () => {
          root.querySelector('#iddWsText').value = btn.dataset.text;
        };
      });

      root.querySelector('#iddWsReset').onclick = () => {
        localStorage.removeItem('idDocs_watermark');
        UI.hideSheet();
        UI.toast('已恢复默认水印设置');
      };

      root.querySelector('#iddWsSave').onclick = () => {
        const settings = {
          text: root.querySelector('#iddWsText').value.trim() || this.defaultWatermark.text,
          fontSize: parseInt(root.querySelector('#iddWsSize').value),
          opacity: parseInt(root.querySelector('#iddWsOpacity').value) / 100,
          position: root.querySelector('#iddWsPos').value,
          rotate: parseInt(root.querySelector('#iddWsRotate').value),
          color: root.querySelector('#iddWsColor').value
        };
        localStorage.setItem('idDocs_watermark', JSON.stringify(settings));
        UI.hideSheet();
        UI.toast('水印设置已保存');
      };
    });
  },

  /* 加水印并保存到相册 */
  async _saveToAlbum(imageDataUrl, watermarkText) {
    try {
      let finalImage = imageDataUrl;

      if (watermarkText) {
        finalImage = await this._applyWatermark(imageDataUrl, watermarkText);
      }

      // 将 base64 转为 Blob
      const resp = await fetch(finalImage);
      const blob = await resp.blob();

      // 尝试使用 Web Share API（移动端可保存到相册）
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], '证件照片.jpg', { type: 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: '保存证件照片'
          });
          UI.toast('已分享（可保存到相册）');
          return;
        }
      }

      // 降级方案：触发下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `证件照片_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      UI.toast('已下载到设备');
    } catch (e) {
      console.error('保存失败:', e);
      // 最后的降级方案
      const a = document.createElement('a');
      a.href = finalImage;
      a.download = `证件照片_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      UI.toast('已下载');
    }
  },

  /* 给图片添加水印 */
  _applyWatermark(imageDataUrl, text) {
    return new Promise((resolve) => {
      const wm = JSON.parse(localStorage.getItem('idDocs_watermark') || JSON.stringify(this.defaultWatermark));
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // 先绘制原图
        ctx.drawImage(img, 0, 0);

        // 设置水印样式
        ctx.fillStyle = wm.color || '#333333';
        ctx.globalAlpha = wm.opacity || 0.18;
        ctx.font = `bold ${wm.fontSize || 28}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textWidth = ctx.measureText(text).width;
        const textHeight = wm.fontSize || 28;
        const padding = textWidth * 1.5;

        if (wm.position === 'tile') {
          // 平铺模式
          const angle = (wm.rotate || -25) * Math.PI / 180;
          const stepX = textWidth + padding;
          const stepY = textHeight * 4;
          ctx.save();
          for (let y = -stepY; y < canvas.height + stepY; y += stepY) {
            for (let x = -stepX; x < canvas.width + stepX; x += stepX) {
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(angle);
              ctx.fillText(text, 0, 0);
              ctx.restore();
            }
          }
          ctx.restore();
        } else {
          // 单点模式
          let x, y;
          const margin = 40;
          switch (wm.position) {
            case 'topLeft':     x = textWidth / 2 + margin; y = textHeight + margin; break;
            case 'topRight':    x = canvas.width - textWidth / 2 - margin; y = textHeight + margin; break;
            case 'bottomLeft':  x = textWidth / 2 + margin; y = canvas.height - textHeight - margin; break;
            case 'bottomRight': x = canvas.width - textWidth / 2 - margin; y = canvas.height - textHeight - margin; break;
            case 'center':
            default:            x = canvas.width / 2; y = canvas.height / 2; break;
          }
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((wm.rotate || -25) * Math.PI / 180);
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.src = imageDataUrl;
    });
  }
};

/* 路由注册 */
router.register('idDocs', () => {
  App.setActiveNav('idDocs');
  IdDocs.render();
});

window.IdDocs = IdDocs;