/* ============================================
   简易路由 - 基于 hash
   ============================================ */

const routes = {};
let currentRoute = null;

function register(path, handler) {
  routes[path] = handler;
}

function navigate(path) {
  if (location.hash === '#' + path) {
    // 同一路由，手动触发
    render();
  } else {
    location.hash = '#' + path;
  }
}

function render() {
  const hash = location.hash.slice(1) || 'home';

  // 防止在证件上传/裁剪过程中意外导航导致闪退
  if (window.IdDocs && IdDocs._uploading && (currentRoute === 'idDocs' || hash === 'idDocs')) {
    console.log('[Router] 导航被阻止：正在进行证件上传/裁剪');
    return;
  }

  const segs = hash.split('/').filter(Boolean);

  // 精确匹配
  let key = segs.join('/');
  let handler = routes[key];

  // 动态路由回退：逐级缩短直到匹配（支持 study/detail/xxx -> study/*）
  if (!handler) {
    while (segs.length > 1 && !handler) {
      segs.pop();
      const parentKey = segs.join('/') + '/*';
      handler = routes[parentKey];
      if (handler) {
        // paramStr 为被 pop 掉的部分
        const consumed = segs.join('/');
        const paramStr = hash.slice(consumed.length).replace(/^\//, '');
        currentRoute = key;
        handler(paramStr);
        scrollTop();
        return;
      }
    }
  }

  if (!handler) handler = routes['home'];
  currentRoute = key;
  handler('');
  scrollTop();
}

function scrollTop() {
  const main = document.getElementById('appMain');
  if (main) main.scrollTop = 0;
}

window.addEventListener('hashchange', render);
window.addEventListener('load', render);

window.router = { register, navigate, render };
