function asValidators(validators) {
  if (!validators) return undefined
  if (typeof validators === 'function' || validators['~standard']) {
    return { onChange: validators, onBlur: validators }
  }
  return validators
}

export default function Field({ form, name, children, validators, listeners }) {
  return (
    <form.Field name={name} listeners={listeners} validators={asValidators(validators)}>
      {children}
    </form.Field>
  )
}
