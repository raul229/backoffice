export function FieldError({ meta }) {
  if (!meta?.isTouched || meta?.isValid) {
    return null
  }

  return <p className="label text-error text-xs">{meta.errors.join(', ')}</p>
}

export function TextField({
  field,
  label,
  type = 'text',
  placeholder,
  inputMode,
  maxLength,
}) {
  return (
    <label className="form-control w-full">
      <span className="label-text font-medium">{label}</span>
      <input
        className={`input input-bordered w-full ${field.state.meta.isTouched && !field.state.meta.isValid ? 'input-error' : ''}`}
        inputMode={inputMode}
        maxLength={maxLength}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={field.state.value}
      />
      <FieldError meta={field.state.meta} />
    </label>
  )
}

export function SelectField({ field, label, options, placeholder = 'Selecciona' }) {
  return (
    <label className="form-control w-full">
      <span className="label-text font-medium">{label}</span>
      <select
        className={`select select-bordered w-full ${field.state.meta.isTouched && !field.state.meta.isValid ? 'select-error' : ''}`}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        value={field.state.value}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError meta={field.state.meta} />
    </label>
  )
}
