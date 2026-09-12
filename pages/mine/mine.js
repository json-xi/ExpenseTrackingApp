const store = require('../../utils/store')

const DEFAULT_AVATAR = '/assets/icons/avatar.png'

Page({
  data: {
    defaultAvatar: DEFAULT_AVATAR,
    avatar: '',
    nickname: '',
    logged: false,
    overall: { count: 0, days: 0, firstDate: '' },
    firstDateText: '—',
    feedbackCount: 0
  },

  onShow() {
    this.loadProfile()
    const overall = store.getOverallStats()
    this.setData({
      overall,
      firstDateText: overall.firstDate ? overall.firstDate.slice(5) : '—',
      feedbackCount: store.getFeedbackCount()
    })
  },

  loadProfile() {
    const profile = store.getProfile() || {}
    this.setData({
      avatar: profile.avatar || '',
      nickname: profile.nickname || '',
      logged: Boolean(profile.avatar || profile.nickname)
    })
  },

  onChooseAvatar(e) {
    store.saveProfile({ avatar: e.detail.avatarUrl })
    this.loadProfile()
  },

  onNicknameChange(e) {
    const nickname = (e.detail.value || '').trim()
    if (nickname === this.data.nickname) return
    store.saveProfile({ nickname })
    this.loadProfile()
  },

  onFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' })
  },

  onExport() {
    if (!store.getRecords().length) {
      wx.showToast({ title: '还没有账单可导出', icon: 'none' })
      return
    }
    const filePath = wx.env.USER_DATA_PATH + '/账单.csv'
    wx.getFileSystemManager().writeFile({
      filePath: filePath,
      data: store.exportCsv(),
      encoding: 'utf8',
      success: () => this.shareExport(filePath),
      fail: () => wx.showToast({ title: '导出失败', icon: 'none' })
    })
  },

  shareExport(filePath) {
    const openFile = () => {
      wx.openDocument({
        filePath: filePath,
        showMenu: true,
        fail: () => wx.showToast({ title: '导出失败', icon: 'none' })
      })
    }
    if (!wx.shareFileMessage) {
      openFile()
      return
    }
    wx.shareFileMessage({
      filePath: filePath,
      fileName: '账单.csv',
      fail: (err) => {
        const msg = (err && err.errMsg) || ''
        if (msg.indexOf('cancel') !== -1) return
        openFile()
      }
    })
  },

  onLogout() {
    wx.showModal({
      title: '注销登录',
      content: '将清除本机保存的头像和昵称，账单数据不会丢失。',
      confirmText: '注销',
      confirmColor: '#c0392b',
      success: (res) => {
        if (!res.confirm) return
        store.clearProfile()
        this.loadProfile()
        wx.showToast({ title: '已注销', icon: 'none' })
      }
    })
  }
})
