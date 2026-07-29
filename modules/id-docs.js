/* ============================================
   证件管理模块 - 上传/查看/加水印保存
   一个证件项目可包含多张照片（如身份证正反面）
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
  _uploading: false,
  _lastCategory: 'idcard',

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
    position: 'tile',
    rotate: -25
  },

  /* 统一获取图片数组（兼容旧数据） */
  _getImages(item) {
    if (item.images && item.images.length > 0) return item.images;
    if (item.imageData) return [{ data: item.imageData, thumbnail: item.thumbnail, label: '' }];
    return [];
  },

  /* 获取第一张缩略图 */
  _getThumb(item) {
    const imgs = this._getImages(item);
    return imgs[0]?.thumbnail || imgs[0]?.data || '';
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
          <span class="chip gray">${allItems.length} 个</span>
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
      const imgs = this._getImages(item);
      const photoCount = imgs.length;
      const thumb = this._getThumb(item);
      return `
        <div class="id-doc-card" data-id="${item.id}">
          <div class="idd-thumb" style="background-image:url(${thumb})">
            ${photoCount > 1 ? `<span class="idd-count-badge">${photoCount}张</span>` : ''}
          </div>
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
    const imgs = this._getImages(item);

    const photosHtml = imgs.map((img, i) => `
      <div class="idd-photo-item" data-idx="${i}">
        ${img.label ? `<div class="idd-photo-label">${img.label}</div>` : ''}
        <div style="border-radius:10px;overflow:hidden;background:var(--ink-line);">
          <img src="${img.data}" style="width:100%;display:block;" alt="${img.label || '证件照片'}" />
        </div>
        <div style="display:flex;gap:6px;margin-top:6px;">
          <button class="btn btn-ghost idd-photo-save" data-idx="${i}" style="flex:1;font-size:11px;padding:6px;">💾 保存此张</button>
          <button class="btn btn-ghost idd-photo-del" data-idx="${i}" style="font-size:11px;padding:6px;color:#c44;">🗑</button>
        </div>
      </div>
    `).join('');

    const body = `
      <div style="margin-bottom:12px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span class="chip gray">${catInfo?.icon || '📄'} ${catInfo?.label || '其他'}</span>
        <span class="chip blue" style="font-size:11px;">📷 ${imgs.length}张照片</span>
        ${item.notes ? `<span class="chip gray" style="font-size:11px;">📝 ${item.notes}</span>` : ''}
      </div>
      <div class="idd-photos-scroll">${photosHtml}</div>
      <div style="font-size:11px;color:var(--ink-mute);margin:10px 0 14px;text-align:center;">
        上传于 ${UI.formatDate(item.createdAt, true)}
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 12px;background:var(--paper-deep);border-radius:8px;font-size:12px;">
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
      <div class="form-actions" style="margin-bottom:8px;">
        <button class="btn btn-primary" id="iddSaveAll" style="flex:1;">💾 全部保存到相册</button>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="iddAddPhoto" style="flex:1;">➕ 添加照片</button>
        <button class="btn btn-ghost" id="iddEdit" style="flex:1;">✏️ 编辑</button>
        <button class="btn btn-ghost" id="iddDelete" style="flex:1;color:#c44;">🗑 删除</button>
      </div>
    `;

    UI.showSheet(item.title || '证件详情', body, (root) => {
      const toggle = root.querySelector('#iddWatermarkToggle');
      const opts = root.querySelector('#iddWatermarkOpts');
      const preset = root.querySelector('#iddWmPreset');
      const custom = root.querySelector('#iddWmCustom');

      toggle.onchange = () => {
        opts.style.opacity = toggle.checked ? '1' : '0.4';
        opts.style.pointerEvents = toggle.checked ? 'auto' : 'none';
      };
      opts.style.opacity = '0.4';
      opts.style.pointerEvents = 'none';

      preset.onchange = () => { custom.value = preset.value; };
      custom.oninput = () => {
        const match = this.watermarkPresets.find(p => p === custom.value);
        if (match) preset.value = match;
      };

      // 全部保存
      root.querySelector('#iddSaveAll').onclick = async () => {
        const useWatermark = toggle.checked;
        const wmText = custom.value.trim() || this.defaultWatermark.text;
        UI.toast(useWatermark ? '正在生成带水印的图片...' : '正在保存...');
        for (const img of imgs) {
          await this._saveToAlbum(img.data, useWatermark ? wmText : null);
        }
      };

      // 单张保存
      root.querySelectorAll('.idd-photo-save').forEach(btn => {
        btn.onclick = async () => {
          const idx = parseInt(btn.dataset.idx);
          const useWatermark = toggle.checked;
          const wmText = custom.value.trim() || this.defaultWatermark.text;
          UI.toast(useWatermark ? '正在生成带水印的图片...' : '正在保存...');
          await this._saveToAlbum(imgs[idx].data, useWatermark ? wmText : null);
        };
      });

      // 单张删除
      root.querySelectorAll('.idd-photo-del').forEach(btn => {
        btn.onclick = async () => {
          const idx = parseInt(btn.dataset.idx);
          const label = imgs[idx].label || `第${idx + 1}张`;
          if (await UI.confirm(`确定删除「${label}」？`)) {
            imgs.splice(idx, 1);
            if (imgs.length === 0) {
              await db.remove(db.STORES.idDocs, item.id);
              UI.hideSheet();
              UI.toast('已删除');
              this._loadAndRender();
            } else {
              item.images = imgs;
              await db.put(db.STORES.idDocs, item);
              UI.hideSheet();
              UI.toast('已删除该照片');
              this._showDetail(item);
              this._loadAndRender();
            }
          }
        };
      });

      // 添加照片
      root.querySelector('#iddAddPhoto').onclick = async () => {
        const newImages = await UI.pickImages(9);
        if (!newImages || newImages.length === 0) return;

        UI.hideSheet();
        for (let i = 0; i < newImages.length; i++) {
          const cropped = await this._cropOne(newImages[i], i + 1, newImages.length, imgs.length + i + 1);
          if (cropped) {
            const thumbnail = await this._generateThumbnail(cropped.data, 300);
            imgs.push({ data: cropped.data, label: cropped.label, thumbnail });
          }
        }
        item.images = imgs;
        await db.put(db.STORES.idDocs, item);
        UI.hideSheet();
        UI.toast('已添加照片');
        this._showDetail(item);
        this._loadAndRender();
      };

      root.querySelector('#iddEdit').onclick = () => {
        UI.hideSheet();
        this._edit(item);
      };

      root.querySelector('#iddDelete').onclick = async () => {
        if (await UI.confirm('确定删除整个证件项目？')) {
          await db.remove(db.STORES.idDocs, item.id);
          UI.hideSheet();
          UI.toast('已删除');
          this._loadAndRender();
        }
      };
    });
  },

  _edit(item) {
    const imgs = this._getImages(item);
    const body = `
      <div class="form-group">
        <label>证件名称</label>
        <input id="iddEditTitle" value="${item.title || ''}" placeholder="如：身份证" />
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
      <div class="form-group">
        <label>照片列表（${imgs.length}张）</label>
        <div id="iddEditPhotos" style="display:flex;flex-direction:column;gap:8px;">
          ${imgs.map((img, i) => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px;background:var(--paper-deep);border-radius:8px;">
              <img src="${img.thumbnail || img.data}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;" />
              <input class="idd-edit-label" data-idx="${i}" value="${img.label || ''}" placeholder="如：正面" style="flex:1;font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--ink-line);" />
            </div>
          `).join('')}
        </div>
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

        // 更新标签
        const labelInputs = root.querySelectorAll('.idd-edit-label');
        labelInputs.forEach(input => {
          const idx = parseInt(input.dataset.idx);
          if (item.images) {
            item.images[idx].label = input.value.trim();
          } else {
            // 兼容旧数据：迁移为 images 数组
            item.images = imgs.map((img, i) => ({
              data: img.data,
              thumbnail: img.thumbnail,
              label: i === idx ? input.value.trim() : (img.label || '')
            }));
            delete item.imageData;
            delete item.thumbnail;
          }
        });

        await db.put(db.STORES.idDocs, item);
        UI.hideSheet();
        UI.toast('已保存');
        this._loadAndRender();
      };
    });
  },

  /* 上传证件 - 多选 + 依次裁剪 + 统一信息 */
  async _upload() {
    if (this._uploading) return;
    this._uploading = true;

    const images = await UI.pickImages(9);
    if (!images || images.length === 0) {
      this._uploading = false;
      return;
    }

    // ====== Step 1: 依次裁剪所有照片 ======
    const croppedImages = [];
    for (let i = 0; i < images.length; i++) {
      const result = await this._cropOne(images[i], i + 1, images.length, croppedImages.length + 1);
      if (result) {
        croppedImages.push(result);
      }
    }

    if (croppedImages.length === 0) {
      this._uploading = false;
      UI.hideSheet();
      return;
    }

    // ====== Step 2: 填写一组证件信息 ======
    const info = await this._showInfoStep(croppedImages, this._lastCategory);
    if (!info) {
      this._uploading = false;
      UI.hideSheet();
      return;
    }

    this._lastCategory = info.category;

    // ====== Step 3: 生成缩略图并保存 ======
    const imageRecords = [];
    for (let i = 0; i < croppedImages.length; i++) {
      const thumbnail = await this._generateThumbnail(croppedImages[i].data, 300);
      imageRecords.push({
        data: croppedImages[i].data,
        label: croppedImages[i].label || `第${i + 1}张`,
        thumbnail
      });
    }

    await db.add(db.STORES.idDocs, {
      title: info.title,
      category: info.category,
      notes: info.notes,
      images: imageRecords,
      createdAt: Date.now()
    });

    this._uploading = false;
    UI.hideSheet();
    this._loadAndRender();
    UI.toast('已保存证件');
  },

  /* 裁剪单张照片（含标签输入） */
  _cropOne(imageDataUrl, index, total, existingCount) {
    return new Promise((resolve) => {
      let cleanupDrag = null;
      const img = new Image();

      const defaultLabel = existingCount === 1 ? '正面' : existingCount === 2 ? '反面' : `第${existingCount}张`;

      const cropBody = `
        <div id="iddCropStep">
          <div style="text-align:center;margin-bottom:6px;">
            <span style="font-size:12px;color:var(--ink-mute);">第 ${index} 张 / 共 ${total} 张 · 拖动四角缩放，中间移动</span>
          </div>
          <div class="idd-crop-viewport" id="iddCropViewport">
            <img class="idd-crop-img" id="iddCropImg" alt="裁剪" style="visibility:hidden;" />
            <div class="idd-crop-frame" id="iddCropFrame" style="display:none;">
              <div class="idd-crop-cross"></div>
              <div class="idd-crop-handle idd-crop-handle-tl" data-handle="tl"></div>
              <div class="idd-crop-handle idd-crop-handle-tr" data-handle="tr"></div>
              <div class="idd-crop-handle idd-crop-handle-bl" data-handle="bl"></div>
              <div class="idd-crop-handle idd-crop-handle-br" data-handle="br"></div>
            </div>
            <div class="idd-crop-loading" id="iddCropLoading">加载中...</div>
          </div>
          <div class="form-group" style="margin-top:10px;">
            <label>此面名称</label>
            <input id="iddCropLabel" value="${defaultLabel}" placeholder="如：正面、反面" style="width:100%;" />
          </div>
          <div class="form-actions" style="margin-top:8px;">
            <button class="btn btn-ghost" id="iddCropSkipBtn">跳过此张</button>
            <button class="btn btn-primary" id="iddCropOkBtn">确认裁剪</button>
          </div>
          <div style="text-align:center;margin-top:8px;">
            <button class="btn btn-ghost" id="iddCropCancelAll" style="color:#c44;font-size:11px;">取消上传</button>
          </div>
        </div>
      `;

      UI.showSheet('裁剪证件照片', cropBody, (root) => {
        const viewport = root.querySelector('#iddCropViewport');
        const frame = root.querySelector('#iddCropFrame');
        const imgEl = root.querySelector('#iddCropImg');
        const loading = root.querySelector('#iddCropLoading');
        const labelInput = root.querySelector('#iddCropLabel');

        img.onload = () => {
          loading.style.display = 'none';
          imgEl.src = imageDataUrl;
          imgEl.style.visibility = 'visible';

          const containerW = viewport.clientWidth;
          const containerH = viewport.clientHeight;
          const scale = Math.min(containerW / img.naturalWidth, containerH / img.naturalHeight);
          const displayW = img.naturalWidth * scale;
          const displayH = img.naturalHeight * scale;
          const offsetX = (containerW - displayW) / 2;
          const offsetY = (containerH - displayH) / 2;

          imgEl.style.width = displayW + 'px';
          imgEl.style.height = displayH + 'px';
          imgEl.style.left = offsetX + 'px';
          imgEl.style.top = offsetY + 'px';

          const fw = displayW * 0.85;
          const fh = displayH * 0.85;
          frame.style.width = fw + 'px';
          frame.style.height = fh + 'px';
          frame.style.left = (offsetX + (displayW - fw) / 2) + 'px';
          frame.style.top = (offsetY + (displayH - fh) / 2) + 'px';
          frame.style.display = 'block';

          cleanupDrag = this._bindCropDrag(frame, offsetX, offsetY, offsetX + displayW, offsetY + displayH);
        };
        img.onerror = () => {
          loading.textContent = '图片加载失败，请跳过此张';
          loading.style.color = '#c44';
        };
        img.src = imageDataUrl;

        const finish = (data, label) => {
          if (cleanupDrag) { cleanupDrag(); cleanupDrag = null; }
          resolve(data ? { data, label: label || defaultLabel } : null);
        };

        root.querySelector('#iddCropSkipBtn').onclick = (e) => {
          e.stopPropagation();
          finish(imageDataUrl, labelInput.value.trim());
        };
        root.querySelector('#iddCropOkBtn').onclick = (e) => {
          e.stopPropagation();
          if (!img.complete) { UI.toast('图片加载中，请稍候'); return; }
          const cropped = this._performCrop(imageDataUrl, img, frame, viewport);
          finish(cropped, labelInput.value.trim());
        };
        root.querySelector('#iddCropCancelAll').onclick = (e) => {
          e.stopPropagation();
          if (cleanupDrag) { cleanupDrag(); cleanupDrag = null; }
          this._uploading = false;
          UI.hideSheet();
          resolve(null);
        };
      });
    });
  },

  /* 填写证件信息（所有照片共用一组信息） */
  _showInfoStep(croppedImages, defaultCategory) {
    const labelSummary = croppedImages.map(img => img.label || '照片').join(' · ');
    const defaultTitle = defaultCategory === 'idcard' ? '身份证' :
                         defaultCategory === 'passport' ? '护照' :
                         defaultCategory === 'driver' ? '驾驶证' :
                         defaultCategory === 'hukou' ? '户口本' :
                         defaultCategory === 'degree' ? '学位证' : '证件照片';

    const infoBody = `
      <div style="margin-bottom:14px;padding:10px 12px;background:var(--paper-deep);border-radius:8px;">
        <div style="font-size:12px;color:var(--ink-mute);margin-bottom:4px;">已裁剪 ${croppedImages.length} 张照片</div>
        <div style="font-size:13px;color:var(--ink);font-weight:500;">${labelSummary}</div>
      </div>
      <div class="form-group">
        <label>证件名称</label>
        <input id="iddInfoTitle" value="${defaultTitle}" placeholder="如：身份证" style="width:100%;" />
      </div>
      <div class="form-group">
        <label>证件类型</label>
        <select id="iddInfoCat" style="width:100%;">
          ${this.categories.filter(c => c.key !== 'all').map(c =>
            `<option value="${c.key}" ${c.key === defaultCategory ? 'selected' : ''}>${c.icon} ${c.label}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>备注（选填）</label>
        <input id="iddInfoNotes" placeholder="如：有效期至2028年" style="width:100%;" />
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="iddInfoCancel">取消</button>
        <button class="btn btn-primary" id="iddInfoSave">保存</button>
      </div>
    `;

    UI.sheetTitleEl.textContent = '证件信息';
    UI.sheetBodyEl.innerHTML = infoBody;
    UI.sheetBodyEl.scrollTop = 0;

    return new Promise((resolve) => {
      UI.sheetBodyEl.querySelector('#iddInfoCancel').onclick = (e) => {
        e.stopPropagation();
        resolve(null);
      };
      UI.sheetBodyEl.querySelector('#iddInfoSave').onclick = (e) => {
        e.stopPropagation();
        const title = UI.sheetBodyEl.querySelector('#iddInfoTitle').value.trim() || defaultTitle;
        const category = UI.sheetBodyEl.querySelector('#iddInfoCat').value;
        const notes = UI.sheetBodyEl.querySelector('#iddInfoNotes').value.trim();
        resolve({ title, category, notes });
      };
    });
  },

  _bindCropDrag(frame, minX, minY, maxX, maxY) {
    let mode = null;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0, startW = 0, startH = 0;
    const MIN_SIZE = 40;

    const onStart = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
      startLeft = frame.offsetLeft;
      startTop = frame.offsetTop;
      startW = frame.offsetWidth;
      startH = frame.offsetHeight;

      const handle = e.target.closest('[data-handle]');
      mode = handle ? handle.dataset.handle : 'move';
      frame.style.cursor = mode === 'move' ? 'grabbing' : 'nwse-resize';
      e.preventDefault();
      e.stopPropagation();
    };

    const onMove = (e) => {
      if (!mode) return;
      const touch = e.touches ? e.touches[0] : e;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (mode === 'move') {
        const newLeft = Math.max(minX, Math.min(maxX - startW, startLeft + dx));
        const newTop = Math.max(minY, Math.min(maxY - startH, startTop + dy));
        frame.style.left = newLeft + 'px';
        frame.style.top = newTop + 'px';
      } else {
        let newLeft = startLeft, newTop = startTop, newW = startW, newH = startH;

        if (mode.includes('l')) {
          newLeft = Math.max(minX, Math.min(startLeft + startW - MIN_SIZE, startLeft + dx));
          newW = startW - (newLeft - startLeft);
        }
        if (mode.includes('r')) {
          newW = Math.max(MIN_SIZE, Math.min(maxX - startLeft, startW + dx));
        }
        if (mode.includes('t')) {
          newTop = Math.max(minY, Math.min(startTop + startH - MIN_SIZE, startTop + dy));
          newH = startH - (newTop - startTop);
        }
        if (mode.includes('b')) {
          newH = Math.max(MIN_SIZE, Math.min(maxY - startTop, startH + dy));
        }

        frame.style.left = newLeft + 'px';
        frame.style.top = newTop + 'px';
        frame.style.width = newW + 'px';
        frame.style.height = newH + 'px';
      }
      e.preventDefault();
    };

    const onEnd = () => {
      mode = null;
      frame.style.cursor = 'grab';
    };

    frame.addEventListener('touchstart', onStart, { passive: false });
    frame.addEventListener('mousedown', onStart);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchend', onEnd);
    document.addEventListener('mouseup', onEnd);

    return () => {
      frame.removeEventListener('touchstart', onStart);
      frame.removeEventListener('mousedown', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('mouseup', onEnd);
    };
  },

  _performCrop(imageDataUrl, img, frame, viewport) {
    const viewportRect = viewport.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();

    const containerW = viewport.clientWidth;
    const containerH = viewport.clientHeight;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    const scale = Math.min(containerW / imgW, containerH / imgH);
    const displayW = imgW * scale;
    const displayH = imgH * scale;
    const offsetX = (containerW - displayW) / 2;
    const offsetY = (containerH - displayH) / 2;

    const cropX = (frameRect.left - viewportRect.left - offsetX) / scale;
    const cropY = (frameRect.top - viewportRect.top - offsetY) / scale;
    const cropW = frameRect.width / scale;
    const cropH = frameRect.height / scale;

    const finalX = Math.max(0, Math.min(imgW - 1, cropX));
    const finalY = Math.max(0, Math.min(imgH - 1, cropY));
    const finalW = Math.min(imgW - finalX, cropW);
    const finalH = Math.min(imgH - finalY, cropH);

    const canvas = document.createElement('canvas');
    canvas.width = finalW;
    canvas.height = finalH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, finalX, finalY, finalW, finalH, 0, 0, finalW, finalH);
    return canvas.toDataURL('image/jpeg', 0.92);
  },

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

      const resp = await fetch(finalImage);
      const blob = await resp.blob();

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], '证件照片.jpg', { type: 'image/jpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: '保存证件照片'
          });
          return;
        }
      }

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

        ctx.drawImage(img, 0, 0);

        ctx.fillStyle = wm.color || '#333333';
        ctx.globalAlpha = wm.opacity || 0.18;
        ctx.font = `bold ${wm.fontSize || 28}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textWidth = ctx.measureText(text).width;
        const textHeight = wm.fontSize || 28;
        const padding = textWidth * 1.5;

        if (wm.position === 'tile') {
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
