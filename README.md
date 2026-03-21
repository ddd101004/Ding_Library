# AI 后端项目模版

## 修改项目名称

在 pageage.json 中修改 name

## 在部署机器上创建日志存放目录

```bash
mkdir -p /var/logs/ai-library
```

## 修改 onedev 配置文件

1. 将 .onedev-buildspec.yml.template 改为 .onedev-buildspec.yml
2. 修改 .onedev-buildspec.yml 中的 tags、端口号、监听的分支名、日志输出目录

## 修改 docker 配置文件

修改 Dockerfile 中的端口号

## 修改 env 配置文件

事情情况而定，修改相关环境变量

## 安装依赖

```bash
pnpm i
```

## 生成 prisma client

```bash
pnpm prisma generate
```
