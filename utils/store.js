const STORAGE_KEY = 'expense_records_v1'
const PROFILE_KEY = 'expense_profile_v1'
const FEEDBACK_KEY = 'expense_feedback_v1'
const LAST_CAT_KEY = 'expense_last_cats_v1'

const ICON_DIR = '/assets/icons/'

const EXPENSE_CATEGORIES = [
  { id: 'food', name: '餐饮', icon: ICON_DIR + 'cat-food.png' },
  { id: 'transport', name: '交通', icon: ICON_DIR + 'cat-transport.png' },
  { id: 'shopping', name: '购物', icon: ICON_DIR + 'cat-shopping.png' },
  { id: 'housing', name: '居住', icon: ICON_DIR + 'cat-housing.png' },
  { id: 'fun', name: '娱乐', icon: ICON_DIR + 'cat-fun.png' },
  { id: 'health', name: '医疗', icon: ICON_DIR + 'cat-health.png' },
  { id: 'edu', name: '学习', icon: ICON_DIR + 'cat-edu.png' },
  { id: 'other_out', name: '其他', icon: ICON_DIR + 'cat-other.png' }
]

const INCOME_CATEGORIES = [
  { id: 'salary', name: '工资', icon: ICON_DIR + 'cat-salary.png' },
  { id: 'side', name: '兼职', icon: ICON_DIR + 'cat-side.png' },
  { id: 'invest', name: '理财', icon: ICON_DIR + 'cat-invest.png' },
  { id: 'gift', name: '红包', icon: ICON_DIR + 'cat-gift.png' },
  { id: 'other_in', name: '其他', icon: ICON_DIR + 'cat-other.png' }
]

const CATEGORY_ICON_MAP = {}
EXPENSE_CATEGORIES.concat(INCOME_CATEGORIES).forEach((item) => {
  CATEGORY_ICON_MAP[item.id] = item.icon
})

function categoryIcon(id) {
  return CATEGORY_ICON_MAP[id] || ICON_DIR + 'cat-other.png'
}

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}

