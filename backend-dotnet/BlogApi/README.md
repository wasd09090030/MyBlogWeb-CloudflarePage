# Blog API - .NET 8 后端

这是一个基于 ASP.NET Core 8 + SQLite + Entity Framework Core 的博客后端 API，用于替代 NestJS 版本。

## 技术栈

- **.NET 8**: 最新的 .NET 版本
- **ASP.NET Core Web API**: RESTful API 框架
- **Entity Framework Core**: ORM 框架
- **SQLite**: 轻量级数据库
- **BCrypt.Net**: 密码加密
- **Swagger/OpenAPI**: API 文档

## 功能特性

### 1. 文章管理 (Articles)
- ✅ 创建文章
- ✅ 获取文章列表（支持分类筛选、分页）
- ✅ 获取文章摘要
- ✅ 获取特色文章
- ✅ 获取单个文章详情
- ✅ 更新文章
- ✅ 删除文章
- ✅ 文章分类：学习、游戏、个人作品、资源分享、其他

### 2. 评论管理 (Comments)
- ✅ 创建评论（记录用户IP）
- ✅ 根据文章获取评论
- ✅ 获取所有评论（管理员）
- ✅ 获取待审核评论（管理员）
- ✅ 更新评论状态（管理员）
- ✅ 评论点赞
- ✅ 删除评论（管理员）
- ✅ 支持评论回复（parentId）

### 3. 画廊管理 (Gallery)
- ✅ 获取激活的画廊图片（公开）
- ✅ 获取所有画廊图片（管理员）
- ✅ 创建画廊图片（管理员）
- ✅ 更新画廊图片（管理员）
- ✅ 删除画廊图片（管理员）
- ✅ 获取图片宽高（公开）
- ✅ 批量更新排序（管理员）
- ✅ 切换激活状态（管理员）

### 4. 认证管理 (Auth)
- ✅ 管理员登录
- ✅ 修改密码
- ✅ 密码加密存储（BCrypt）
- ✅ 默认账户：admin / admin123

## 项目结构

```
BlogApi/
├── Controllers/          # API 控制器
│   ├── ArticlesController.cs
│   ├── CommentsController.cs
│   ├── GalleryController.cs
│   └── AuthController.cs
├── Services/            # 业务逻辑服务
│   ├── ArticleService.cs
│   ├── CommentService.cs
│   ├── GalleryService.cs
│   └── AuthService.cs
├── Models/              # 数据模型
│   ├── Article.cs
│   ├── Comment.cs
│   ├── Gallery.cs
│   └── Like.cs
├── DTOs/                # 数据传输对象
│   ├── ArticleDto.cs
│   ├── CommentDto.cs
│   ├── GalleryDto.cs
│   └── AuthDto.cs
├── Data/                # 数据库上下文
│   └── BlogDbContext.cs
├── Program.cs           # 应用程序入口
└── appsettings.json     # 配置文件
```

## 快速开始

### 前置要求

- .NET 8 SDK 或更高版本
- 任意代码编辑器（推荐 Visual Studio Code 或 Visual Studio）

### 安装依赖

项目已包含所有必需的 NuGet 包：
- Microsoft.EntityFrameworkCore.Sqlite
- Microsoft.EntityFrameworkCore.Design
- BCrypt.Net-Next
- Swashbuckle.AspNetCore

### 运行应用

```powershell
# 进入项目目录
cd backend-dotnet/BlogApi

# 运行应用
dotnet run
```

应用将在以下地址启动：
- HTTP: `http://localhost:5000`
- HTTPS: `https://localhost:5001`
- Swagger UI: `https://localhost:5001/swagger`

### 数据库

应用首次启动时会自动创建 SQLite 数据库文件 `blog.sqlite`，并初始化所有表结构。

## API 端点

### 文章 (Articles)

