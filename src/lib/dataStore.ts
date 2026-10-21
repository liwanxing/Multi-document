import fs from "fs";
import path from "path";
import crypto from "crypto";
import { migrateHierarchy } from "./migrateHierarchy";
import { AdminUser, SafeAdminUser, Role, RoleDefinition, Permission, toSafeUser } from "./authTypes";
import { hashPassword } from "./authCrypto";

export interface Category {
  id: string;
  name: string;
  products: Product[];
}

export interface Product {
  id: string;
  code: string; // e.g. "ark"
  name: string; // e.g. "中广云方舟"
  categoryId: string;
  description: string;
}

export interface CodeTabItem {
  language: string;
  syntax: string;
  code: string;
}

export interface DocTreeNode {
  id: string;
  title: string;
  slug: string;
  type: "folder" | "doc";
  children?: DocTreeNode[];
  status?: "published" | "draft";
}

export interface DocCategory {
  icon?: string;
  hidden?: boolean;
  id: string;
  name: string;
  parentId: string | null;
}
export interface ProjectProduct {
  media?: { url: string; type: "image" | "video" };
  id: string;
  slug: string;
  name: string;
  description: string;
  group: string;
  categories: DocCategory[];
  docOrder?: string[];
}
export interface DocPlacement {
  projectId: string;
  productId: string;
  categoryId: string | null;
}
export interface DocRevision {
  id: string;
  docId: string;
  version: number;
  title: string;
  publishedAt: string;
  summary: string;
  changes: string[];
  placements: DocPlacement[];
  content: string;
  appearance?: import("./editor").DocAppearance;
  baseline?: boolean;
}
export interface ProjectCustomField {
  /** 变量名：文档里用 {{key}} 引用，限字母/数字/下划线 */
  key: string;
  /** 显示名：后台表单里给人看的说明 */
  label: string;
  /** 变量值：按项目渲染时替换进文档 */
  value: string;
}
export interface Project {
  brandName?: string;
  groupIcons?: Record<string,string>;
  productGroups?: string[];
  hiddenProductGroups?: string[];
  company?: string;
  /** 项目自定义字段/变量，文档里可用 {{key}} 引用 */
  customFields?: ProjectCustomField[];
  products?: ProjectProduct[];
  id: string;
  slug: string;
  name: string;
  description: string;
  updatedAt: string;
}

export interface DocDetail {
  hidden?: boolean;
  placements?: DocPlacement[];
  changeNote?: string;
  projectIds?: string[];
  appearance?: import("./editor").DocAppearance;
  id: string;
  productId: string;
  slug: string;
  title: string;
  description?: string;
  breadcrumbs: string[];
  updatedAt: string;
  status: "published" | "draft";
  version: number;
  content: string; // Pure Markdown source content
}

// File persistence path
const DATA_FILE = path.join(process.cwd(), "data", "store.json");

