# Blog API - 快速启动指南

## 方式一：使用 PowerShell 脚本（推荐）

```powershell
cd backend-dotnet/BlogApi
./start.ps1
```

## 方式二：使用 dotnet 命令

```powershell
cd backend-dotnet/BlogApi
dotnet run
```

## 方式三：指定端口运行

```powershell
cd backend-dotnet/BlogApi
dotnet run --urls="http://localhost:3000"
```

## 访问地址

- API 地址: http://localhost:3000
- Swagger 文档: http://localhost:3000/swagger

## 默认管理员账户

- 用户名: admin
- 密码: admin123

## 常用命令

```powershell
# 构建项目
dotnet build

# 运行项目
dotnet run

# 发布项目
dotnet publish -c Release

# 清理项目
dotnet clean
```
