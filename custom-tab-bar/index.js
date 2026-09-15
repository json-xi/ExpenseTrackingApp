Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/stats/stats',
        text: '统计',
        icon: '/assets/icons/stats.png',
        iconActive: '/assets/icons/stats-active.png'
      },
      {
        pagePath: '/pages/record/record',
        text: '记账',
        icon: '/assets/icons/record.png',
        iconActive: '/assets/icons/record-active.png'
      },
      {
        pagePath: '/pages/mine/mine',
        text: '我的',
        icon: '/assets/icons/mine.png',
        iconActive: '/assets/icons/mine-active.png'
      }
    ]
  },

  methods: {
    onSwitch(e) {
      const index = e.currentTarget.dataset.index
      const item = this.data.list[index]
      if (!item || index === this.data.selected) return
      wx.switchTab({ url: item.pagePath })
    }
  }
})
