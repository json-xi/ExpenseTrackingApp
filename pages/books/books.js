const store = require('../../utils/store')

const BOOK_ERROR = {
  empty: '请输入账本名称',
  long: '名称最多 8 个字',
  limit: '最多 12 个账本',
  dup: '已有同名账本',
  last: '至少保留一个账本',
  missing: '账本不存在'
}

Page({
  data: {
    books: [],
    maxBooks: store.MAX_BOOKS,
    maxName: store.MAX_BOOK_NAME,
  },

  onLoad(query) {
    this.shouldBack = query.back === '1'
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    this.setData({ books: store.listBooks() })
  },

  onSelect(e) {
    const id = e.currentTarget.dataset.id
    const book = store.setCurrentBook(id)
    this.refresh()
    if (this.shouldBack) {
      wx.navigateBack({ fail: () => {} })
      return
    }
    wx.showToast({ title: `已切换到${book.name}`, icon: 'none' })
  },

  onAdd() {
    wx.showModal({
      title: '新建账本',
      editable: true,
      placeholderText: '例如：生活、旅行',
      success: (res) => {
        if (!res.confirm) return
        const result = store.addBook(res.content)
        if (!result.ok) {
          wx.showToast({ title: BOOK_ERROR[result.reason] || '无法新建', icon: 'none' })
          return
        }
        this.refresh()
        if (this.shouldBack) {
          wx.navigateBack({ fail: () => {} })
          return
        }
        wx.showToast({ title: `已创建${result.book.name}`, icon: 'none' })
      }
    })
  },

  onMore(e) {
    const { id, name, count } = e.currentTarget.dataset
    wx.showActionSheet({
      itemList: ['重命名', '删除账本'],
      success: (res) => {
        if (res.tapIndex === 0) this.rename(id, name)
        if (res.tapIndex === 1) this.remove(id, name, count)
      }
    })
  },

  rename(id, name) {
    wx.showModal({
      title: '重命名账本',
      editable: true,
      content: name,
      placeholderText: '账本名称',
      success: (res) => {
        if (!res.confirm) return
        const result = store.renameBook(id, res.content)
        if (!result.ok) {
          wx.showToast({ title: BOOK_ERROR[result.reason] || '无法重命名', icon: 'none' })
          return
        }
        this.refresh()
      }
    })
  },

  remove(id, name, count) {
    const extra = count > 0 ? `账本里的 ${count} 笔记录也会一起删除，且无法恢复。` : '删除后无法恢复。'
    wx.showModal({
      title: `删除「${name}」？`,
      content: extra,
      confirmText: '删除',
      confirmColor: '#c0392b',
      success: (res) => {
        if (!res.confirm) return
        const result = store.deleteBook(id)
        if (!result.ok) {
          wx.showToast({ title: BOOK_ERROR[result.reason] || '无法删除', icon: 'none' })
          return
        }
        this.refresh()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  }
})