const initialCategories: Category[] = [
  {
    id: "ai",
    name: "人工智能与算法",
    products: [
      {
        id: "p-ark",
        code: "ark",
        name: "中广云方舟",
        categoryId: "ai",
        description:
          "方舟提供模型推理、微调、评测等全流程服务，帮助您快速构建大模型应用。",
      },
      {
        id: "p-trans",
        code: "trans",
        name: "机器翻译",
        categoryId: "ai",
        description: "基于海量数据的深度学习翻译技术，支持百余种语言互译。",
      },
      {
        id: "p-content-custom",
        code: "content_custom",
        name: "内容定制",
        categoryId: "ai",
        description: "面向企业业务场景的内容精准生成与智能定制服务。",
      },
      {
        id: "p-matrix",
        code: "matrix",
        name: "矩阵管家",
        categoryId: "ai",
        description: "多账号矩阵一站式内容分发与智能资产管理运营平台。",
      },
      {
        id: "p-rec",
        code: "rec",
        name: "智能推荐平台",
        categoryId: "ai",
        description: "字节跳动同款推荐算法与架构，快速构建个性化推荐系统。",
      },
      {
        id: "p-ml",
        code: "ml",
        name: "机器学习平台",
        categoryId: "ai",
        description: "一站式模型开发、训练、托管和部署平台。",
      },
      {
        id: "p-audio",
        code: "audio",
        name: "音频技术",
        categoryId: "ai",
        description: "领先的语音降噪、音频分离、音质增强与音频理解技术。",
      },
      {
        id: "p-kickart",
        code: "kickart",
        name: "Kickart",
        categoryId: "ai",
        description: "智能图像创意合成与视觉设计工作流。",
      },
      {
        id: "p-risk",
        code: "risk",
        name: "业务风险识别",
        categoryId: "ai",
        description: "全方位防护账号安全、反作弊、营销反欺诈与内容合规。",
      },
      {
        id: "p-doubao-voice",
        code: "doubao_speech",
        name: "豆包语音",
        categoryId: "ai",
        description: "自然拟真的人声合成、高准确率语音识别与双工通话。",
      },
      {
        id: "p-viking",
        code: "viking_db",
        name: "向量数据库VikingDB",
        categoryId: "ai",
        description: "高可用、千亿级高性能企业向量检索引擎，专为RAG应用打造。",
      },
    ],
  },
  {
    id: "compute",
    name: "计算",
    products: [
      {
        id: "p-ecs",
        code: "ecs",
        name: "云服务器",
        categoryId: "compute",
        description: "弹性计算实例，提供卓越计算性能与高可用网络。",
      },
      {
        id: "p-gpu",
        code: "gpu",
        name: "GPU云服务器",
        categoryId: "compute",
        description:
          "搭载最新高性能加速卡，为深度学习与大模型训练提供澎湃算力。",
      },
      {
        id: "p-as",
        code: "as",
        name: "弹性伸缩",
        categoryId: "compute",
        description:
          "根据业务需求自动调整计算资源，保障业务平稳运行并节省成本。",
      },
    ],
  },
  {
    id: "storage",
    name: "存储",
    products: [
      {
        id: "p-tos",
        code: "tos",
        name: "对象存储 TOS",
        categoryId: "storage",
        description: "海量、安全、低成本的高可靠云端对象存储服务。",
      },
    ],
  },
  {
    id: "database",
    name: "数据库",
    products: [
      {
        id: "p-vecloud-db",
        code: "ve_mysql",
        name: "云数据库 MySQL",
        categoryId: "database",
        description: "高可用、强一致性的企业级关系型数据库。",
      },
    ],
  },
  {
    id: "container",
    name: "容器与中间件",
    products: [
      {
        id: "p-vke",
        code: "vke",
        name: "容器服务 VKE",
        categoryId: "container",
        description: "完全兼容 Kubernetes 规范的高性能容器托管集群服务。",
      },
    ],
  },
  {
    id: "network",
    name: "网络",
    products: [
      {
        id: "p-vpc",
        code: "vpc",
        name: "私有网络 VPC",
        categoryId: "network",
        description: "隔离的虚拟网络环境，提供弹性的网络路由与安全策略。",
      },
    ],
  },
  {
    id: "video",
    name: "视频云",
    products: [
      {
        id: "p-vod",
        code: "vod",
        name: "视频点播",
        categoryId: "video",
        description: "端到端音视频上传、智能转码、分发播放与版权保护服务。",
      },
    ],
  },
  {
    id: "cdn",
    name: "CDN与边缘",
    products: [
      {
        id: "p-cdn-serv",
        code: "cdn_serv",
        name: "内容分发网络 CDN",
        categoryId: "cdn",
        description: "全球海量加速节点，显著降低网络访问延迟。",
      },
    ],
  },
  {
    id: "bigdata",
    name: "大数据",
    products: [
      {
        id: "p-las",
        code: "las",
        name: "湖仓一体分析服务 LAS",
        categoryId: "bigdata",
        description: "海量数据秒级交互式查询与全托管大数据计算引擎。",
      },
    ],
  },
  {
    id: "security",
    name: "安全",
    products: [
      {
        id: "p-waf",
        code: "waf",
        name: "Web应用防火墙 WAF",
        categoryId: "security",
        description: "智能拦截SQL注入、XSS、WebShell等常见网络攻击。",
      },
    ],
  },
  {
    id: "enterprise",
    name: "企业应用",
    products: [
      {
        id: "p-id",
        code: "iam",
        name: "访问控制 IAM",
        categoryId: "enterprise",
        description: "细粒度管理云资源的访问身份与权限授权。",
      },
    ],
  },
  {
    id: "support",
    name: "服务支持",
    products: [
      {
        id: "p-tickets",
        code: "ticket",
        name: "工单系统",
        categoryId: "support",
        description: "7x24 小时技术专家团队响应与问题追踪服务。",
      },
    ],
  },
];

