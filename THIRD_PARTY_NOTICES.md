# 第三方来源

本项目的可编辑 Vue/TypeScript 实现为本次任务编写。参考界面为 [学术生活导航](https://nav.peptide.ink/)，其同源项目是 [mTab](https://github.com/tsxcw/mtab)。

`public/assets/reference/` 中的壁纸、网站图标和组件图片来自参考站公开页面。`docs/asset-sources.json` 逐项记录了原始 URL 与本地文件的对应关系。网站标志属于其各自所有者；这些图片不因保存在本项目中而获得新的开源许可。参考站没有提供单独的壁纸或图片授权文件，正式使用时可替换为自己的品牌和壁纸。

`src/data/navigation.json` 中的站名、链接与描述来自参考站公开导航数据；热搜和天气文件是 2026-11-26 的公开展示快照。

直接依赖：

- Vue 3、Vite、TypeScript：各自 MIT 许可。
- Lucide 图标：ISC 许可。
- lunar-typescript：MIT 许可，用于农历计算。

依赖的完整许可随 npm 包提供。mTab 的仓库许可核对结果见 `docs/开源项目调研.md`；本项目没有复制其 PHP 后端或编译后的 JavaScript。
