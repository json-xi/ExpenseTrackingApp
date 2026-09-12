const store = require('../../utils/store')

const PAD_KEYS = [
  { id: '1', kind: 'num', value: '1', label: '1' },
  { id: '2', kind: 'num', value: '2', label: '2' },
  { id: '3', kind: 'num', value: '3', label: '3' },
  { id: 'del', kind: 'del', value: '', label: '' },
  { id: '4', kind: 'num', value: '4', label: '4' },
  { id: '5', kind: 'num', value: '5', label: '5' },
  { id: '6', kind: 'num', value: '6', label: '6' },
  { id: 'plus', kind: 'op', value: '+', label: '+' },
  { id: '7', kind: 'num', value: '7', label: '7' },
  { id: '8', kind: 'num', value: '8', label: '8' },
  { id: '9', kind: 'num', value: '9', label: '9' },
  { id: 'minus', kind: 'op', value: '-', label: '−' },
  { id: 'save', kind: 'save', value: '', label: '保存' },
  { id: 'dot', kind: 'num', value: '.', label: '.' },
  { id: '0', kind: 'num', value: '0', label: '0' },
  { id: '00', kind: 'num', value: '00', label: '00' }
]
const MAX_INT = 7
const MAX_DEC = 2

function lastOpIndex(value) {
  let idx = -1
  for (let i = 1; i < value.length; i++) {
    const ch = value.charAt(i)
    if (ch === '+' || ch === '-') idx = i
  }
  return idx
}

function nextNumber(current, key) {
  const value = current || ''
  if (key === '.') {
    if (value.indexOf('.') !== -1) return value
    return (value || '0') + '.'
  }

  const parts = value.split('.')
  const intPart = parts[0] || ''
  const decPart = parts[1] || ''
  const hasDec = value.indexOf('.') !== -1

  if (key === '00') {
    if (!value || value === '0') return value
    if (hasDec) return intPart + '.' + (decPart + '00').slice(0, MAX_DEC)
    if (intPart.length >= MAX_INT) return value
    if (intPart.length === MAX_INT - 1) return intPart + '0'
    return intPart + '00'
  }

  if (hasDec) {
    if (decPart.length >= MAX_DEC) return value
    return value + key
  }
  if (!value || value === '0') return key
  if (intPart.length >= MAX_INT) return value
  return value + key
}

function nextAmount(current, key) {
  const value = current || ''
  if (key === '+' || key === '-') {
    if (!value) return value
    const last = value.charAt(value.length - 1)
    if (last === '+' || last === '-') return value.slice(0, -1) + key
    if (last === '.') return value.slice(0, -1) + key
    return value + key
  }
  const opIndex = lastOpIndex(value)
  const prefix = opIndex === -1 ? '' : value.slice(0, opIndex + 1)
  const num = opIndex === -1 ? value : value.slice(opIndex + 1)
  const next = nextNumber(num, key)
  if (next === num) return value
  return prefix + next
}

function evalExpr(expr) {
  if (!expr) return 0
  let s = expr
  const last = s.charAt(s.length - 1)
  if (last === '+' || last === '-') s = s.slice(0, -1)
  if (!s) return 0
  let total = 0
  let sign = 1
  let i = 0
  if (s.charAt(0) === '-') {
    sign = -1
    i = 1
  }
  let buf = ''
  for (; i < s.length; i++) {
    const ch = s.charAt(i)
    if (ch === '+' || ch === '-') {
      total += sign * Number(buf || '0')
      sign = ch === '-' ? -1 : 1
      buf = ''
    } else {
      buf += ch
    }
  }
  if (buf) total += sign * Number(buf)
  return total
}

function formatResult(n) {
  if (!isFinite(n)) return '0'
  const rounded = Math.round(n * 100) / 100
  if (rounded === Math.floor(rounded)) return '' + rounded
  return rounded.toFixed(2)
}

function prefixYen(text) {
  let out = ''
  let needYen = true
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i)
    if (ch === '+' || ch === '-' || ch === '=') {
      out += ch
      needYen = true
    } else {
      if (needYen) {
        out += '¥'
        needYen = false
      }
      out += ch
    }
  }
  return out
}

function shortNoteLabel(note) {
  if (!note) return '备注'
  const text = note.length > 8 ? note.slice(0, 8) + '…' : note
  return '备注：' + text
}

function formatDisplay(expr) {
  if (!expr) return '¥0.00'
  const idx = lastOpIndex(expr)
  if (idx === -1 || idx === expr.length - 1) return prefixYen(expr)
  return prefixYen(expr + '=' + formatResult(evalExpr(expr)))
}