const initialArkTree: DocTreeNode[] = [
  {
    id: "group-entry",
    title: "入门",
    slug: "entry",
    type: "folder",
    children: [
      {
        id: "doc-intro",
        title: "产品简介",
        slug: "product-intro",
        type: "doc",
        status: "published",
      },
      {
        id: "doc-quickstart",
        title: "快速入门",
        slug: "quick-start",
        type: "doc",
        status: "published",
      },
      {
        id: "doc-pricing",
        title: "模型价格",
        slug: "pricing",
        type: "doc",
        status: "published",
      },
      {
        id: "doc-agent-practice",
        title: "Agent 场景模型调用的正确姿势",
        slug: "agent-best-practice",
        type: "doc",
        status: "published",
      },
      {
        id: "doc-migrate-sdk",
        title: "迁移到方舟官方 SDK",
        slug: "migrate-sdk",
        type: "doc",
        status: "published",
      },
    ],
  },
  {
    id: "group-model",
    title: "模型",
    slug: "model",
    type: "folder",
    children: [
      {
        id: "doc-models",
        title: "模型列表",
        slug: "model-list",
        type: "doc",
        status: "published",
      },
      {
        id: "doc-seed-evolving",
        title: "Seed-Evolving",
        slug: "seed-evolving",
        type: "doc",
        status: "published",
      },
      {
        id: "doc-deepseek-flash",
        title: "DeepSeek-V4.1-Flash",
        slug: "deepseek-v4-flash",
        type: "doc",
        status: "published",
      },
    ],
  },
  {
    id: "group-invoke",
    title: "调用",
    slug: "invoke",
    type: "folder",
    children: [
      {
        id: "doc-text-gen",
        title: "文本生成",
        slug: "text-generation",
        type: "doc",
        status: "published",
      },
      {
        id: "folder-multimodal",
        title: "多模态理解",
        slug: "multimodal",
        type: "folder",
        children: [
          {
            id: "doc-image-understanding",
            title: "图片理解",
            slug: "image-understanding",
            type: "doc",
            status: "published",
          },
          {
            id: "doc-video-understanding",
            title: "视频理解",
            slug: "video-understanding",
            type: "doc",
            status: "published",
          },
          {
            id: "doc-file-understanding",
            title: "文档理解",
            slug: "doc-understanding",
            type: "doc",
            status: "published",
          },
          {
            id: "doc-audio-understanding",
            title: "音频理解",
            slug: "audio-understanding",
            type: "doc",
            status: "published",
          },
        ],
      },
      {
        id: "doc-video-gen",
        title: "视频生成",
        slug: "video-generation",
        type: "doc",
        status: "published",
      },
      {
        id: "doc-image-gen",
        title: "图片生成",
        slug: "image-generation",
        type: "doc",
        status: "published",
      },
      {
        id: "doc-domain-model",
        title: "领域模型",
        slug: "domain-models",
        type: "doc",
        status: "published",
      },
      {
        id: "doc-tools",
        title: "工具调用",
        slug: "tool-calling",
        type: "doc",
        status: "published",
      },
      {
        id: "doc-advanced",
        title: "进阶使用",
        slug: "advanced",
        type: "doc",
        status: "published",
      },
      {
        id: "doc-thirdparty",
        title: "接入三方工具",
        slug: "third-party",
        type: "doc",
        status: "published",
      },
    ],
  },
];

