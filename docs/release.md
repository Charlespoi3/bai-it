# 发布流程

> **用户说"发布"时，Claude 按以下步骤自主执行。** 除了商店上传，用户不需要跑任何命令。

---

## Claude 自动执行的步骤

### 1. 确认版本号

问用户：这次发什么版本？给出建议：
- bug 修复：改第三位（0.2.0 → 0.2.1）
- 新功能：改第二位（0.2.0 → 0.3.0）
- 大版本：改第一位（0.2.0 → 1.0.0）

用户确认后继续。

### 2. 更新 manifest.json

```bash
# Claude 修改 manifest.json 的 version 字段
```

### 3. 构建 + 打包

```bash
npm run release
```

依次执行：跑测试 → 构建 → 打包成 `bai-it-v{版本号}.zip`。测试不通过会中断。

### 4. 提交 + 推送 + 创建 GitHub Release

```bash
git add -A
git commit -m "release: v{版本号}"
git tag v{版本号}
git push origin main --tags
gh release create v{版本号} bai-it-v{版本号}.zip \
  --title "v{版本号} {简要说明}" \
  --notes "{发布说明，列出主要变更}"
```

Claude 根据最近的 commit 自动生成发布说明。

### 5. 提醒用户上传商店

Claude 完成上面所有步骤后，告诉用户：

> GitHub 发布完成。zip 文件在项目根目录：`bai-it-v{版本号}.zip`
>
> 需要你手动上传到两个商店：
>
> **Chrome Web Store**
> 1. 打开 https://chrome.google.com/webstore/devconsole
> 2. 点已有扩展 → Package → Upload new package
> 3. 上传 zip → Submit for review
>
> **Edge Add-ons**
> 1. 打开 https://partner.microsoft.com/dashboard/microsoftedge/public/login
> 2. 点已有扩展 → Packages → 上传同一个 zip
> 3. Submit → Publish

详细字段说明见 `_local/store-assets/chrome-web-store-submission.md` 和 `_local/store-assets/edge-add-ons-submission.md`。

### 6. 清理

用户确认商店上传完成后：

```bash
rm bai-it-v*.zip
```

---

## 快速检查清单

- [ ] 版本号已确认
- [ ] `manifest.json` version 已更新
- [ ] `npm run release` 通过（测试 + 构建 + 打包）
- [ ] Git commit + tag + push
- [ ] GitHub Release 已创建并挂上 zip
- [ ] 用户已上传 Chrome Web Store
- [ ] 用户已上传 Edge Add-ons
- [ ] 本地 zip 已清理
