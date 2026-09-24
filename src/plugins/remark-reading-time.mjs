import { toString } from 'mdast-util-to-string'
import getReadingTime from 'reading-time'

// reading-time 以空格斷詞估算，CJK 文字沒有空格會被嚴重低估，
// 因此把 CJK 字元抽出來另外用「字元數 / 每分鐘閱讀字數」計算。
const CJK_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu
const CJK_CHARS_PER_MINUTE = 400

export function remarkReadingTime() {
  return (tree, { data }) => {
    const textOnPage = toString(tree)

    const cjkCharCount = (textOnPage.match(CJK_PATTERN) || []).length
    const textWithoutCJK = textOnPage.replace(CJK_PATTERN, ' ')

    const totalMinutes = getReadingTime(textWithoutCJK).minutes
      + cjkCharCount / CJK_CHARS_PER_MINUTE

    data.astro.frontmatter.minutes = Math.max(1, Math.round(totalMinutes))
  }
}