const imageUnderstandingMarkdown = `部分大模型具备图片视觉理解能力，支持本地文件和图片 URL 方式传入图片，适用于图片描述、分类、视觉定位等场景。

> [!NOTE]
> 说明：方舟平台的新用户？获取 API Key 及 开通模型等准备工作，请参见 [快速入门](#)。

## 快速开始

通过图片 URL 方式传入模型体验图片理解效果。Responses API 示例代码如下。

:::compare
### 输入
支持输入图片的模型系列是哪个？
### 输出预览
• 思考：用户现在需要找支持输入图片的大模型系列，看表格里的输入列中的图片那一行。表格里系列Doubao-Seed-1.8对应输入图片列是√，其他DeepSeek-V3.2和GLM-4.7对应的输入图片都是×，所以答案应该是Doubao-Seed-1.8。
• 回答：支持输入图片的模型系列是 Doubao-Seed-1.8。
:::

:::tabs
\`\`\`curl
curl https://ark.cn-beijing.volces.com/api/v3/responses \\
  -H "Authorization: Bearer $ARK_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "doubao-seed-2-1-pro-260628",
    "input": [
      {
        "role": "user",
        "content": [
          {
            "type": "input_image",
            "image_url": "https://ark-project.tos-cn-beijing.volces.com/doc_image/ark_demo_img_1.png"
          },
          {
            "type": "input_text",
            "text": "支持输入图片的模型系列是哪个？"
          }
        ]
      }
    ]
  }'
\`\`\`
\`\`\`python
import os
from volcenginesdkarkruntime import Ark

client = Ark(
    api_key=os.environ.get("ARK_API_KEY"),
    base_url="https://ark.cn-beijing.volces.com/api/v3"
)

response = client.responses.create(
    model="doubao-seed-2-1-pro-260628",
    input=[{
        "role": "user",
        "content": [
            {
                "type": "input_image",
                "image_url": "https://ark-project.tos-cn-beijing.volces.com/doc_image/ark_demo_img_1.png"
            },
            {
                "type": "input_text",
                "text": "支持输入图片的模型系列是哪个？"
            }
        ]
    }]
)

print(response.output.choices[0].message.content)
\`\`\`
\`\`\`go
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/volcengine/volcengine-go-sdk/service/arkruntime"
	"github.com/volcengine/volcengine-go-sdk/service/arkruntime/model"
)

func main() {
	client := arkruntime.NewClientWithApiKey(os.Getenv("ARK_API_KEY"))
	ctx := context.Background()

	resp, err := client.CreateResponse(ctx, model.ResponseRequest{
		Model: "doubao-seed-2-1-pro-260628",
		Input: []model.ResponseInput{
			{
				Role: "user",
				Content: []model.ResponseContentPart{
					{Type: "input_image", ImageUrl: "https://ark-project.tos-cn-beijing.volces.com/doc_image/ark_demo_img_1.png"},
					{Type: "input_text", Text: "支持输入图片的模型系列是哪个？"},
				},
			},
		},
	})
	if err != nil {
		panic(err)
	}
	fmt.Println(resp.Output.Choices[0].Message.Content)
}
\`\`\`
\`\`\`java
import com.volcengine.ark.runtime.service.ArkService;
import com.volcengine.ark.runtime.model.completion.chat.ChatCompletionRequest;

public class ImageUnderstandingDemo {
    public static void main(String[] args) {
        String apiKey = System.getenv("ARK_API_KEY");
        ArkService service = new ArkService(apiKey);
        
        System.out.println("Java SDK 正在发起多模态图片理解请求...");
    }
}
\`\`\`
\`\`\`openai-sdk
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.ARK_API_KEY,
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
});

async function main() {
  const response = await openai.chat.completions.create({
    model: "doubao-seed-2-1-pro-260628",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "支持输入图片的模型系列是哪个？" },
          { type: "image_url", image_url: { url: "https://ark-project.tos-cn-beijing.volces.com/doc_image/ark_demo_img_1.png" } }
        ]
      }
    ]
  });

  console.log(response.choices[0].message.content);
}

main();
\`\`\`
:::

## 支持模型

多模态大模型矩阵持续升级，目前已全面开放 Doubao-Seed-2.1-Pro、Doubao-Vision-Pro、DeepSeek-VL2 等模型的图片理解与精准推理能力。

| 模型名称 | 模型规格 | 上下文长度 | 最大支持图片分辨率 | 支持格式 |
| :--- | :--- | :--- | :--- | :--- |
| **doubao-seed-2-1-pro-260628** | 256k | 256,000 Tokens | 4096 x 4096 px | PNG / JPG / WEBP / BMP |
| **doubao-vision-pro-32k** | 32k | 32,768 Tokens | 3840 x 2160 px | PNG / JPEG / GIF / WEBP |
| **deepseek-vl2-16k** | 16k | 16,384 Tokens | 2048 x 2048 px | PNG / JPEG |

## API 接口

通过 HTTP POST 方式调用多模态 Responses 接口：\`https://ark.cn-beijing.volces.com/api/v3/responses\`。请求头需携带 Authorization Token。

## 图片传入方式

### 本地文件上传

支持通过中广云 TOS 对象存储先完成文件秒传并换取签名 URL，或通过 Files API 提前预热缓存，以大幅节省高频请求带宽。

### Base64 编码传入

若图片存储在客户端且不便暴露外部公共 URL，可将二进制文件转为标准 Data URL 格式（例如 \`data:image/jpeg;base64,...\`）直接内联在请求包体中。

### 图片 URL 传入

推荐方式：直接传入可在公网访问的 CDN 或 TOS 对象存储链接，服务端将自动采用高速流式管道拉取解码。

## 使用场景

### 多图输入

支持在单轮对话中同时传入多张关联图片，模型将自主对比多图间的异同点并总结连续变化规律。

### 视觉定位 (Visual Grounding)

模型能够返回目标物体在图像中的归一化坐标框 \`[ymin, xmin, ymax, xmax]\`，赋能 UI 自动化测试与工业缺陷质检。

## 使用说明

- **图片像素说明**：单张图像建议尺寸在 512x512 至 4096x4096 之间，超出将自动进行双线性等比缩放。
- **图片 token 用量说明**：系统根据图片实际切片数量动态计费，标准切片为 512x512 像素，约消耗 256~512 tokens。
- **图片文件容量**：单张图片文件体积不得超过 20MB。
`;

