# 图床管理功能实现说明

## 功能概览

实现了完整的CloudFlare R2图床管理系统，包含上传、列表查看、删除文件等功能。

## 架构设计

### 前端部分（Nuxt）

#### 1. Composable API 层 - `useImagebed.js`
位于 `nuxt/app/composables/useImagebed.ts`

> 说明：仓库已完成 Nuxt 目录迁移，前端业务代码统一位于 `nuxt/app/*`。

**配置管理模块**
- `getConfig()` - 从后端获取图床配置
- `saveConfig(configData)` - 保存配置到后端

**上传模块**
- `uploadImage(file, options)` - 上传单个图片
  - 参数：`{ domain, apiToken, uploadFolder }`
  - 返回：`{ success, src, url, fileName }`
- `uploadMultipleImages(files, options, onProgress)` - 批量上传

**列表模块**
- `getFileList(options)` - 获取文件列表
  - 参数：`{ domain, apiToken, start, count, search, dir, recursive }`
  - 支持分页、搜索、目录筛选
- `getFileCount(options)` - 获取文件总数

**删除模块**
- `deleteFile({ domain, apiToken, filePath })` - 删除单个文件
- `deleteFolder({ domain, apiToken, folderPath })` - 递归删除文件夹
- `deleteMultipleFiles({ domain, apiToken, filePaths })` - 批量删除

**工具函数**
- `getFullUrl(domain, src)` - 拼接完整URL
- `formatFileSize(bytes)` - 格式化文件大小
- `formatTimestamp(timestamp)` - 格式化时间戳

#### 2. 页面组件 - `pages/admin/imagebed/index.vue`
位于 `nuxt/app/pages/admin/imagebed/index.vue`

**三个主要Tab**
1. **上传图片**：拖拽上传、批量上传、查看上传记录
2. **文件列表**：分页展示、搜索过滤、批量选择删除
3. **删除文件**：单文件删除、文件夹递归删除

**配置管理**
- 域名、API Token、默认上传目录保存在后端SQLite数据库
- 支持自定义上传目录

### 后端部分（.NET）

#### 1. 数据模型 - `Models/ImagebedConfig.cs`
```csharp
public class ImagebedConfig
{
    public int Id { get; set; }
    public string Domain { get; set; }      // 图床域名
    public string ApiToken { get; set; }    // API Token
    public string? UploadFolder { get; set; } // 默认上传目录
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

#### 2. DTO - `DTOs/ImagebedConfigDto.cs`
用于API数据传输的简化模型

#### 3. 服务层 - `Services/ImagebedService.cs`
- `GetConfigAsync()` - 获取配置（仅存储一条记录）
- `SaveConfigAsync(dto)` - 保存或更新配置

#### 4. 控制器 - `Controllers/ImagebedController.cs`
- `GET /api/imagebed/config` - 获取配置
- `POST /api/imagebed/config` - 保存配置

#### 5. 数据库表结构
表名：`imagebed_configs`
```sql
CREATE TABLE imagebed_configs (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Domain TEXT NOT NULL,
    ApiToken TEXT NOT NULL,
    UploadFolder TEXT,
    CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## API 集成说明

### CloudFlare ImgBed API

**上传接口**
- 端点：`POST /upload`
- 认证：Bearer Token
- 参数：
  - `uploadChannel=cfr2`（固定使用 Cloudflare R2）
  - `returnFormat=default`
  - `uploadFolder`（可选，自定义上传目录）
- 响应：`[{ src: "/file/xxx.jpg" }]`
- 前端自动添加域名前缀

**列表接口**
- 端点：`GET /api/manage/list`
- 参数：
  - `start`, `count`（分页）
  - `search`（搜索关键词）
  - `dir`（指定目录）
  - `channel=CloudflareR2`（筛选R2渠道）
  - `fileType=image`（仅图片）

**删除接口**
- 端点：`GET /api/manage/delete/{path}`
- 参数：
  - `folder=true`（删除文件夹时）
- 响应：`{ success: true }`

## 使用流程

1. 访问 `/admin/imagebed` 进入图床管理页面
2. 点击「配置设置」，输入：
   - 图床域名（如：`https://img.example.com`）
   - API Token
   - 默认上传目录（可选，如：`blog/images`）
3. 配置保存后：
   - 可在「上传图片」Tab上传文件（自动使用默认目录，也可临时修改）
   - 可在「文件列表」Tab查看已上传的文件
   - 可在「删除文件」Tab删除单个文件或整个文件夹

## 技术特点

- ✅ 前后端分离，API与业务逻辑解耦
- ✅ 配置持久化到SQLite数据库
- ✅ 仅支持图片格式上传
- ✅ 上传成功自动添加域名前缀
- ✅ 支持批量操作
- ✅ 使用 Naive UI 组件库
- ✅ 响应式设计
