import logoMark from '../assets/logo-mark.png'

export default function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
      <img src={logoMark} alt="" width={26} height={26} className="shrink-0" />
      Telonote
    </span>
  )
}