export interface DocStoreData {
  categories: Category[];
  trees: Record<string, DocTreeNode[]>;
  docs: Record<string, DocDetail>;
  drafts?: Record<string, DocDetail>;
  projects?: Project[];
  schemaVersion?: number;
  history?: DocRevision[];
  users?: AdminUser[];
  roles?: RoleDefinition[];
  legacyProjectAliases?: Record<
    string,
    { projectId: string; productId: string }
  >;
}

let cachedData: DocStoreData | null = null;

export function createDefaultRoles(): RoleDefinition[] {
  const now = new Date().toISOString();
  return [
    {
      id: "admin",
      name: "超级管理员",
      description: "拥有系统全量控制权限，包括项目、文档与用户权限配置",
      color: "purple",
      permissions: [
        "projects:view",
        "projects:edit",
        "projects:delete",
        "docs:view",
        "docs:edit",
        "docs:publish",
        "docs:delete",
        "users:manage",
      ],
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "editor",
      name: "运营人员",
      description: "拥有文档编写、维护、版本发布与目录配置权限，不可管理用户",
      color: "blue",
      permissions: [
        "projects:view",
        "projects:edit",
        "docs:view",
        "docs:edit",
        "docs:publish",
        "docs:delete",
      ],
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "viewer",
      name: "只读成员",
      description: "仅可浏览项目与文档，不可修改、保存或发布",
      color: "gray",
      permissions: ["projects:view", "docs:view"],
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function createDefaultUsers(): AdminUser[] {
  const adminPass = hashPassword("admin123");
  const operatorPass = hashPassword("operator123");
  const now = new Date().toISOString();
  return [
    {
      id: "u-admin",
      username: "admin",
      name: "系统管理员",
      role: "admin",
      passwordHash: adminPass.hash,
      salt: adminPass.salt,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "u-operator",
      username: "operator",
      name: "运营人员",
      role: "editor",
      passwordHash: operatorPass.hash,
      salt: operatorPass.salt,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

// ── 存储后端开关 ────────────────────────────────────────────
// 默认：配置了 DATABASE_URL 就走 MySQL；DATA_BACKEND=json 可强制回退 JSON 文件
function useMysqlBackend(): boolean {
  if (process.env.DATA_BACKEND === "json") return false;
  return Boolean(process.env.DATABASE_URL);
}

export async function getStore(): Promise<DocStoreData> {
  if (useMysqlBackend()) {
    // 动态引入避免与 dbStore 的循环依赖
    const { getStoreFromDb } = await import("./dbStore");
    const data = await getStoreFromDb();
    let changed = false;
    if (!data.roles || data.roles.length === 0) {
      data.roles = createDefaultRoles();
      changed = true;
    }
    if (!data.users || data.users.length === 0) {
      data.users = createDefaultUsers();
      changed = true;
    }
    if (changed) await saveStore(data);
    cachedData = data;
    return data;
  }

  // Read the current file so independently bundled route handlers see the same state.

  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      cachedData = JSON.parse(content);
      const data = cachedData!;
      let changed = migrateHierarchy(data);
      if (!data.roles || data.roles.length === 0) {
        data.roles = createDefaultRoles();
        changed = true;
      }
      if (!data.users || data.users.length === 0) {
        data.users = createDefaultUsers();
        changed = true;
      }
      if (changed) await saveStore(data);
      return data;
    } catch (e) {
      throw new Error("文档数据读取失败，请检查数据文件后重试");
    }
  }

  const defaultData: DocStoreData = {
    users: createDefaultUsers(),
    roles: createDefaultRoles(),
    categories: initialCategories,
    trees: {
      ark: initialArkTree,
    },
    docs: {
      "ark/image-understanding": {
        id: "doc-image-understanding",
        productId: "ark",
        slug: "image-understanding",
        title: "图片理解",
        description:
          "部分大模型具备图片视觉理解能力，支持本地文件和图片 URL 方式传入图片，适用于图片描述、分类、视觉定位等场景。",
        breadcrumbs: [
          "文档首页",
          "中广云方舟",
          "调用",
          "多模态理解",
          "图片理解",
        ],
        updatedAt: "2026-09-18 16:50",
        status: "published",
        version: 1,
        content: imageUnderstandingMarkdown,
      },
      "ark/product-intro": {
        id: "doc-intro",
        productId: "ark",
        slug: "product-intro",
        title: "产品简介",
        description:
          "中广云方舟是大模型服务平台，提供模型推理、微调、评测等全流程服务。",
        breadcrumbs: ["文档首页", "中广云方舟", "入门", "产品简介"],
        updatedAt: "2026-09-18 15:30",
        status: "published",
        version: 1,
        content: `中广云方舟提供海量前沿大模型推理与精调服务，具备极速冷启动、高可用吞吐与多层级安全防护能力。

> [!IMPORTANT]
> **核心优势**：支持字节跳动自研豆包大模型全系列，全面兼容业界开源生态（DeepSeek、Llama、Qwen 等）。

## 核心功能概述

- **模型推理**：秒级冷启动与千卡级并发调度。
- **模型精调**：提供 LoRA、Full Fine-tuning 全链路微调套件。
- **安全互信**：芯片级机密计算与端到端敏感信息脱敏。
`,
      },
    },
  };

  await saveStore(defaultData);
  return getStore();
}

export async function saveStore(data: DocStoreData): Promise<void> {
  cachedData = data;
  if (useMysqlBackend()) {
    const { saveStoreToDb } = await import("./dbStore");
    await saveStoreToDb(data);
    return;
  }
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const temporary = `${DATA_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(temporary, DATA_FILE);
    cachedData = data;
  } catch (err) {
    throw err;
  }
}

export async function listUsers(): Promise<SafeAdminUser[]> {
  const store = await getStore();
  return (store.users || []).map((u) => toSafeUser(u, store.roles));
}

export async function findUserById(id: string): Promise<AdminUser | undefined> {
  const store = await getStore();
  return store.users?.find((u) => u.id === id);
}

export async function findUserByUsername(username: string): Promise<AdminUser | undefined> {
  const store = await getStore();
  return store.users?.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export async function createUser(params: {
  username: string;
  name: string;
  role: Role;
  password: string;
  customPermissions?: Permission[];
}): Promise<SafeAdminUser> {
  const store = await getStore();
  if (!store.users) store.users = [];

  const existing = await findUserByUsername(params.username);
  if (existing) {
    throw new Error(`用户名 "${params.username}" 已存在`);
  }

  const { hash, salt } = hashPassword(params.password);
  const now = new Date().toISOString();
  const newUser: AdminUser = {
    id: `u-${crypto.randomUUID()}`,
    username: params.username.trim(),
    name: params.name.trim() || params.username.trim(),
    role: params.role,
    customPermissions: params.customPermissions,
    passwordHash: hash,
    salt,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  store.users.push(newUser);
  await saveStore(store);
  return toSafeUser(newUser, store.roles);
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<AdminUser, "name" | "role" | "status" | "customPermissions">>
): Promise<SafeAdminUser> {
  const store = await getStore();
  const user = store.users?.find((u) => u.id === id);
  if (!user) {
    throw new Error("用户不存在");
  }

  if (updates.name !== undefined) user.name = updates.name.trim();
  if (updates.role !== undefined) user.role = updates.role;
  if (updates.status !== undefined) user.status = updates.status;
  if (updates.customPermissions !== undefined) user.customPermissions = updates.customPermissions;
  user.updatedAt = new Date().toISOString();

  await saveStore(store);
  return toSafeUser(user, store.roles);
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  const store = await getStore();
  const user = store.users?.find((u) => u.id === id);
  if (!user) {
    throw new Error("用户不存在");
  }

  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  user.updatedAt = new Date().toISOString();
  await saveStore(store);
}

export async function updateUserLastLogin(id: string): Promise<void> {
  const store = await getStore();
  const user = store.users?.find((u) => u.id === id);
  if (user) {
    user.lastLoginAt = new Date().toISOString();
    await saveStore(store);
  }
}

export async function deleteUser(id: string): Promise<void> {
  const store = await getStore();
  if (!store.users) return;
  const idx = store.users.findIndex((u) => u.id === id);
  if (idx === -1) {
    throw new Error("用户不存在");
  }
  store.users.splice(idx, 1);
  await saveStore(store);
}

export async function listRoles(): Promise<RoleDefinition[]> {
  const store = await getStore();
  return store.roles || [];
}

export async function findRoleById(id: string): Promise<RoleDefinition | undefined> {
  const store = await getStore();
  return store.roles?.find((r) => r.id === id);
}

export async function createRole(params: {
  id: string;
  name: string;
  description?: string;
  color?: string;
  permissions: Permission[];
}): Promise<RoleDefinition> {
  const store = await getStore();
  if (!store.roles) store.roles = createDefaultRoles();

  const id = params.id.trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(id)) {
    throw new Error("角色标识只能由英文字母、数字、下划线及连字符组成");
  }

  const existing = store.roles.find((r) => r.id === id);
  if (existing) {
    throw new Error(`角色标识 "${id}" 已存在`);
  }

  const now = new Date().toISOString();
  const newRole: RoleDefinition = {
    id,
    name: params.name.trim(),
    description: params.description?.trim() || "",
    color: params.color || "blue",
    permissions: Array.from(new Set(params.permissions)),
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  };

  store.roles.push(newRole);
  await saveStore(store);
  return newRole;
}

export async function updateRole(
  id: string,
  updates: Partial<Pick<RoleDefinition, "name" | "description" | "color" | "permissions">>
): Promise<RoleDefinition> {
  const store = await getStore();
  if (!store.roles) store.roles = createDefaultRoles();

  const role = store.roles.find((r) => r.id === id);
  if (!role) {
    throw new Error("角色不存在");
  }

  if (updates.name !== undefined) role.name = updates.name.trim();
  if (updates.description !== undefined) role.description = updates.description.trim();
  if (updates.color !== undefined) role.color = updates.color;

  if (updates.permissions !== undefined) {
    // If admin role, preserve all critical permissions
    if (id === "admin") {
      role.permissions = [
        "projects:view",
        "projects:edit",
        "projects:delete",
        "docs:view",
        "docs:edit",
        "docs:publish",
        "docs:delete",
        "users:manage",
      ];
    } else {
      role.permissions = Array.from(new Set(updates.permissions));
    }
  }

  role.updatedAt = new Date().toISOString();
  await saveStore(store);
  return role;
}

export async function deleteRole(id: string): Promise<void> {
  const store = await getStore();
  if (!store.roles) return;

  const role = store.roles.find((r) => r.id === id);
  if (!role) {
    throw new Error("角色不存在");
  }

  if (role.isSystem || id === "admin") {
    throw new Error("系统内置角色不可删除");
  }

  const assignedUsers = (store.users || []).filter((u) => u.role === id);
  if (assignedUsers.length > 0) {
    throw new Error(
      `无法删除该角色：当前有 ${assignedUsers.length} 位用户关联了该角色（如 ${assignedUsers[0].name}），请先为他们调整角色`
    );
  }

  store.roles = store.roles.filter((r) => r.id !== id);
  await saveStore(store);
}
