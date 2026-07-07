import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { SplitText } from 'gsap/SplitText'
import { Flip } from 'gsap/Flip'
import { CustomEase } from 'gsap/CustomEase'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin'

export function registerGsapPlugins(): void {
  gsap.registerPlugin(
    ScrollTrigger,
    ScrollToPlugin,
    SplitText,
    Flip,
    CustomEase,
    DrawSVGPlugin,
    MotionPathPlugin,
    MorphSVGPlugin,
  )
}
