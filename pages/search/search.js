const store = require('../../utils/store')

Page({
  data: {
    keyword: '',
    records: [],
    expenseText: '0.00',
    incomeText: '0.00'
  },

  onShow() {
    wx.setNavigationBarTitle({ title: `搜索 · ${store.getCurrentBook().name}` })
    if (this.data.keyword) this.search()
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value }, () => this.search())
  },

  onClear() {
    this.setData({ keyword: '', records: [] })
  },

  search() {
    const records = store.searchRecords(this.data.keyword)
    const sum = store.summarize(records)
    this.setData({
      records: records.map((item) => ({
        ...item,
        amountText: store.formatMoney(item.amount),
        sign: item.type === 'income' ? '+' : '-',
        icon: store.categoryIcon(item.categoryId)
      })),
      expenseText: store.formatMoney(sum.expense),
      incomeText: store.formatMoney(sum.income)
    })
  },

  onDeleteRecord(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除这条记录？',
      confirmText: '删除',
      confirmColor: '#c0392b',
      success: (res) => {
        if (!res.confirm) return
        store.deleteRecord(id)
        this.search()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  }
})
