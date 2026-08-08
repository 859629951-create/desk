/* ============================================
   知识库内容识别 Skill
   专门用于识别社交媒体视频/图文内容并生成结构化总结
   支持：抖音、小红书、微博、微信公众号、知乎、B站等
   ============================================ */

const KbSkill = {

  /* ====== 平台识别规则 ====== */
  platformRules: [
    { key: 'douyin',  name: '抖音',     match: /douyin|iesdouyin|v\.douyin/i, icon: '🎵' },
    { key: 'xhs',     name: '小红书',   match: /xiaohongshu|xhslink/i,        icon: '📕' },
    { key: 'weibo',   name: '微博',     match: /weibo/i,                      icon: '🌊' },
    { key: 'wechat',  name: '微信公众号', match: /mp\.weixin/i,                 icon: '💬' },
    { key: 'zhihu',   name: '知乎',     match: /zhihu/i,                      icon: '💡' },
    { key: 'bilibili',name: '哔哩哔哩', match: /bilibili|b23\.tv/i,           icon: '📺' },
    { key: 'kuaishou',name: '快手',     match: /kuaishou/i,                   icon: '🎬' },
    { key: 'taobao',  name: '淘宝',     match: /taobao|tmall/i,               icon: '🛒' },
    { key: 'jd',      name: '京东',     match: /jd\.com/i,                    icon: '📦' }
  ],

  /* ====== 内容类型识别规则 ====== */
  contentTypeRules: {
    video:      { keywords: ['视频', '播放', '看这个视频', '抖音视频', 'v.douyin'], label: '视频' },
    imageText:  { keywords: ['图文', '图文作品', '笔记', '小红书笔记', '看看【'], label: '图文' },
    article:    { keywords: ['文章', '公众号', '推文', '专栏'], label: '文章' },
    answer:     { keywords: ['回答', '知乎', '问答'], label: '问答' },
    post:       { keywords: ['微博', '动态', '帖子'], label: '动态' }
  },

  /* ====== 内容主题识别规则 ====== */
  topicRules: [
    { category: '美食', keywords: ['咖啡', '餐厅', '美食', '探店', '奶茶', '菜谱', '烘焙', '火锅', '烧烤', '甜品', '面包', '酒吧', '小吃', '早餐', '午餐', '晚餐', '宵夜'] },
    { category: '旅行', keywords: ['旅行', '旅游', '攻略', 'City Walk', 'citywalk', '打卡', '景点', '路线', '出行', '民宿', '酒店', '游记', '出行指南'] },
    { category: '学习', keywords: ['学习', '教程', '课程', '考试', '考研', '干货', '知识', '科普', '方法', '笔记', '总结'] },
    { category: '生活', keywords: ['生活', '居家', '收纳', '装修', '养花', '宠物', '日常', 'vlog', 'Vlog'] },
    { category: '穿搭', keywords: ['穿搭', '搭配', 'OOTD', 'ootd', '服装', '时尚', '潮流', '单品'] },
    { category: '美妆', keywords: ['美妆', '化妆', '护肤', '口红', '粉底', '彩妆', '美容', '面膜'] },
    { category: '健身', keywords: ['健身', '运动', '减肥', '增肌', '瑜伽', '跑步', '训练', '蛋白粉'] },
    { category: '读书', keywords: ['读书', '书评', '推荐书', '阅读', '书单', '摘抄'] },
    { category: '育儿', keywords: ['育儿', '宝宝', '亲子', '早教', '辅食', '孕期'] },
    { category: '职场', keywords: ['职场', '工作', '面试', '简历', '跳槽', '升职', '管理'] },
    { category: '科技', keywords: ['科技', '数码', '手机', '电脑', 'AI', '编程', '软件', 'App', '评测'] },
    { category: '法律', keywords: ['法律', '维权', '合同', '诉讼', '律师', '法规'] }
  ],

  /* ====== 主入口：识别并分析内容 ====== */
  async analyze(rawInput) {
    // Step 0: 检查 AI 是否就绪
    if (!AI.config.apiKey || AI.config.apiKey === 'sk-d253396e05d34dc098d272d27c807398') {
      throw new Error('API_KEY_NOT_CONFIGURED');
    }

    // Step 1: 信息采集
    const collected = await this._collectInfo(rawInput);

    // Step 2: 内容预判
    const preAnalysis = this._preAnalyze(collected);

    // Step 3: AI 深度分析
    const result = await this._aiAnalyze(collected, preAnalysis);

    return result;
  },

  /* 检查 AI 是否可用 */
  isReady() {
    return !!(AI.config.apiKey && AI.config.apiKey !== 'sk-d253396e05d34dc098d272d27c807398');
  },

  /* ====== Step 1: 信息采集 ====== */
  async _collectInfo(rawInput) {
    const urlMatch = rawInput.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : '';
    const platform = this._detectPlatform(url);
    const shareInfo = this._parseShareText(rawInput, platform);

    // 抓取网页内容
    let webContent = null;
    if (url) {
      webContent = await this._fetchUrl(url);
    }

    return {
      rawInput,
      url,
      platform,
      shareInfo,
      webContent
    };
  },

  /* 识别平台 */
  _detectPlatform(url) {
    if (!url) return { key: 'unknown', name: '手动', icon: '📝' };
    for (const rule of this.platformRules) {
      if (rule.match.test(url)) {
        return { key: rule.key, name: rule.name, icon: rule.icon };
      }
    }
    return { key: 'web', name: '网页', icon: '🌐' };
  },

  /* 解析分享文本 */
  _parseShareText(text, platform) {
    const info = {
      author: '',
      contentType: '',
      title: '',
      description: ''
    };

    // 抖音: "8.41 复制打开抖音，看看【哈是琪的图文作品】从前任们传承下来的北京咖啡 https://..."
    if (platform.key === 'douyin') {
      const authorMatch = text.match(/【(.+?)的(.+?)】/);
      if (authorMatch) {
        info.author = authorMatch[1];
        info.contentType = authorMatch[2]; // 图文作品/视频等
      }
      const titleMatch = text.match(/】(.+?)(?:\s+https?|$)/);
      if (titleMatch) info.title = titleMatch[1].trim();
    }

    // 小红书: "38# 小红书笔记 #标题 #标签 https://..."
    if (platform.key === 'xhs') {
      const titleMatch = text.match(/#\s*(.+?)\s*#/);
      if (titleMatch) info.title = titleMatch[1].trim();
    }

    // 微博: 通常 title 在文本开头
    if (platform.key === 'weibo') {
      const lines = text.split('\n').filter(l => l.trim() && !l.includes('http'));
      if (lines.length > 0) info.title = lines[0].substring(0, 50);
    }

    // 通用：如果没有提取到标题，取 URL 前的文本
    if (!info.title) {
      const beforeUrl = text.split(/https?:\/\//)[0].trim();
      if (beforeUrl) {
        // 去掉分享前缀如 "8.41 复制打开抖音，看看【...】"
        const cleaned = beforeUrl.replace(/^\d+\.?\d*\s*复制打开.*?看看【.*?】\s*/, '')
                                  .replace(/^\d+#\s*/, '')
                                  .trim();
        if (cleaned) info.title = cleaned.substring(0, 50);
      }
    }

    // 识别内容类型
    info.contentType = this._detectContentType(text, info);

    return info;
  },

  /* 检测内容类型 */
  _detectContentType(text, shareInfo) {
    if (shareInfo.contentType) return shareInfo.contentType;

    for (const [key, rule] of Object.entries(this.contentTypeRules)) {
      for (const kw of rule.keywords) {
        if (text.includes(kw)) return rule.label;
      }
    }
    return '内容';
  },

  /* 抓取 URL 内容 */
  async _fetchUrl(url) {
    const proxies = [
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
      (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`
    ];

    for (const proxy of proxies) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(proxy(url), { signal: controller.signal });
        clearTimeout(timeout);
        if (!resp.ok) continue;
        const html = await resp.text();
        if (!html || html.length < 100) continue;
        return this._extractFromHtml(html);
      } catch (e) {
        continue;
      }
    }
    return null;
  },

  /* 从 HTML 提取结构化信息 */
  _extractFromHtml(html) {
    let title = '', description = '', bodyText = '', keywords = '';

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) title = titleMatch[1].trim();

    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([\s\S]*?)["']/i);
    if (ogTitleMatch) title = ogTitleMatch[1].trim();

    const descMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([\s\S]*?)["']/i);
    if (descMatch) description = descMatch[1].trim();

    const kwMatch = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([\s\S]*?)["']/i);
    if (kwMatch) keywords = kwMatch[1].trim();

    // 提取 JSON-LD 结构化数据
    let structuredData = '';
    const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        const jsonStr = match.replace(/<[^>]+>/g, '').trim();
        try {
          const data = JSON.parse(jsonStr);
          if (data.description) structuredData += data.description + '\n';
          if (data.text) structuredData += data.text + '\n';
          if (data.articleBody) structuredData += data.articleBody + '\n';
        } catch (e) {}
      }
    }

    // 提取正文
    bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/\s+/g, ' ')
      .trim();

    if (bodyText.length > 4000) bodyText = bodyText.substring(0, 4000);

    return { title, description, keywords, bodyText, structuredData };
  },

  /* ====== Step 2: 内容预判（本地规则引擎） ====== */
  _preAnalyze(collected) {
    const { rawInput, platform, shareInfo, webContent } = collected;
    const allText = `${shareInfo.title} ${shareInfo.description} ${webContent?.title || ''} ${webContent?.description || ''} ${webContent?.bodyText?.substring(0, 500) || ''} ${rawInput}`;

    // 预判分类
    let category = '其他';
    let maxScore = 0;
    for (const rule of this.topicRules) {
      let score = 0;
      for (const kw of rule.keywords) {
        if (allText.includes(kw)) score++;
      }
      if (score > maxScore) {
        maxScore = score;
        category = rule.category;
      }
    }

    // 预判内容类型
    const contentType = shareInfo.contentType || this._detectContentType(allText, {});

    // 预判是否为盘点/合集类内容
    const isCollection = /盘点|合集|清单|推荐|多家|系列|路线|攻略/.test(allText);

    // 预判是否为探店类
    const isShopReview = /店|咖啡|餐厅|探店|打卡|地址|位于/.test(allText);

    return {
      category,
      contentType,
      isCollection,
      isShopReview,
      platform: platform.name,
      platformIcon: platform.icon,
      author: shareInfo.author,
      title: shareInfo.title || webContent?.title || ''
    };
  },

  /* ====== Step 3: AI 深度分析 ====== */
  async _aiAnalyze(collected, pre) {
    const { rawInput, url, platform, shareInfo, webContent } = collected;

    // 构建上下文
    let context = `【待分析内容】\n\n`;
    context += `用户输入：${rawInput}\n`;
    context += `来源平台：${platform.name}\n`;
    context += `内容类型：${pre.contentType}\n`;

    if (shareInfo.author) context += `作者：${shareInfo.author}\n`;
    if (shareInfo.title) context += `标题：${shareInfo.title}\n`;

    if (webContent) {
      context += `\n【网页元信息】\n`;
      if (webContent.title) context += `网页标题：${webContent.title}\n`;
      if (webContent.description) context += `网页描述：${webContent.description}\n`;
      if (webContent.keywords) context += `关键词：${webContent.keywords}\n`;
      if (webContent.structuredData) context += `结构化数据：${webContent.structuredData}\n`;
      if (webContent.bodyText) {
        context += `\n【正文内容】\n${webContent.bodyText}\n`;
      }
    } else if (url) {
      context += `\n（未能抓取到网页正文，请根据分享文本中的标题、作者、平台信息进行合理推断分析）\n`;
    }

    // 预判提示
    context += `\n【系统预判】\n`;
    context += `分类：${pre.category}\n`;
    context += `内容类型：${pre.contentType}\n`;
    if (pre.isCollection) context += `可能是盘点/合集类内容\n`;
    if (pre.isShopReview) context += `可能是探店/店铺测评类内容\n`;

    // 构建提示词
    const prompt = this._buildPrompt(pre);

    let resp;
    try {
      resp = await AI._callOnline(prompt, context);
    } catch (e) {
      // 将 API 错误转换为更明确的消息
      if (e.message.includes('401') || e.message.includes('Authentication') || e.message.includes('invalid')) {
        throw new Error('API_KEY_INVALID');
      }
      if (e.message.includes('429') || e.message.includes('rate')) {
        throw new Error('API_RATE_LIMIT');
      }
      if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
        throw new Error('NETWORK_ERROR');
      }
      throw e;
    }

    const cleaned = AI._stripCodeFence(resp);
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI 返回格式异常');

    let info = JSON.parse(match[0]);

    // 兜底
    info.title = info.title || `${platform.name}${pre.contentType}《${shareInfo.title || '未知内容'}》内容总结`;
    info.summary = info.summary || '';
    info.keyPoints = info.keyPoints || '';
    info.category = info.category || pre.category;
    info.tags = info.tags || [];
    info.source = info.source || platform.name;

    return info;
  },

  /* 根据预判结果构建精准提示词 */
  _buildPrompt(pre) {
    let prompt = `你是一个专业的内容分析编辑。请对上述内容进行深度分析，生成详细的结构化总结。

返回 JSON 格式（只返回 JSON，不要任何其他文字）：
{
  "title": "标题",
  "summary": "内容概述",
  "keyPoints": "详细内容总结",
  "category": "分类",
  "tags": ["标签"],
  "source": "${pre.platform}"
}

═══ 字段要求 ═══

【title】格式：${pre.platform}${pre.contentType}《原标题》+ 总结类型
示例：抖音图文《从前任们传承下来的北京咖啡》店铺内容总结
示例：小红书笔记《成都三日游攻略》旅行路线总结
示例：微信公众号《2024考研政治复习规划》学习干货总结

【summary】100-200字，概括内容核心主题和价值点。
说明这篇内容在讲什么、覆盖了哪些方面、适合什么人群。

【keyPoints】这是最重要的字段，必须详细具体。

`;

    // 根据预判内容类型，给出不同的 keyPoints 格式要求
    if (pre.isShopReview && pre.category === '美食') {
      prompt += `本次内容为探店/美食类，keyPoints 按以下格式输出：

一、各店铺详情

1. 店铺名称（分店名）
位置：具体地址或所在片区
环境：装修风格、座位情况、观景特色等
招牌推荐：具体推荐饮品/菜品名称，描述口味特点、风味层次
适合场景：如 City Walk 顺路打卡、久坐办公、外带等
博主评价：博主的具体评价和推荐理由

2. 店铺名称（分店名）
...（同上格式，逐个列出）

二、顺带提及的其他店铺/品牌
（如有非主要内容但提到的其他店铺，简要列出）

整体总结
总结这份内容覆盖的区域范围、店铺特点、适合人群等

每个店铺必须包含：店名、位置、招牌推荐、特点描述，不能笼统概括。`;
    } else if (pre.isCollection && pre.category === '旅行') {
      prompt += `本次内容为旅行攻略/路线类，keyPoints 按以下格式输出：

一、路线概览
出发地 → 途经点 → 目的地，总时长/距离

二、各打卡点详情

1. 地点名称
位置/交通：具体地址、到达方式
特色：这个地方有什么特别之处
建议：最佳时间、注意事项、花费

2. 地点名称
...（同上格式）

三、实用信息
交通方式、住宿建议、花费预算、注意事项等

整体总结
这条路线的亮点、适合人群、最佳季节等`;
    } else if (pre.category === '学习') {
      prompt += `本次内容为学习/知识类，keyPoints 按以下格式输出：

一、核心概念
列出内容涉及的核心知识点或概念

二、关键要点
1. 要点标题
   详细说明，包含具体方法和步骤

2. 要点标题
   ...（同上格式）

三、实操建议
具体可操作的步骤、工具推荐、注意事项

整体总结
这份内容的价值、适合人群、学习建议`;
    } else if (pre.isCollection) {
      prompt += `本次内容为盘点/合集类，keyPoints 按以下格式输出：

一、各条目详情

1. 条目名称
特点：具体描述
推荐理由：为什么推荐
适用场景：适合什么情况使用

2. 条目名称
...（同上格式，逐个列出）

二、整体总结
这份盘点覆盖的范围、各条目共性特点、选择标准`;
    } else {
      prompt += `本次内容为${pre.category}类，keyPoints 按以下格式输出：

一、核心信息
提取内容的主题和关键信息点

二、详细要点
1. 要点标题
   详细说明，包含具体信息

2. 要点标题
   ...（同上格式）

三、实用建议
可操作的建议、注意事项

整体总结
内容的核心价值、适合人群`;
    }

    prompt += `

═══ 关键要求 ═══
1. keyPoints 必须包含具体的名称、地点、价格、时间等可操作信息
2. 如果内容提到多个店铺/地点/产品，必须逐个列出，不能合并概括
3. 如果网页正文内容不足，结合标题、作者、平台等信息合理推断
4. 标题必须包含平台名和内容类型，格式：平台+类型《原标题》+总结类型
5. 多个条目用编号 1. 2. 3. 排列，每条之间空行分隔
6. 分类从以下选择：美食、旅行、学习、生活、穿搭、美妆、健身、读书、育儿、职场、科技、法律、其他

【category】从以上分类中选最合适的一个
【tags】3-5个相关标签`;

    return prompt;
  }
};

window.KbSkill = KbSkill;
