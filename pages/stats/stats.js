const store = require('../../utils/store')

const LIST_TITLE = {
  day: '当日明细',
  month: '当月明细',
  year: '月度汇总'
}

const EMPTY_TEXT = {
  day: '这一天还没有记账',
  month: '这个月还没有记账',
  year: '这一年还没有记账'
}

const LIST_LIMIT = 3

// 折叠时只保留前 limit 行，跨日期分组按顺序截断
function truncateGroups(groups, limit) {
  const result = []
  let remaining = limit
  groups.forEach((group) => {
    if (remaining <= 0) return
    const items = group.items.slice(0, remaining)
    remaining -= items.length
    result.push({ ...group, items })
  })
  return result
}

Page({
  data: {
    scope: 'day',
    period: '',
    today: '',
    periodLabel: '',
    overviewLabel: '',
    canNext: false,
    balance: 0,
    balancePrefix: '',
    balanceAbs: '0.00',
    expenseText: '0.00',
    incomeText: '0.00',
    advice: [],
    adviceOpen: false,
    statType: 'expense',
    stats: [],
    listTitle: LIST_TITLE.day,
    emptyText: EMPTY_TEXT.day,
    showGroupHead: false,
    groups: [],
    monthRows: [],
    listCountText: '',
    listCollapsible: false,
    listOpen: false,
    listExpanded: true
  },

  onShow() {
    if (!this.data.period) {
      this.setData({
        period: store.currentPeriod(this.data.scope),
        today: store.formatDate(new Date())
      })
    }
    this.refresh()
  },

  refresh() {
    const { scope, period, statType } = this.data

    const summaryRecords = store.getPeriodRecords(scope, period)
    const sum = store.summarize(summaryRecords)
    const advice = store.buildAdvice(summaryRecords, scope, period)
    const adviceKey = scope + ':' + period
    const next = {
      periodLabel: store.formatPeriodLabel(scope, period),
      overviewLabel: store.formatPeriodLabel(scope, period),
      canNext: period < store.currentPeriod(scope),
      balance: sum.balance,
      balancePrefix: sum.balance < 0 ? '-' : '',
      balanceAbs: store.formatMoney(Math.abs(sum.balance)),
      expenseText: store.formatMoney(sum.expense),
      incomeText: store.formatMoney(sum.income),
      advice: advice,
      stats: store.categoryStats(summaryRecords, statType).map((item) => ({
        ...item,
        amountText: store.formatMoney(item.amount)
      })),
      listTitle: LIST_TITLE[scope],
      emptyText: EMPTY_TEXT[scope],
      showGroupHead: scope !== 'day',
      ...this.buildList()
    }
    if (this._adviceKey !== adviceKey) {
      this._adviceKey = adviceKey
      next.adviceOpen = advice.some((item) => item.tone === 'warn')
    }
    this.setData(next)
  },

  // 完整列表存在实例上，data 里只放当前要渲染的部分
  buildList() {
    const { scope, period } = this.data
    if (scope === 'year') {
      this.fullGroups = []
      this.fullMonthRows = store.monthSummaries(period).map((row) => ({
        ...row,
        expenseText: store.formatMoney(row.expense),
        incomeText: store.formatMoney(row.income)
      }))
    } else {
      this.fullMonthRows = []
      this.fullGroups = store.groupByDate(store.getPeriodRecords(scope, period)).map((group) => ({
        ...group,
        expenseText: store.formatMoney(group.expense),
        incomeText: store.formatMoney(group.income),
        items: group.items.map((item) => ({
          ...item,
          amountText: store.formatMoney(item.amount),
          sign: item.type === 'income' ? '+' : '-',
          icon: store.categoryIcon(item.categoryId)
        }))
      }))
    }
    return this.visibleList()
  },

  visibleList(listOpen = this.data.listOpen) {
    const monthRows = this.fullMonthRows || []
    const groups = this.fullGroups || []
    const count = monthRows.length + groups.reduce((n, group) => n + group.items.length, 0)
    const collapsible = count > LIST_LIMIT
    const collapsed = collapsible && !listOpen
    return {
      listCountText: count === 0
        ? ''
        : this.data.scope === 'year' ? `${count} 个月` : `${count} 条`,
      listCollapsible: collapsible,
      // 标签跟着真实渲染结果走，避免和 listOpen 这个意图值不同步
      listExpanded: !collapsed,
      monthRows: collapsed ? monthRows.slice(0, LIST_LIMIT) : monthRows,
      groups: collapsed ? truncateGroups(groups, LIST_LIMIT) : groups
    }
  },

  onToggleList() {
    if (!this.data.listCollapsible) return
    const listOpen = !this.data.listOpen
    this.setData({ listOpen, ...this.visibleList(listOpen) })
  },

  onSwitchScope(e) {
    const scope = e.currentTarget.dataset.scope
    if (scope === this.data.scope) return
    this.setData(
      { scope, period: store.convertPeriod(scope, this.data.period) },
      () => this.refresh()
    )
  },

  onPrevPeriod() {
    const period = store.shiftPeriod(this.data.scope, this.data.period, -1)
    this.setData({ period }, () => this.refresh())
  },

  onNextPeriod() {
    if (!this.data.canNext) return
    const period = store.shiftPeriod(this.data.scope, this.data.period, 1)
    this.setData({ period }, () => this.refresh())
  },

  // 日历选择：picker 按当前维度返回 2026 / 2026-09 / 2026-09-12
  onPickPeriod(e) {
    const period = store.normalizePeriod(this.data.scope, e.detail.value)
    if (period === this.data.period) return
    this.setData({ period }, () => this.refresh())
  },

  onToggleAdvice() {
    this.setData({ adviceOpen: !this.data.adviceOpen })
  },

  onSwitchStat(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.statType) return
    this.setData({ statType: type }, () => this.refresh())
  },

  onTapMonth(e) {
    this.setData(
      { scope: 'month', period: e.currentTarget.dataset.month },
      () => this.refresh()
    )
  },

  onDeleteRecord(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '删除这条记录？',
      confirmText: '删除',
      confirmColor: '#c0392b',
      success: (res) => {
        if (!res.confirm) return
        store.deleteRecord(id)
        this.refresh()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  onOpenSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  }
})
