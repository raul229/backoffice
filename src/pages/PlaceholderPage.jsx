export default function PlaceholderPage({ title, detail }) {
  return (
    <section className="bo-card p-8">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-slate-500">{detail}</p>
    </section>
  )
}