```
POST   /api/articles                    # 创建文章
GET    /api/articles                    # 获取文章列表
GET    /api/articles?summary=true       # 获取文章摘要
GET    /api/articles?category=study     # 按分类获取
GET    /api/articles?page=1&limit=10    # 分页获取
GET    /api/articles/featured           # 获取特色文章
GET    /api/articles/category/{category} # 按分类获取
GET    /api/articles/{id}               # 获取单个文章
PUT    /api/articles/{id}               # 更新文章
DELETE /api/articles/{id}               # 删除文章
```

### 评论 (Comments)

```
POST   /api/comments                    # 创建评论
GET    /api/comments/article/{id}       # 获取文章的评论
GET    /api/comments/admin/all          # 获取所有评论
GET    /api/comments/admin/pending      # 获取待审核评论
PATCH  /api/comments/admin/{id}/status  # 更新评论状态
POST   /api/comments/{id}/like          # 评论点赞
DELETE /api/comments/admin/{id}         # 删除评论
```

### 画廊 (Gallery)

```
GET    /api/gallery                     # 获取激活的画廊
GET    /api/gallery/admin               # 获取所有画廊（管理员）
GET    /api/gallery/{id}                # 获取单个画廊
GET    /api/gallery/{id}/dimensions     # 获取图片宽高
POST   /api/gallery/refresh-dimensions  # 刷新图片宽高（管理员）
POST   /api/gallery                     # 创建画廊（管理员）
PATCH  /api/gallery/{id}                # 更新画廊（管理员）
DELETE /api/gallery/{id}                # 删除画廊（管理员）
PATCH  /api/gallery/batch/sort-order    # 批量更新排序
PATCH  /api/gallery/{id}/toggle-active  # 切换激活状态
```

### 认证 (Auth)

```
POST   /api/auth/login                  # 管理员登录
POST   /api/auth/change-password        # 修改密码
```

## 与 NestJS 版本的差异

### 相同功能
- ✅ 所有 API 端点保持一致
- ✅ 数据库结构相同（SQLite）
- ✅ 相同的业务逻辑
- ✅ CORS 支持
- ✅ 密码加密（BCrypt）

### 技术差异
- 使用 C# 代替 TypeScript
- 使用 Entity Framework Core 代替 TypeORM
- 使用 ASP.NET Core 代替 NestJS
- 使用 Swagger/OpenAPI 代替 NestJS 自带文档

### 性能优势
- .NET 8 具有更好的性能表现
- 更低的内存占用
- 更快的启动时间
- 原生编译支持（可选）

## 配置

### 数据库配置

在 `appsettings.json` 中修改连接字符串：

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=blog.sqlite"
  }
}
```

### CORS 配置

在 `Program.cs` 中可以修改 CORS 策略：

```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173") // 指定前端地址
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
```

## 开发建议

### 添加新功能

1. 在 `Models/` 中创建实体类
2. 在 `DTOs/` 中创建数据传输对象
3. 在 `Services/` 中实现业务逻辑
4. 在 `Controllers/` 中创建 API 端点
5. 更新 `BlogDbContext.cs` 添加 DbSet

### 数据库迁移

如果修改了模型，可以使用 EF Core 迁移：

```powershell
# 添加迁移
dotnet ef migrations add MigrationName

# 更新数据库
dotnet ef database update
```

## 部署

### 发布应用

```powershell
# 发布为自包含应用
dotnet publish -c Release -r win-x64 --self-contained

# 发布为依赖框架的应用
dotnet publish -c Release
```

### Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["BlogApi.csproj", "./"]
RUN dotnet restore
COPY . .
RUN dotnet build -c Release -o /app/build

FROM build AS publish
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "BlogApi.dll"]
```

## 常见问题

### 1. 端口被占用

修改 `Properties/launchSettings.json` 中的端口配置。

### 2. CORS 错误

确保 `Program.cs` 中正确配置了 CORS 策略。

### 3. 数据库文件位置

默认在项目根目录创建 `blog.sqlite` 文件。

## 许可证

MIT License

## 作者

Created to replace the NestJS backend with a .NET 8 implementation.
