const store = require('../../utils/store')

Page({
  data: {
    content: '',
    contact: ''
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value })
  },

  onSubmit() {
    const content = this.data.content.trim()
    if (content.length < 5) {
      wx.showToast({ title: '再多写几个字吧', icon: 'none' })
      return
    }

    store.addFeedback({ content, contact: this.data.contact })
    wx.showToast({ title: '已收到，谢谢反馈', icon: 'none' })
    setTimeout(() => wx.navigateBack(), 800)
  }
})
