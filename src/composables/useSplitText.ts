import { onUnmounted, type Ref } from 'vue'
import SplitText from 'gsap/SplitText'

interface UseSplitTextOptions {
  type?: string
  linesClass?: string
  wordsClass?: string
  charsClass?: string
}

export function useSplitText(
  target: Ref<HTMLElement | null>,
  options?: UseSplitTextOptions,
) {
  let split: SplitText | null = null

  function splitText(): SplitText | null {
    if (!target.value) return null
    split = SplitText.create(target.value, {
      type: options?.type ?? 'lines,words,chars',
      linesClass: options?.linesClass ?? 'split-line',
      wordsClass: options?.wordsClass ?? 'split-word',
      charsClass: options?.charsClass ?? 'split-char',
    })
    return split
  }

  onUnmounted(() => {
    split?.revert()
  })

  return { splitText }
}
