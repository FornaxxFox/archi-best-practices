# 数据集基线

这里保存可审阅的 ArchLens 案例数据集快照。快照只包含案例索引、来源 URL、图像许可和稳定内容哈希，不重复保存案例正文或外部图片。

## 审核方式

```bash
npm run dataset:audit
```

审核脚本会把当前 `lib/data.ts` 与指定基线逐案例比较：

- 新增、删除或内容修改必须同步递增 `lib/dataset-meta.ts` 的 `DATASET_VERSION`。
- 版本不能回退。
- `contentHash` 覆盖完整案例对象，来源、许可、理念、元素和风险字段变化都会被发现。

发布新数据集时，先生成新版本快照，再把 `package.json` 中的基线路径切换到新快照，并在 `docs/RELEASES.md` 记录 Git commit、Sites 版本和验证结果。
