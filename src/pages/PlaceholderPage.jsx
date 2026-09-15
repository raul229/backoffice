export default function PlaceholderPage({ title, detail }) {
  return (
    <section className="bo-card p-6 sm:p-8">
      <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
      <p className="mt-2 text-slate-500">{detail}</p>
    </section>
  )
}