function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatMonth(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

function formatYear(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}`
}

function formatMoney(n) {
  const num = Number(n) || 0
  return num.toFixed(2)
}

function getRecords() {
  try {
    const list = wx.getStorageSync(STORAGE_KEY)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function saveRecords(list) {
  wx.setStorageSync(STORAGE_KEY, list)
}

function addRecord(record) {
  const list = getRecords()
  const item = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: record.type,
    amount: Number(record.amount),
    categoryId: record.categoryId,
    categoryName: record.categoryName,
    note: (record.note || '').trim(),
    date: record.date,
    createdAt: Date.now()
  }
  list.unshift(item)
  saveRecords(list)
  rememberCategory(record.type, record.categoryId)
  return item
}

function deleteRecord(id) {
  const list = getRecords().filter((item) => item.id !== id)
  saveRecords(list)
  return list
}

function getLastCats() {
  try {
    const data = wx.getStorageSync(LAST_CAT_KEY)
    return data && typeof data === 'object' ? data : {}
  } catch (e) {
    return {}
  }
}

function rememberCategory(type, categoryId) {
  const data = getLastCats()
  data[type] = categoryId
  const recentKey = type === 'income' ? 'recentIncome' : 'recentExpense'
  const recent = data[recentKey] || []
  const next = [categoryId]
  recent.forEach((id) => {
    if (id !== categoryId && next.length < 3) next.push(id)
  })
  data[recentKey] = next
  wx.setStorageSync(LAST_CAT_KEY, data)
}

function lastCategoryId(type) {
  const data = getLastCats()
  return data[type] || ''
}

function getCategories(type) {
  const all = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const data = getLastCats()
  const recent = (type === 'income' ? data.recentIncome : data.recentExpense) || []
  const map = {}
  all.forEach((item) => {
    map[item.id] = item
  })
  const head = []
  recent.forEach((id) => {
    if (map[id]) head.push(map[id])
  })
  const rest = all.filter((item) => recent.indexOf(item.id) === -1)
  return head.concat(rest)
}

function pickCategory(type) {
  const list = getCategories(type)
  const last = lastCategoryId(type)
  let i = 0
  for (; i < list.length; i++) {
    if (list[i].id === last) break
  }
  if (i === list.length) i = 0
  return { categories: list, categoryId: list[i].id, categoryName: list[i].name }
}

function exportCsv() {
  const records = getRecords().slice().sort((a, b) => {
    if (a.date === b.date) return b.createdAt - a.createdAt
    return a.date < b.date ? 1 : -1
  })
  const lines = ['日期,类型,分类,金额,备注']
  records.forEach((item) => {
    const typeName = item.type === 'income' ? '收入' : '支出'
    const note = '"' + (item.note || '').replace(/"/g, '""') + '"'
    lines.push([item.date, typeName, item.categoryName, formatMoney(item.amount), note].join(','))
  })
  return '\uFEFF' + lines.join('\n')
}

function summarize(records) {
  let expense = 0
  let income = 0
  records.forEach((item) => {
    if (item.type === 'income') income += item.amount
    else expense += item.amount
  })
  return {
    expense,
    income,
    balance: income - expense
  }
}

function groupByDate(records) {
  const map = {}
  records.forEach((item) => {
    if (!map[item.date]) map[item.date] = []
    map[item.date].push(item)
  })
  return Object.keys(map)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((date) => {
      const items = map[date]
      const daySum = summarize(items)
      return {
        date,
        label: formatDayLabel(date),
        expense: daySum.expense,
        income: daySum.income,
        items
      }
    })
}

function formatDayLabel(dateStr) {
  const today = formatDate(new Date())
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = formatDate(yesterdayDate)
  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'
  const parts = dateStr.split('-')
  return `${Number(parts[1])}月${Number(parts[2])}日`
}

function shiftMonth(month, offset) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + offset, 1)
  return formatMonth(d)
}

const PERIOD_LEN = { day: 10, month: 7, year: 4 }

function currentPeriod(scope) {
  const now = new Date()
  if (scope === 'year') return formatYear(now)
  if (scope === 'day') return formatDate(now)
  return formatMonth(now)
}

function shiftPeriod(scope, period, offset) {
  if (scope === 'year') return `${Number(period) + offset}`
  if (scope === 'day') {
    const [y, m, d] = period.split('-').map(Number)
    return formatDate(new Date(y, m - 1, d + offset))
  }
  return shiftMonth(period, offset)
}

function formatPeriodLabel(scope, period) {
  if (scope === 'year') return `${period}年`
  if (scope === 'month') {
    const [y, m] = period.split('-')
    return `${y}年${Number(m)}月`
  }
  const dayLabel = formatDayLabel(period)
  if (dayLabel === '今天' || dayLabel === '昨天') return dayLabel
  const [y, m, d] = period.split('-')
  if (Number(y) === new Date().getFullYear()) return `${Number(m)}月${Number(d)}日`
  return `${y}年${Number(m)}月${Number(d)}日`
}

function getPeriodRecords(scope, period) {
  const len = PERIOD_LEN[scope] || 7
  return getRecords().filter((item) => item.date.slice(0, len) === period)
}

// 日历控件在不同维度下返回的精度不一致，统一裁到当前维度
function normalizePeriod(scope, value) {
  return `${value}`.slice(0, PERIOD_LEN[scope] || 7)
}

// 切换查看维度时尽量停在同一段时间，且不越过今天
function convertPeriod(scope, period) {
  const year = period.slice(0, 4)
  const month = period.length >= 7 ? period.slice(5, 7) : '12'
  let next = year
  if (scope === 'month') {
    next = `${year}-${month}`
  } else if (scope === 'day') {
    const lastDay = new Date(Number(year), Number(month), 0).getDate()
    next = `${year}-${month}-${pad(lastDay)}`
  }
  const current = currentPeriod(scope)
  return next > current ? current : next
}

// 按年查看时的月度汇总，点进去可下钻到某个月
function monthSummaries(year) {
  const map = {}
  getPeriodRecords('year', year).forEach((item) => {
    const key = item.date.slice(0, 7)
    if (!map[key]) map[key] = []
    map[key].push(item)
  })
  return Object.keys(map)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((month) => {
      const sum = summarize(map[month])
      return {
        month,
        label: `${Number(month.slice(5))}月`,
        count: map[month].length,
        expense: sum.expense,
        income: sum.income
      }
    })
}

function searchRecords(keyword) {
  const kw = `${keyword || ''}`.trim().toLowerCase()
  if (!kw) return []
  return getRecords()
    .filter((item) => {
      return (
        item.categoryName.toLowerCase().includes(kw) ||
        (item.note || '').toLowerCase().includes(kw) ||
        item.date.includes(kw) ||
        `${item.amount}`.includes(kw)
      )
    })
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))
}

function getProfile() {
  try {
    const profile = wx.getStorageSync(PROFILE_KEY)
    return profile && typeof profile === 'object' ? profile : null
  } catch (e) {
    return null
  }
}

function saveProfile(profile) {
  const merged = { ...(getProfile() || {}), ...profile }
  wx.setStorageSync(PROFILE_KEY, merged)
  return merged
}

function clearProfile() {
  wx.removeStorageSync(PROFILE_KEY)
}

function addFeedback(feedback) {
  let list = []
  try {
    const saved = wx.getStorageSync(FEEDBACK_KEY)
    if (Array.isArray(saved)) list = saved
  } catch (e) {
    list = []
  }
  list.unshift({
    content: (feedback.content || '').trim(),
    contact: (feedback.contact || '').trim(),
    createdAt: Date.now()
  })
  wx.setStorageSync(FEEDBACK_KEY, list)
  return list
}

function getFeedbackCount() {
  try {
    const saved = wx.getStorageSync(FEEDBACK_KEY)
    return Array.isArray(saved) ? saved.length : 0
  } catch (e) {
    return 0
  }
}

// 我的页面展示用：总笔数、记账天数、首次记账日期
function getOverallStats() {
  const records = getRecords()
  const days = {}
  records.forEach((item) => {
    days[item.date] = true
  })
  const dates = Object.keys(days).sort()
  return {
    count: records.length,
    days: dates.length,
    firstDate: dates[0] || ''
  }
}

// 已经过去的天数，用于算日均；未来周期返回 0，已结束周期返回整周期天数
function elapsedDays(scope, period) {
  const now = new Date()
  if (scope === 'day') {
    return period > formatDate(now) ? 0 : 1
  }
  if (scope === 'year') {
    const year = Number(period)
    if (year > now.getFullYear()) return 0
    if (year < now.getFullYear()) return daysInYear(year)
    return Math.floor((now - new Date(year, 0, 1)) / 86400000) + 1
  }
  const [year, month] = period.split('-').map(Number)
  const total = new Date(year, month, 0).getDate()
  const nowMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
  if (period < nowMonth) return total
  if (period > nowMonth) return 0
  return now.getDate()
}

function daysInYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
}

function categoryStats(records, type) {
  const filtered = records.filter((item) => item.type === type)
  const total = filtered.reduce((sum, item) => sum + item.amount, 0)
  const map = {}
  filtered.forEach((item) => {
    if (!map[item.categoryId]) {
      map[item.categoryId] = {
        id: item.categoryId,
        name: item.categoryName,
        amount: 0
      }
    }
    map[item.categoryId].amount += item.amount
  })
  return Object.values(map)
    .sort((a, b) => b.amount - a.amount)
    .map((item) => ({
      ...item,
      percent: total > 0 ? Math.round((item.amount / total) * 100) : 0,
      ratio: total > 0 ? item.amount / total : 0,
      icon: categoryIcon(item.id)
    }))
    // 金额太小四舍五入成 0% 的分类，条形图看不见、标签也没意义，不进构成列表
    .filter((item) => item.percent > 0)
}

// 单项占比超过 limit 时触发对应建议
const CATEGORY_ADVICE = {
  food: {
    limit: 35,
    text: (p) => `餐饮占了 ${p}%，外卖和外食偏多。每周自己做两三顿，一个月能省下不少`
  },
  shopping: {
    limit: 30,
    text: (p) => `购物占了 ${p}%。给非必需品设一个 24 小时冷静期，冲动消费会明显减少`
  },
  fun: {
    limit: 20,
    text: (p) => `娱乐占了 ${p}%。先定一个娱乐预算上限，花完就停，比事后后悔容易`
  },
  housing: {
    limit: 50,
    text: (p) => `居住占了 ${p}%，固定成本偏重，其他开支需要更谨慎一些`
  },
  transport: {
    limit: 25,
    text: (p) => `交通占了 ${p}%。看看通勤方式能不能换，或者办张月卡更划算`
  },
  health: {
    limit: 30,
    text: (p) => `医疗占了 ${p}%。先照顾好身体，也可以了解一下补充医疗险`
  },
  edu: {
    limit: 30,
    text: (p) => `学习占了 ${p}%。这笔投入通常值得，留意别挤压到日常生活开支`
  },
  other_out: {
    limit: 40,
    text: (p) => `「其他」占了 ${p}%。记账时选更具体的分类，复盘才看得清钱花在哪`
  }
}

const MAX_ADVICE = 3

function buildAdvice(records, scope, period) {
  const sum = summarize(records)
  if (sum.expense <= 0) return []

  const unit = scope === 'year' ? '年' : scope === 'day' ? '日' : '月'
  const stats = categoryStats(records, 'expense')
  const list = []

  if (sum.income > 0) {
    const rate = Math.round((sum.balance / sum.income) * 100)
    if (rate < 0) {
      list.push({
        tone: 'warn',
        text: `本${unit}支出超出收入 ¥${formatMoney(-sum.balance)}，先从占比最高的一项开始压缩`
      })
    } else if (rate < 10) {
      list.push({
        tone: 'warn',
        text: `结余率只有 ${rate}%，建议收入到账当天就先存下 10%，剩下的再花`
      })
    } else if (rate >= 30) {
      list.push({
        tone: 'good',
        text: `结余率 ${rate}%，储蓄节奏很健康，保持住`
      })
    }
  }

  // 单日样本太小，占比和日均容易误导，只保留结余判断
  if (scope !== 'day') {
    const triggered = stats.filter((item) => {
      const rule = CATEGORY_ADVICE[item.id]
      return rule && item.percent >= rule.limit
    })

    // 最大项占比过半时单独提醒；若该项已有专属建议，就不再重复说一遍集中度
    const top = stats[0]
    const topHasRule = triggered.some((item) => item.id === top.id)
    if (stats.length > 1 && top.percent >= 50 && !topHasRule) {
      list.push({
        tone: 'warn',
        text: `${top.name}一项就占了 ${top.percent}%，支出过于集中，值得拆开看看有没有能取消的部分`
      })
    }

    triggered.forEach((item) => {
      list.push({ tone: 'warn', text: CATEGORY_ADVICE[item.id].text(item.percent) })
    })

    const days = elapsedDays(scope, period)
    if (days > 0) {
      list.push({
        tone: 'info',
        text: `日均支出 ¥${formatMoney(sum.expense / days)}，已记 ${days} 天`
      })
    }
  }

  return list.slice(0, MAX_ADVICE)
}

module.exports = {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  formatDate,
  formatMonth,
  formatYear,
  formatMoney,
  getRecords,
  addRecord,
  deleteRecord,
  getCategories,
  rememberCategory,
  lastCategoryId,
  pickCategory,
  exportCsv,
  getPeriodRecords,
  currentPeriod,
  shiftPeriod,
  convertPeriod,
  normalizePeriod,
  formatPeriodLabel,
  elapsedDays,
  summarize,
  groupByDate,
  monthSummaries,
  categoryStats,
  buildAdvice,
  searchRecords,
  getProfile,
  saveProfile,
  clearProfile,
  addFeedback,
  getFeedbackCount,
  getOverallStats,
  categoryIcon
}
