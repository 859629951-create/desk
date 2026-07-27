/* ============================================
   数据存储层 - IndexedDB 封装
   所有模块共用一个数据库，每个模块一个 store
   ============================================ */

const DB_NAME = 'deskDB';
const DB_VERSION = 3;

const STORES = {
  study: 'study', // 学习清单
  studyCheckin: 'studyCheckin', // 学习打卡记录
  studyMaterials: 'studyMaterials', // 学习资料
  punch: 'punch', // 打卡清单（吃喝玩乐）
  travel: 'travel', // 旅游清单
  interest: 'interest', // 兴趣清单
  recipe: 'recipe', // 下厨菜谱
  recipeIngredients: 'recipeIngredients', // 菜谱原料
  account: 'account', // 记账账户
  accountLog: 'accountLog', // 记账流水
  work: 'work', // 工作清单
  museum: 'museum', // 博物馆项目
  relic: 'relic', // 文物
  pet: 'pet', // 宠物档案
  petWeight: 'petWeight', // 体重记录
  petHealth: 'petHealth', // 健康/医疗记录（疫苗/驱虫/洗澡/症状/手术/就医/喂养）
  petMedia: 'petMedia', // 阶段照片
  petExpense: 'petExpense', // 宠物花销
  // ===== 学习中心 v3 新增 =====
  duolingo: 'duolingo', // 多邻国打卡记录
  englishLog: 'englishLog', // 英语学习记录（时长/背单词/长难句）
  book: 'book', // 读书计划
  paper: 'paper', // 文献阅读任务
  paperNote: 'paperNote', // 文献笔记（上传的PDF/笔记）
  thesis: 'thesis', // 论文进度
  course: 'course', // 课程表
  classLog: 'classLog', // 上课记录（日期/内容/作业/考勤）
  mindmap: 'mindmap', // 思维导图（大纲）
  news: 'news', // 每日新闻热点缓存
  // ===== 旅行计划 =====
  travelPlan: 'travelPlan', // 旅行行程计划（多天行程项）
  // ===== 存钱罐 =====
  savings: 'savings', // 存钱罐
  savingsLog: 'savingsLog' // 存钱罐存入/取出记录
};

let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      Object.values(STORES).forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      });
    };
    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

async function tx(store, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const os = t.objectStore(store);
    let result;
    const r = fn(os);
    if (r) {
      r.onsuccess = () => (result = r.result);
      r.onerror = () => reject(r.error);
    }
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const db = {
  async add(store, value) {
    if (!value.id) value.id = uid();
    if (!value.createdAt) value.createdAt = Date.now();
    value.updatedAt = Date.now();
    await tx(store, 'readwrite', (os) => os.add(value));
    return value;
  },

  async put(store, value) {
    value.updatedAt = Date.now();
    await tx(store, 'readwrite', (os) => os.put(value));
    return value;
  },

  async get(store, id) {
    return tx(store, 'readonly', (os) => os.get(id));
  },

  async all(store) {
    return new Promise(async (resolve, reject) => {
      const db = await openDB();
      const t = db.transaction(store, 'readonly');
      const os = t.objectStore(store);
      const req = os.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async remove(store, id) {
    return tx(store, 'readwrite', (os) => os.delete(id));
  },

  async clear(store) {
    return tx(store, 'readwrite', (os) => os.clear());
  },

  async query(store, predicate) {
    const all = await this.all(store);
    return all.filter(predicate);
  },

  STORES
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

window.db = db;
window.uid = uid;
