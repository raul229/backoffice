export default function SectionTitle({ title, detail }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-semibold text-base-content">{title}</h2>
      <p className="text-sm text-base-content/65">{detail}</p>
    </div>
  )
}
