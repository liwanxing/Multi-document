export type DocAppearance = {
  theme: "classic" | "ocean" | "forest" | "ink";
  density: "comfortable" | "compact";
};
export const defaultAppearance: DocAppearance = {
  theme: "classic",
  density: "comfortable",
};
export const stylePresets = [
  {
    id: "classic",
    name: "经典文档",
    description: "清晰中性，适合产品说明",
    color: "#2563eb",
  },
  {
    id: "ocean",
    name: "海洋蓝",
    description: "蓝色标题，适合开发指南",
    color: "#087f8c",
  },
  {
    id: "forest",
    name: "松林绿",
    description: "温和沉稳，适合操作手册",
    color: "#247454",
  },
  {
    id: "ink",
    name: "极简墨色",
    description: "克制留白，适合规范与说明",
    color: "#343b48",
  },
] as const;
export const components = [
  {
    id: "badge",
    name: "状态徽章",
    group: "内容强调",
    icon: "check",
    description: "标记接口方法或内容状态",
    snippet: '<Badge type="post">POST</Badge> 接口说明',
  },
  {
    id: "quote",
    name: "引用内容",
    group: "内容强调",
    icon: "info",
    description: "突出引用与补充信息",
    snippet: "> 在这里填写引用内容。",
  },
  {
    id: "keyboard",
    name: "快捷键",
    group: "技术内容",
    icon: "code",
    description: "清晰展示键盘操作",
    snippet: "按 <kbd>Ctrl</kbd> + <kbd>S</kbd> 保存文档。",
  },
  {
    id: "note",
    name: "信息提示",
    group: "内容强调",
    icon: "info",
    description: "补充说明与背景信息",
    snippet:
      "> [!NOTE] 说明\n> 在这里补充说明，支持 **加粗** 和 [链接](https://example.com/请替换为目标链接)。",
  },
  {
    id: "tip",
    name: "成功 / 建议",
    group: "内容强调",
    icon: "check",
    description: "最佳实践与推荐操作",
    snippet: "> [!TIP] 最佳实践\n> 在这里填写建议。",
  },
  {
    id: "warning",
    name: "注意事项",
    group: "内容强调",
    icon: "warning",
    description: "重要限制与操作风险",
    snippet: "> [!WARNING] 注意事项\n> 操作前请确认相关条件。",
  },
  {
    id: "tabs",
    name: "多语言代码",
    group: "技术内容",
    icon: "tabs",
    description: "切换语言并复制示例",
    snippet:
      ':::tabs\n```curl\ncurl https://api.example.com/请替换为接口地址\n```\n```python\nprint("Hello, world!")\n```\n:::',
  },
  {
    id: "table",
    name: "参数表格",
    group: "技术内容",
    icon: "table",
    description: "整理参数、类型与说明",
    snippet:
      "| 参数 | 类型 | 必填 | 说明 |\n| --- | --- | --- | --- |\n| name | string | 是 | 名称 |\n| limit | number | 否 | 返回数量 |",
  },
  {
    id: "mermaid",
    name: "流程图",
    group: "技术内容",
    icon: "flow",
    description: "用节点描述业务流程",
    snippet:
      "```mermaid\nflowchart LR\n  A[开始] --> B[处理请求]\n  B --> C{是否成功}\n  C -->|是| D[返回结果]\n  C -->|否| E[重试]\n```",
  },
  {
    id: "math",
    name: "数学公式",
    group: "技术内容",
    icon: "math",
    description: "支持行内和独立公式",
    snippet: "$$\nE = mc^2\n$$",
  },
  {
    id: "details",
    name: "折叠面板",
    group: "页面结构",
    icon: "details",
    description: "收纳常见问题和补充内容",
    snippet:
      ":::details 常见问题\n在这里填写回答，支持 **Markdown** 格式。\n:::",
  },
  {
    id: "compare",
    name: "双栏对比",
    group: "页面结构",
    icon: "columns",
    description: "展示输入与输出结果",
    snippet:
      ":::compare\n### 输入\n填写输入内容。\n### 输出\n填写输出结果。\n:::",
  },
  {
    id: "steps",
    name: "操作步骤",
    group: "页面结构",
    icon: "list",
    description: "按顺序组织操作流程",
    snippet:
      "### 第一步：准备环境\n填写准备事项。\n\n### 第二步：开始操作\n填写具体步骤。\n\n### 第三步：验证结果\n填写预期结果。",
  },
  {
    id: "cards",
    name: "导航卡片组",
    group: "卡片与导航",
    icon: "cards",
    description: "多列卡片网格，用于入门引导与推荐链接",
    snippet:
      ":::cards\n### [快速入门指南](/docs/请替换为文档路径)\n为零基础用户设计的快速入门引导\n\n### [功能特性说明](/docs/请替换为文档路径)\n极简配置，协同完成相关开发\n\n### [进阶方案指南](/docs/请替换为文档路径)\n一站式开发方案，快速搭建专属应用\n:::",
  },
  {
    id: "features",
    name: "特性亮点卡片",
    group: "卡片与导航",
    icon: "sparkles",
    description: "蓝色标题与要点列表，展示产品更新与能力",
    snippet:
      ":::features\n### 生成视频时长翻倍\n- 生成视频时长上限由 15 秒延长至 30 秒。\n\n### 参考素材数量增加\n- 参考图数量上限由 9 张增至 30 张，\n- 参考音/视频数量上限由 3 个增至 10 个\n- 参考音/视频总时长由 15 秒增至 30 秒\n\n### 更智能的宽高比/时长控制\n- 视频编辑任务，自动保持输出视频的宽高比、时长和输入视频一致。\n- 视频延长、首帧/首尾帧任务，自动保持输出视频的宽高比和输入视频一致。\n\n### 新增 mov 输出格式\n- 输出视频新增 mov 格式（H.264 视频编码 + yuv444p 色度采样 + PCM 音频编码），提升视频编辑和视频延长场景下的色彩保真度与声画一致性。\n\n### 原生多语言\n- 支持中文、英语、西班牙语、印度尼西亚语、马来语、泰语、阿拉伯语、葡萄牙语、越南语、日语、韩语等 11 种语言。\n:::",
  },
  {
    id: "prompt-preview",
    name: "提示词生图对比",
    group: "AI与多模态",
    icon: "split",
    description: "提示词与单项生图效果左右对比展示",
    snippet:
      ":::prompt-preview\n### 提示词\n充满活力的特写编辑肖像，模特眼神犀利，头戴雕塑感帽子，色彩拼接丰富，眼部焦点锐利，景深较浅，具有Vogue杂志封面的美学风格，采用中画幅拍摄，工作室灯光效果强烈。\n\n### 输出预览\n![模特肖像](https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80)\n:::",
  },
  {
    id: "video-grid",
    name: "视频媒体网格",
    group: "AI与多模态",
    icon: "video",
    description: "多列媒体矩阵，带播放遮罩与弹窗播放",
    snippet:
      ":::video-grid cols=3\n![万花筒效果](https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=500&q=80)\n![排扣静物](https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500&q=80)\n![草莓旋转](https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=500&q=80)\n![水滴飞溅](https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=500&q=80)\n![金扣漂浮](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80)\n![纽扣散落](https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=500&q=80)\n:::",
  },
  {
    id: "multimodal",
    name: "多模态生成展示",
    group: "AI与多模态",
    icon: "layers",
    description: "输入多模态素材与生成效果矩阵综合对比",
    snippet:
      ":::multimodal\n### 输入: 文本 + 1 张图片 + 6 段视频\n![输入图片](https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80)\n\n> 提示词: 明亮多彩的广告片风格，果味饼干为主角...（详见下方代码示例中的完整提示词）\n\n### 输出\n:::video-grid cols=3\n![万花筒效果](https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=400&q=80)\n![排扣静物](https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80)\n![草莓旋转](https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80)\n![水滴飞溅](https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80)\n![金扣漂浮](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80)\n![纽扣散落](https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80)\n:::\n:::",
  },
  {
    id: "storyboard",
    name: "分镜脚本展示",
    group: "AI与多模态",
    icon: "storyboard",
    description: "带行号分镜脚本、故事板大图与参考素材条",
    snippet:
      ":::storyboard\n### 脚本\n素材绑定: 故事板分镜@图片1, 卧室@图片2, 李天@图片3, 李倩@图片4, 《快快乐乐》书籍@图片5。\n镜头一:\n【全景固定镜头，平视三分构图】冬夜落雪房间，落地窗前，男子双手插裤兜侧立望向窗外飞雪，少女站在身侧静静看向男子，氛围安静克制，雪花持续落在玻璃窗。\n镜头二:\n【中景过肩镜头】少女后背作为前景，男子转头温和看向少女，少女微微低头沉默，窗外落雪持续。\n镜头三:\n【中近景，对角线构图】男子捧着书籍《快快乐乐》缓缓递出，少女抬手接过书本。\n镜头四:\n【少女面部近景，中心构图】少女把书本抱紧在胸口，眼眶泛红，泪珠缓缓滑落，神色感伤。\n镜头五:\n【男子面部近景，斜向构图】男子温柔浅笑，静静注视落泪少女，眼底带着怅然。\n镜头六:\n【全景固定镜头】少女转身缓步走出画面，窗前只剩男子独自伫立，双手插兜望向漫天风雪，房间空旷寂静。\n\n### 主预览图\n![故事板分镜](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80)\n\n### 参考素材\n- ![卧室](https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=200&q=80)\n- ![李天](https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80)\n- ![李天背影](https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80)\n- ![李倩](https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80)\n- ![书籍封面](https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=200&q=80)\n:::",
  },
  {
    id: "keyframes",
    name: "关键帧画廊",
    group: "AI与多模态",
    icon: "keyframes",
    description: "时序提示词与多列关键帧图片画廊",
    snippet:
      ":::keyframes\n> 示例: 「以图片 1 至图片 7 的顺序作为关键帧，在云海群山间，蓝粉长尾灵鱼凌空遨游，镜头缓缓推向依山而建的古镇，聚焦山顶古塔；画面一转进入雅致中式厅堂，灵鱼穿窗飞入，落入厅堂中央圆池悠然游动；最终视角切至幽暗古寺，白须老僧背对而立，静静凝望巨幅画框，画内正是厅堂与池中灵鱼，新国风浮世绘插画风格」\n\n![图片 1](https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=400&q=80)\n![图片 2](https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80)\n![图片 3](https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80)\n![图片 4](https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80)\n![图片 5](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80)\n![图片 6](https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80)\n![图片 7](https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80)\n:::",
  },
  {
    id: "file",
    name: "附件下载卡片",
    group: "页面结构",
    icon: "file",
    description: "文档或文件下载卡片，支持文件名与下载触发",
    snippet:
      ":::file [示例附件文件.zip](https://example.com/请替换为文件下载地址) 2.4 MB\n:::",
  },
  {
    id: "banner-cards",
    name: "大图卡片组",
    group: "卡片与导航",
    icon: "presentation",
    description: "横向大图展示卡片，适合推荐重点模型与解决方案",
    snippet:
      ":::banner-cards cols=3\n### [重点方案推荐 1](/docs/请替换为文档路径)\n![Banner](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80)\n推荐核心能力或重点方案说明\n高保真呈现，全场景覆盖\n\n### [重点方案推荐 2](/docs/请替换为文档路径)\n![Banner](https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80)\n最新版本特性与功能模型\n持续迭代，优化核心体验\n\n### [重点方案推荐 3](/docs/请替换为文档路径)\n![Banner](https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80)\n行业级解决方案与最佳实践\n高效可靠，开箱即用\n:::",
  },
  {
    id: "capabilities",
    name: "能力矩阵列表",
    group: "AI与多模态",
    icon: "grid",
    description: "双列功能特性矩阵，支持中文图标名、图片网址与跳转链接",
    snippet:
      ":::capabilities\n## 基础使用\n了解功能使用方法、限制以及常见场景的示例说明。\n\n- 图标: 深度思考\n  标题: 深度思考\n  链接: /docs/请替换为对应文档路径\n  说明: 先思考再回答，质量显著提升\n\n- 图标: 视频生成\n  标题: 视频生成\n  链接: /docs/请替换为对应文档路径\n  说明: 生成高清流畅的影视级视频\n\n- 图标: 图片理解\n  标题: 图片理解\n  链接: /docs/请替换为对应文档路径\n  说明: 接收图片，根据图片信息回复\n\n- 图标: 图片生成\n  标题: 图片生成\n  链接: /docs/请替换为对应文档路径\n  说明: 基于图文，生成高质量图片\n\n- 图标: 视频理解\n  标题: 视频理解\n  链接: /docs/请替换为对应文档路径\n  说明: 接收视频，根据视频信息回复\n\n- 图标: 联网搜索\n  标题: 联网搜索\n  链接: /docs/请替换为对应文档路径\n  说明: 联网获取实时知识\n\n- 图标: 文档理解\n  标题: 文档理解\n  链接: /docs/请替换为对应文档路径\n  说明: 接收 PDF，根据文档信息回复\n\n- 图标: 函数调用\n  标题: 函数调用\n  链接: /docs/请替换为对应文档路径\n  说明: 调用自定义工具，增强模型能力\n:::",
  },
  {
    id: "pro-table",
    name: "规范数据表格",
    group: "技术内容",
    icon: "table-pro",
    description: "浅蓝表头、细分割线、规整排版的版本变更与参数规范表格",
    snippet:
      ":::pro-table\n| 变更 | 说明 | 发布时间 |\n| :--- | :--- | :---: |\n| 命中意图播报当前节点内容 | 新增命中某一对话意图重复播报当前节点话术内容，应答更丰富。 | 2022-11-28 |\n| 命中特定意图打断播报 | 新增命中特定意图后才可打断当前节点播报，针对性打断更贴切。 | 2022-11-28 |\n| 合成音色拼接真人录音播报 | 新增TTS合成预输入信息部分与真人录音音频进行拼接播报，提升录音话术交付效率。 | 2022-11-23 |\n| 下单自动开通权限 | 支持下单后自动开启任务模块权限，无需等待。 | 2022-11-07 |\n| 前端优化 | 新增已查看状态标示，通话ID支持一键复制。 | 2022-11-03 |\n:::",
  },
  {
    id: "api-explorer",
    name: "API Explorer",
    group: "技术内容",
    icon: "api-explorer",
    description: "展示 API Explorer 在线发起调用入口与去调试按钮",
    snippet:
      ":::api-explorer\n### API Explorer\n您可以通过 API Explorer 在线发起调用，无需关注签名生成过程，快速获取调用结果。\n[去调试](https://example.com/请替换为API调试地址)\n:::",
  },
  {
    id: "api-params",
    name: "请求参数列表",
    group: "技术内容",
    icon: "api-params",
    description: "带类型标签、必选状态、new 角标与折叠详情的接口参数列表",
    snippet:
      ":::api-params\n## 请求参数\n### Body 参数\n\n- 参数: model\n  类型: string\n  必填: 必选\n  简述: 模型 ID\n  说明: 您需要调用的服务或模型的标识 ID。[开通服务](https://example.com/请替换为服务开通地址) 后可 [查询标识 ID](https://example.com/请替换为参数查询文档)。\n  补充: 您也可通过接入端点调用，获得限流、监控等高级能力，可参考 [接入指南](https://example.com/请替换为接入指南文档)。\n\n- 参数: content\n  类型: object[]\n  必填: 必选\n  简述: 输入内容列表\n  说明: 输入给模型的内容列表，支持文本、图片、视频等多模态数据项。\n  > [!NOTE]\n  > 单次请求内容项最多不超过 20 个。\n  ```json\n  [\n    {\n      \"type\": \"text\",\n      \"text\": \"你好，请介绍一下你自己\"\n    }\n  ]\n  ```\n\n- 参数: omni_reference_task_type\n  标签: new\n  类型: string\n  必填: 默认值 auto\n  简述: 任务类型引导\n  说明: 全模态参考任务类型引导策略，默认值为 auto。\n\n- 参数: resolution\n  类型: string\n  简述: 视频分辨率\n  说明: 指定输出视频的分辨率规格，例如 720p 或 1080p。\n:::",
  },
];
