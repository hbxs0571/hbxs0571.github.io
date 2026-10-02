# 留言板配置与审核

留言页是静态 HTML，留言内容保存在 Supabase 项目中。

## 数据库权限

guestbook.sql 创建留言表并启用行级安全策略。访客可以提交名称、邮箱和留言，新留言默认为待审核；访客只能读取审核通过的公开字段。邮箱不授予访客读取权限，访客也无法修改审核状态。

此项目已在 Supabase SQL Editor 中执行该脚本。

## 前端配置

项目 URL 和 publishable key 已写入 asset/js/guestbook-config.js。publishable key 可用于浏览器前端；绝不要把 secret 或 service-role key 放入网站文件。

## 审核留言

在 Supabase Dashboard 打开 Table Editor → guestbook_messages。查看新留言后，将 approved 改为 true 即可公开；保持 false 则继续隐藏。访客页面仅显示名称、留言和日期。
