# 开发环境 LibreOffice 安装指南

## 概述

本项目的 AI 伴读功能需要将 DOCX、DOC、TXT 文件转换为 PDF 格式。转换功能依赖 LibreOffice，开发人员需要在本地安装 LibreOffice 才能正常运行和测试该功能。

## Windows 安装步骤

### 方法一：官网下载安装（推荐）

1. **下载 LibreOffice**

   访问 LibreOffice 官网下载页面：
   - 官网：https://www.libreoffice.org/download/download-libreoffice/
   - 国内镜像：https://mirrors.cloud.tencent.com/libreoffice/libreoffice/stable/

2. **选择版本**

   - 选择 Windows x86_64 版本
   - 推荐下载稳定版（如 24.2.x）

3. **安装**

   - 双击下载的 `.msi` 安装包
   - 按照安装向导完成安装
   - 安装路径建议使用默认路径：`C:\Program Files\LibreOffice`

4. **配置环境变量**

   安装完成后，需要将 LibreOffice 的 `program` 目录添加到系统 PATH 环境变量：

   ```
   C:\Program Files\LibreOffice\program
   ```

   **添加方法：**
   - 右键「此电脑」→「属性」→「高级系统设置」→「环境变量」
   - 在「系统变量」中找到 `Path`，点击「编辑」
   - 点击「新建」，添加上述路径
   - 点击「确定」保存

5. **验证安装**

   打开命令提示符（CMD）或 PowerShell，运行：

   ```bash
   soffice --version
   ```

   如果显示版本号（如 `LibreOffice 24.2.x.x ...`），说明安装成功。

### 方法二：使用 Chocolatey 安装

如果你已安装 Chocolatey 包管理器，可以使用以下命令快速安装：

```powershell
choco install libreoffice-fresh -y
```

安装完成后同样需要配置环境变量（见方法一第4步）。

### 方法三：使用 winget 安装

Windows 10/11 用户可以使用 winget：

```powershell
winget install TheDocumentFoundation.LibreOffice
```

## macOS 安装步骤

### 方法一：官网下载安装

1. 访问 https://www.libreoffice.org/download/download-libreoffice/
2. 下载 macOS 版本（.dmg 文件）
3. 双击打开，将 LibreOffice 拖入 Applications 文件夹

### 方法二：使用 Homebrew 安装（推荐）

```bash
brew install --cask libreoffice
```

### 验证安装

```bash
/Applications/LibreOffice.app/Contents/MacOS/soffice --version
```

## Linux 安装步骤

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install -y libreoffice
```

### CentOS/RHEL

```bash
sudo yum install -y libreoffice
```

### 验证安装

```bash
libreoffice --version
# 或
soffice --version
```

## 常见问题

### Q1: 运行项目时提示找不到 soffice 命令

**原因**：LibreOffice 未安装或未正确配置环境变量。

**解决方案**：
1. 确认 LibreOffice 已安装
2. 确认环境变量已正确配置
3. 重启命令行窗口或 IDE

### Q2: Windows 下转换失败，提示权限问题

**解决方案**：
1. 确保以管理员身份运行开发服务器
2. 检查临时目录权限（通常是 `%TEMP%`）

### Q3: 转换后的 PDF 中文乱码

**原因**：缺少中文字体。

**解决方案**：
- Windows：安装宋体、微软雅黑等中文字体
- macOS/Linux：安装 Noto CJK 字体

```bash
# Ubuntu/Debian
sudo apt-get install fonts-noto-cjk

# macOS (Homebrew)
brew install font-noto-sans-cjk
```

### Q4: 如何测试转换功能是否正常？

在项目根目录下运行：

```bash
pnpm dev
```

然后上传一个 DOCX、DOC 或 TXT 文件到 AI 伴读功能，观察是否能正常转换为 PDF。

## 注意事项

1. **开发环境必须安装 LibreOffice**：本地开发和调试 AI 伴读功能时，必须安装 LibreOffice。

2. **生产环境已集成**：Docker 镜像中已包含 LibreOffice，无需额外配置。

3. **版本兼容性**：建议使用 LibreOffice 7.x 或更高版本。

4. **首次转换较慢**：LibreOffice 首次启动时会初始化环境，后续转换会更快。

## 相关链接

- [LibreOffice 官网](https://www.libreoffice.org/)
- [LibreOffice 下载页面](https://www.libreoffice.org/download/download-libreoffice/)
- [项目 AI 伴读功能文档](./AI伴读PDF阅读器技术方案.md)