Page({
  data: {
    type: 'expense',
    amount: '',
    amountView: '0.00',
    categories: [],
    categoryId: '',
    categoryName: '',
    date: '',
    dateLabel: '',
    today: '',
    note: '',
    noteOpen: false,
    noteDraft: '',
    keyboardHeight: 0,
    padKeys: PAD_KEYS,
    sessionRecords: [],
    sessionText: '',
    saveAsBackTop: false,
    noteLabel: '备注'
  },

  onLoad() {
    const today = store.formatDate(new Date())
    const picked = store.pickCategory('expense')
    this.setData({
      date: today,
      today,
      dateLabel: store.formatPeriodLabel('day', today),
      categories: picked.categories,
      categoryId: picked.categoryId,
      categoryName: picked.categoryName
    })
    this.onKeyboardHeight = (res) => {
      if (this.data.noteOpen) {
        this.setData({ keyboardHeight: res.height || 0 })
      }
    }
  },

  onShow() {
    wx.onKeyboardHeightChange(this.onKeyboardHeight)
  },

  onHide() {
    wx.offKeyboardHeightChange(this.onKeyboardHeight)
    this.setData({ keyboardHeight: 0 })
  },

  onUnload() {
    wx.offKeyboardHeightChange(this.onKeyboardHeight)
  },

  applyAmount(amount) {
    this.setData({
      amount: amount,
      amountView: formatDisplay(amount)
    })
  },

  onSwitchType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.type) return
    const picked = store.pickCategory(type)
    this.setData({
      type: type,
      categories: picked.categories,
      categoryId: picked.categoryId,
      categoryName: picked.categoryName
    })
  },

  onKeyTap(e) {
    const kind = e.currentTarget.dataset.kind
    if (kind === 'del') {
      this.applyAmount((this.data.amount || '').slice(0, -1))
      return
    }
    if (kind === 'save') {
      this.onSaveBarTap()
      return
    }
    const amount = nextAmount(this.data.amount, e.currentTarget.dataset.key)
    if (amount !== this.data.amount) this.applyAmount(amount)
  },

  onKeyLong(e) {
    if (e.currentTarget.dataset.kind === 'del') this.applyAmount('')
  },

  onSelectCategory(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    this.setData({ categoryId: id, categoryName: name })
    store.rememberCategory(this.data.type, id)
  },

  onDateChange(e) {
    const date = e.detail.value
    this.setData({
      date: date,
      dateLabel: store.formatPeriodLabel('day', date)
    })
  },

  onOpenNote() {
    this.setData({ noteOpen: true, noteDraft: this.data.note, keyboardHeight: 0 })
  },

  onNoteDraft(e) {
    this.setData({ noteDraft: e.detail.value })
  },

  onNoteCancel() {
    this.setData({ noteOpen: false, keyboardHeight: 0 })
  },

  onNoteConfirm() {
    const note = (this.data.noteDraft || '').trim()
    this.setData({
      note: note,
      noteLabel: shortNoteLabel(note),
      noteOpen: false,
      keyboardHeight: 0
    })
  },

  onSave() {
    const amount = evalExpr(this.data.amount)
    if (!this.data.amount || Number.isNaN(amount) || amount <= 0) {
      wx.showToast({ title: '请输入金额', icon: 'none' })
      return
    }
    if (amount > 9999999.99) {
      wx.showToast({ title: '金额过大', icon: 'none' })
      return
    }

    const record = store.addRecord({
      type: this.data.type,
      amount: amount,
      categoryId: this.data.categoryId,
      categoryName: this.data.categoryName,
      note: this.data.note,
      date: this.data.date
    })

    this.applyAmount('')
    const picked = store.pickCategory(this.data.type)
    this.setData({
      note: '',
      noteLabel: '备注',
      categories: picked.categories,
      categoryId: picked.categoryId,
      categoryName: picked.categoryName
    })
    this.applySession([this.decorate(record), ...this.data.sessionRecords])
    wx.showToast({ title: '已记下', icon: 'none', duration: 900 })
  },

  decorate(record) {
    return {
      ...record,
      amountText: store.formatMoney(record.amount),
      sign: record.type === 'income' ? '+' : '-',
      dateText: store.formatPeriodLabel('day', record.date),
      icon: store.categoryIcon(record.categoryId)
    }
  },

  applySession(records) {
    const sum = store.summarize(records)
    let text = '本次已记 ' + records.length + ' 笔'
    if (sum.expense > 0) text += ' · 支 ¥' + store.formatMoney(sum.expense)
    if (sum.income > 0) text += ' · 收 ¥' + store.formatMoney(sum.income)
    this.setData({ sessionRecords: records, sessionText: text }, () => this.syncSaveMode())
  },

  onPageScroll() {
    this.syncSaveMode()
  },

  syncSaveMode() {
    if (this._syncingSaveMode) return
    this._syncingSaveMode = true
    wx.createSelectorQuery()
      .in(this)
      .select('.record-page')
      .boundingClientRect()
      .selectViewport()
      .boundingClientRect()
      .exec((res) => {
        this._syncingSaveMode = false
        const page = res[0]
        const viewport = res[1]
        if (!page || !viewport) return
        const scrollable = page.height > viewport.height + 24
        const atBottom = scrollable && page.bottom <= viewport.height + 8
        const saveAsBackTop = this.data.sessionRecords.length >= 2 && atBottom
        if (saveAsBackTop !== this.data.saveAsBackTop) {
          this.setData({ saveAsBackTop: saveAsBackTop })
        }
      })
  },

  onSaveBarTap() {
    if (this.data.saveAsBackTop) {
      this.onBackToTop()
      return
    }
    this.onSave()
  },

  onBackToTop() {
    this.setData({ saveAsBackTop: false })
    wx.pageScrollTo({ scrollTop: 0, duration: 200 })
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
        this.applySession(this.data.sessionRecords.filter((item) => item.id !== id))
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  onOpenSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  onGoStats() {
    wx.switchTab({ url: '/pages/stats/stats' })
  }
})
