export default function Field({ form, name, children, validators }) {
  return (
    <form.Field name={name} validators={validators ? { onChange: validators, onBlur: validators } : undefined}>
      {children}
    </form.Field>
  )
}
