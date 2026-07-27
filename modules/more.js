/* ============================================
   更多模块页面 v3 - 次要模块入口
   ============================================ */

router.register('more', () => {
  App.setActiveNav('more');
  App.setFab(null);
  const main = document.getElementById('appMain');

  const modules = App.moreModules.filter((m) => m.key !== 'settings');
  const settingsItem = App.moreModules.find((m) => m.key === 'settings');

  main.innerHTML = `
    <div class="fade-up">
      <div class="module-head">
        <div>
          <div class="mh-title"><span class="emoji">📒</span> 更多模块</div>
          <div class="mh-sub">生活的方方面面，都在这里</div>
        </div>
      </div>

      <div class="dash-grid">
        ${modules
          .map((m) => {
            const accent =
              m.key === 'recipe' ? 'accent-gold' :
              m.key === 'museum' ? 'accent-rust' :
              m.key === 'punch' ? 'accent-rust' :
              m.key === 'pet' ? 'accent-gold' :
              m.key === 'interest' ? '' :
              m.key === 'work' ? 'accent-blue' : '';
            return `
          <div class="dash-card ${accent}" data-route="${m.key}">
            <div class="dc-bar"></div>
            <div class="dc-head">
              <span class="dc-icon">${m.icon}</span>
              <span class="dc-title">${m.label}</span>
            </div>
            <div class="dc-body">${m.sub}</div>
          </div>`;
          })
          .join('')}
      </div>

      <div class="section-title">系统</div>
      <div class="list-item" data-route="${settingsItem.key}">
        <div class="li-row">
          <span style="font-size:20px">${settingsItem.icon}</span>
          <div style="flex:1">
            <div class="li-title">${settingsItem.label}</div>
            <div class="li-sub">${settingsItem.sub}</div>
          </div>
          <span style="color:var(--ink-mute);font-size:18px">›</span>
        </div>
      </div>
    </div>
  `;

  main.querySelectorAll('[data-route]').forEach((el) => {
    el.addEventListener('click', () => router.navigate(el.dataset.route));
  });
});
