// i18n.ts
import { createI18n } from 'vue-i18n'

import zh from './zh-cn.json'
import en from './en-us.json'
import de from './de-de.json'

const messages = {
  en,
  zh,
  de
}

// 语言映射：将 zh-cn, en-us 映射到 i18n 的语言代码
const languageMap: { [key: string]: string } = {
  'zh-cn': 'zh',
  'en-us': 'en',
  'de-de': 'de'
}

// 初始化 i18n 实例
export const initializeI18n = (lng: string) => {
  let mappedLng = lng.toLowerCase()
  if (mappedLng.length > 2) {
    mappedLng = languageMap[mappedLng] || 'en' // 默认英文
  }

  i18n.global.locale.value = mappedLng as 'en' | 'zh' | 'de'
}

// 创建 i18n 实例
const i18n = createI18n({
  legacy: false,          // 使用 Composition API 模式
  locale: 'en',           // 默认语言
  fallbackLocale: 'en',   // 回退语言
  messages
})

export default i18n
