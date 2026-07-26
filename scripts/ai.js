/* ============================================
   AI 辅助层
   - 支持本地规则引擎（离线可用）
   - 支持接入在线 API（用户可在设置中配置）
   ============================================ */

const AI = {
  /* DeepSeek 预设配置 */
  presets: {
    deepseek: {
      label: 'DeepSeek',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-chat',
      visionModel: 'deepseek-chat'
    }
  },

  config: {
    provider: 'online', // 默认启用在线模式（已预置 DeepSeek）
    apiKey: 'sk-d253396e05d34dc098d272d27c807398',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    visionModel: 'deepseek-chat',
    preset: 'deepseek'
  },

  async loadConfig() {
    try {
      const raw = localStorage.getItem('aiConfig');
      if (raw) {
        const saved = JSON.parse(raw);
        // 合并保存的配置，但保留预设的默认值兜底
        this.config = { ...this.config, ...saved };
        // 若保存的 apiKey 为空，回退到内置 DeepSeek key
        if (!this.config.apiKey) {
          this.config.apiKey = 'sk-d253396e05d34dc098d272d27c807398';
          this.config.endpoint = 'https://api.deepseek.com/v1/chat/completions';
          this.config.model = 'deepseek-chat';
        }
      }
    } catch (e) {}
  },

  saveConfig(cfg) {
    this.config = { ...this.config, ...cfg };
    localStorage.setItem('aiConfig', JSON.stringify(this.config));
  },

  /* 切换预设提供商 */
  applyPreset(presetKey) {
    const preset = this.presets[presetKey];
    if (!preset) return;
    this.saveConfig({
      preset: presetKey,
      endpoint: preset.endpoint,
      model: preset.model,
      visionModel: preset.visionModel
    });
  },

  /* 通用文本生成 */
  async generate(prompt, context = '') {
    if (this.config.provider === 'online' && this.config.apiKey) {
      try {
        return await this._callOnline(prompt, context);
      } catch (e) {
        return this._local(prompt, context);
      }
    }
    return this._local(prompt, context);
  },

  async _callOnline(prompt, context) {
    const res = await fetch(this.config.endpoint || 'https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一个贴心的生活助手，用简洁的中文回答。若用户要求返回 JSON，请只输出纯 JSON，不要包含 markdown 代码块标记。' },
          { role: 'user', content: context ? `${context}\n\n${prompt}` : prompt }
        ],
        temperature: 0.7,
        stream: false
      })
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  },

  /* 本地规则引擎 */
  _local(prompt, context) {
    const p = (prompt + ' ' + context).toLowerCase();

    // 菜谱原料识别
    if (p.includes('原料') || p.includes('材料') || p.includes('食材')) {
      return this._recipeHint(prompt, context);
    }

    // 文物识别提示
    if (p.includes('文物') || p.includes('博物馆')) {
      return '请在文物详情中手动补充名称与简介。AI 在线模式可自动识别，前往「设置」配置 API Key 后启用。';
    }

    // 学习辅导
    if (p.includes('学习') || p.includes('法语') || p.includes('英语') || p.includes('法学')) {
      return this._studyHint(prompt, context);
    }

    return '已收到你的请求。当前为离线模式，可在「设置」中配置在线 AI 以获得更智能的回答。';
  },

  _recipeHint(prompt, context) {
    return '💡 小贴士：\n· 蔬菜类建议提前洗净切配\n· 肉类注意解冻与腌制时间\n· 调料按菜谱分量准备，避免过咸\n\n配置在线 AI 后可自动从菜谱文本中提取原料清单与做法步骤。';
  },

  _studyHint(prompt, context) {
    const tips = {
      法语: '建议每日 15 分钟听力 + 10 个新词记忆，每周一篇短文写作。',
      英语: 'LEC 考试重点：法律术语翻译、合同起草、案例分析。建议结合真题训练。',
      法学: '民法学重点：物权、债权、侵权责任。商法学重点：公司法、票据法、保险法。'
    };
    for (const k in tips) {
      if (prompt.includes(k) || (context && context.includes(k))) return tips[k];
    }
    return '将大目标拆解为每日小任务，配合打卡能显著提升坚持率。试试给这个学习任务设置一个每日提醒吧。';
  },

  /* 从文本中提取原料（简易规则） */
  extractIngredients(text) {
    if (!text) return [];
    const common = [
      '盐', '糖', '酱油', '醋', '料酒', '食用油', '葱', '姜', '蒜', '花椒', '八角', '桂皮',
      '辣椒', '胡椒粉', '生抽', '老抽', '蚝油', '淀粉', '鸡蛋', '面粉', '大米', '面条',
      '猪肉', '牛肉', '鸡肉', '鸭肉', '鱼', '虾', '白菜', '土豆', '番茄', '黄瓜', '茄子',
      '豆腐', '蘑菇', '胡萝卜', '青椒', '洋葱', '芹菜', '菠菜', '豆角', '冬瓜', '南瓜',
      '生菜', '西兰花', '莲藕', '木耳', '粉丝', '芝麻', '香油', '豆瓣酱', '甜面酱',
      '番茄酱', '料酒', '五香粉', '咖喱', '黄油', '奶油', '芝士', '培根', '香肠'
    ];
    const result = [];
    const lower = text.toLowerCase();
    common.forEach((ing) => {
      if (lower.includes(ing.toLowerCase())) {
        result.push({ name: ing, have: false });
      }
    });
    return result;
  },

  /* 模拟文物识别（实际场景需在线 AI + 图像识别） */
  async recognizeRelic(imageDataUrl, museumName) {
    if (this.config.provider === 'online' && this.config.apiKey) {
      try {
        return await this._callVision(imageDataUrl, museumName);
      } catch (e) {
        return { name: '未识别', desc: '在线识别失败，请手动补充文物名称与简介。' };
      }
    }
    // 本地占位
    return {
      name: '',
      desc: '',
      hint: '点击「AI 识别」会调用在线视觉模型自动识别文物名称与简介；当前为离线模式，请手动填写或前往设置配置 API。'
    };
  },

  /* 从展板说明文字中提取文物名称、朝代、简介 */
  async extractRelicFromText(text, museumName) {
    const prompt = `以下是在${museumName || '博物馆'}拍摄的展板/介绍牌文字，请从中提取文物信息。
返回 JSON 格式：{"name":"文物名称","dynasty":"朝代/年代","desc":"简介（100字以内）"}
如果某项信息无法识别，对应字段返回空字符串。

展板文字：
${text}`;

    if (this.config.provider === 'online' && this.config.apiKey) {
      try {
        const resp = await this._callOnline(prompt, '');
        const cleaned = this._stripCodeFence(resp);
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
      } catch (e) {}
    }
    // 本地规则提取
    return this._localExtractRelic(text);
  },

  _localExtractRelic(text) {
    const result = { name: '', dynasty: '', desc: '' };
    if (!text) return result;

    // 朝代关键词匹配
    const dynasties = [
      '新石器时代', '石器时代', '夏代', '商代', '西周', '东周', '春秋', '战国',
      '秦代', '西汉', '东汉', '三国', '魏晋', '南北朝', '隋代', '唐代',
      '五代', '北宋', '南宋', '辽代', '金代', '元代', '明代', '清代',
      '近代', '现代', '当代',
      '夏', '商', '秦', '汉', '隋', '唐', '宋', '元', '明', '清'
    ];
    for (const d of dynasties) {
      const regex = new RegExp(d + '[朝代时期\\s]', 'i');
      if (regex.test(text) || text.includes(d)) {
        result.dynasty = d;
        break;
      }
    }

    // 尝试提取名称：通常在"名称：""文物名："等后面，或第一行
    let nameSource = '';
    const nameMatch = text.match(/(?:名称|文物名|展品名)[：:]\s*(.+?)[\n，,。]/);
    if (nameMatch) {
      result.name = nameMatch[1].trim();
      nameSource = nameMatch[0];
    } else {
      // 取第一行作为名称候选
      const firstLine = text.split(/[\n，,。]/)[0].trim();
      if (firstLine && firstLine.length <= 30) {
        result.name = firstLine;
        nameSource = firstLine;
      }
    }

    // 简介取去除名称行后的剩余文字
    if (nameSource) {
      const rest = text.replace(nameSource, '').trim();
      if (rest) result.desc = rest.substring(0, 150);
    } else {
      result.desc = text.substring(0, 150);
    }

    return result;
  },

  /* AI 联网搜索文物信息 */
  async searchRelicOnline(name, museumName) {
    const prompt = `请搜索文物「${name}」的相关信息${museumName ? '（该文物收藏于' + museumName + '）' : ''}。
返回 JSON 格式：{"name":"文物全名","dynasty":"朝代/年代","desc":"简介（100-200字，包括历史背景、特点、用途等）"}`;

    if (this.config.provider === 'online' && this.config.apiKey) {
      try {
        const resp = await this._callOnline(prompt, '');
        const cleaned = this._stripCodeFence(resp);
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
      } catch (e) {}
    }
    // 本地占位
    return {
      name: '',
      dynasty: '',
      desc: ''
    };
  },

  async _callVision(imageDataUrl, museumName) {
    const res = await fetch(this.config.endpoint || 'https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.visionModel || this.config.model || 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `这是在${museumName || '博物馆'}拍摄的文物照片，请识别文物名称并简要介绍其历史背景（100字以内），以JSON格式返回：{"name":"...","desc":"..."}` },
              { type: 'image_url', image_url: { url: imageDataUrl } }
            ]
          }
        ]
      })
    });
    if (!res.ok) {
      throw new Error(`Vision API ${res.status}`);
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    try {
      const cleaned = this._stripCodeFence(content);
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch (e) {}
    return { name: '未识别', desc: content };
  },

  /* 去除 AI 返回中的 markdown 代码块标记 ```json ... ``` */
  _stripCodeFence(text) {
    if (!text) return text;
    return text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
  },

  /* ============================================
     学习增强：自动出题 / 计划拆解 / 思维导图
     ============================================ */

  /* 1. 自动出题测验：根据任务标题、备注、资料描述生成题目 */
  async generateQuiz(task) {
    const prompt = `请根据以下学习内容生成 5 道自测题，要求涵盖选择、判断、简答等题型，并附上答案与解析。
返回 JSON 数组，每个题目格式为：
{"type":"choice|judge|short","q":"题干","options":["A.."],"answer":"答案","explain":"解析"}

学习内容：
- 学科：${task.subject}
- 标题：${task.title}
- 备注：${task.note || '无'}
- 每日目标：${task.goal || '无'}`;

    if (this.config.provider === 'online' && this.config.apiKey) {
      try {
        const text = await this._callOnline(prompt, '');
        const cleaned = this._stripCodeFence(text);
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]);
      } catch (e) {}
    }
    // 本地示例题库
    return this._localQuiz(task);
  },

  _localQuiz(task) {
    const subject = task.subject || '';
    return [
      {
        type: 'choice',
        q: `关于「${task.title}」，下列说法正确的是？`,
        options: ['A. 属于基础概念', 'B. 属于高级应用', 'C. 属于拓展知识', 'D. 以上都对'],
        answer: 'A',
        explain: '建议结合教材第一章节深入学习该知识点。'
      },
      {
        type: 'judge',
        q: `「${task.title}」是${subject}学习的核心内容之一。`,
        options: ['正确', '错误'],
        answer: '正确',
        explain: '该任务已列入学习计划，属于重点内容。'
      },
      {
        type: 'short',
        q: `请简述「${task.title}」的核心要点。`,
        options: [],
        answer: '请结合资料自行整理 3 个要点。',
        explain: '整理要点有助于加深理解，建议手写或绘制思维导图。'
      },
      {
        type: 'choice',
        q: `学习「${task.title}」时，最有效的复习方法是？`,
        options: ['A. 间隔重复', 'B. 一次性突击', 'C. 只看不做', 'D. 只听不练'],
        answer: 'A',
        explain: '间隔重复（Spaced Repetition）能显著提升长期记忆效果。'
      },
      {
        type: 'short',
        q: `如何将「${task.title}」应用到实际场景中？举一个例子。`,
        options: [],
        answer: '请结合个人理解作答。',
        explain: '知识的应用是检验掌握程度的最佳方式。'
      }
    ];
  },

  /* 2. 学习计划拆解：根据考试日期生成每日计划 */
  async generatePlan(task, examDate, dailyMinutes) {
    const now = new Date();
    const exam = new Date(examDate);
    const days = Math.max(1, Math.ceil((exam - now) / 86400000));
    const totalMinutes = days * (dailyMinutes || 45);

    const prompt = `请为以下学习任务制定 ${days} 天的学习计划，每天学习 ${dailyMinutes || 45} 分钟。
要求：
1. 合理分配知识点，由浅入深
2. 每隔 3-4 天安排复习日
3. 最后 3 天安排综合模拟
返回 JSON 数组，每天格式：{"day":1,"date":"YYYY-MM-DD","topic":"主题","task":"具体任务","duration":"45分钟","type":"learn|review|mock"}

学习任务：
- 学科：${task.subject}
- 标题：${task.title}
- 备注：${task.note || '无'}`;

    if (this.config.provider === 'online' && this.config.apiKey) {
      try {
        const text = await this._callOnline(prompt, '');
        const cleaned = this._stripCodeFence(text);
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]);
      } catch (e) {}
    }
    return this._localPlan(task, days, dailyMinutes || 45);
  },

  _localPlan(task, days, dailyMinutes) {
    const plan = [];
    const topics = this._subjectTopics(task.subject, task.title);
    const startDate = new Date();

    for (let d = 1; d <= days; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + d - 1);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      let type = 'learn';
      let topicIdx = Math.floor((d - 1) / Math.ceil(days / topics.length));
      let topic = topics[Math.min(topicIdx, topics.length - 1)];

      // 每 4 天一次复习
      if (d % 4 === 0 && d < days - 2) {
        type = 'review';
        topic = `复习：${topics.slice(0, topicIdx + 1).join('、')}`;
      }
      // 最后 3 天模拟
      if (d > days - 3) {
        type = 'mock';
        topic = `综合模拟 ${d - (days - 3) + 1}`;
      }

      plan.push({
        day: d,
        date: dateStr,
        topic,
        task: type === 'learn' ? `学习「${topic}」核心概念并做笔记` : type === 'review' ? `回顾前阶段内容，查漏补缺` : `完成一套模拟题并分析错题`,
        duration: `${dailyMinutes}分钟`,
        type
      });
    }
    return plan;
  },

  _subjectTopics(subject, title) {
    const topicMap = {
      'LEC 法律英语': ['法律术语词汇', '合同条款翻译', '案例分析阅读', '法律写作规范', '真题模拟'],
      '法语': ['基础语法', '日常会话', '听力训练', '阅读理解', '写作练习'],
      '商法学': ['公司法基础', '票据法', '保险法', '证券法', '破产法'],
      '民法学': ['物权法', '债权法', '侵权责任', '人格权', '婚姻继承'],
      '其他': ['核心概念', '重点难点', '例题解析', '拓展应用', '综合复习']
    };
    return topicMap[subject] || topicMap['其他'];
  },

  /* 3. 思维导图：生成知识结构 */
  async generateMindMap(task) {
    const prompt = `请为以下学习内容生成思维导图结构，返回 JSON 格式：
{"title":"主题","children":[{"title":"分支1","children":[{"title":"子节点"}]},{"title":"分支2","children":[]}]}

学习内容：
- 学科：${task.subject}
- 标题：${task.title}
- 备注：${task.note || '无'}`;

    if (this.config.provider === 'online' && this.config.apiKey) {
      try {
        const text = await this._callOnline(prompt, '');
        const cleaned = this._stripCodeFence(text);
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
      } catch (e) {}
    }
    return this._localMindMap(task);
  },

  _localMindMap(task) {
    const subject = task.subject || '学习';
    const topics = this._subjectTopics(subject, task.title);
    return {
      title: task.title,
      children: topics.slice(0, 4).map((t) => ({
        title: t,
        children: [
          { title: '核心概念', children: [] },
          { title: '重点要点', children: [] },
          { title: '典型例题', children: [] }
        ]
      }))
    };
  }
};


AI.loadConfig();
window.AI = AI;
