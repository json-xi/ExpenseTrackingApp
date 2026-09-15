const store = require('../../utils/store')

Page({
  data: {
    count: 0,
    rows: [],
    bookName: ''
  },

  onShow() {
    const book = store.getCurrentBook()
    const records = store.getRecords().slice().sort((a, b) => {
      if (a.date === b.date) return b.createdAt - a.createdAt
      return a.date < b.date ? 1 : -1
    })
    this.setData({
      bookName: book.name,
      count: records.length,
      rows: records.map((item) => ({
        id: item.id,
        date: item.date,
        typeName: item.type === 'income' ? '收入' : '支出',
        categoryName: item.categoryName,
        amountText: store.formatMoney(item.amount),
        income: item.type === 'income',
        note: item.note || ''
      }))
    })
  },

  onCopy() {
    wx.setClipboardData({
      data: store.exportCsv(),
      success: () => {
        wx.showToast({ title: '已复制，可粘贴到备忘录或微信', icon: 'none', duration: 2000 })
      }
    })
  },

  onShare() {
    const filePath = wx.env.USER_DATA_PATH + '/bills.csv'
    wx.getFileSystemManager().writeFile({
      filePath: filePath,
      data: store.exportCsv(),
      encoding: 'utf8',
      success: () => {
        if (!wx.shareFileMessage) {
          this.onCopy()
          return
        }
        wx.shareFileMessage({
          filePath: filePath,
          fileName: `${this.data.bookName || '账单'}.csv`,
          fail: (err) => {
            const msg = (err && err.errMsg) || ''
            if (msg.indexOf('cancel') !== -1) return
            this.onCopy()
          }
        })
      },
      fail: () => this.onCopy()
    })
  }
})
