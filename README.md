# 极简记账

微信小程序，本地记账，无登录、无服务器。

## 功能

三个 tab：统计、记账、我的。

- **统计**（首页）
  - 天 / 月 / 年三种查看模式，默认按天：总览展示当月收入、支出、结余，下方列出当天明细
  - 按月看分日流水，按年看月度汇总，点月份可下钻到该月
  - 根据支出结构给出消费建议
  - 右上角关键词搜索入口，右下角悬浮按钮快速记账
  - 顶部模式与日期切换栏滚动时吸顶
- **记账**：支出/收入切换，金额、分类、日期、备注
- **我的**：头像昵称（微信头像昵称填写能力）、记账笔数与天数、意见反馈、注销

搜索支持按分类、备注、金额、日期匹配。

数据保存在手机本地（`wx.setStorageSync`），包括账单、用户资料和反馈内容。

## 使用方式

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入本项目目录
3. AppID 可先选「测试号 / 游客模式」（`project.config.json` 中已设为 `touristappid`）
4. 编译预览即可

正式发布时，把 `project.config.json` 里的 `appid` 换成你的小程序 AppID。

## 目录

```
├── app.js / app.json / app.wxss
├── pages/
│   ├── stats/     # 统计（首页，含明细）
│   ├── record/    # 记账
│   ├── mine/      # 我的
│   ├── search/    # 搜索账单
│   └── feedback/  # 意见反馈
├── utils/store.js # 本地存储与统计、建议、搜索逻辑
└── assets/icons/
```
