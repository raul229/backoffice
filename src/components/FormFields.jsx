function errorMessage(error) {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (typeof error.message === 'string') return error.message
  if (Array.isArray(error.issues)) return error.issues.map(errorMessage).filter(Boolean).join(', ')
  return String(error)
}

export function FieldError({ meta }) {
  if (!meta?.isTouched || meta?.isValid) return null
  const messages = (meta.errors ?? []).map(errorMessage).filter(Boolean)
  if (!messages.length) return null
  return <p className="mt-1 text-xs text-rose-600">{messages.join(', ')}</p>
}

export function TextField({
  field,
  label,
  type = 'text',
  placeholder,
  inputMode,
  maxLength,
  autoComplete,
  className = '',
}) {
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid
  return (
    <label className={`text-sm ${className}`}>
      {label ? <span className="mb-1 block text-slate-500">{label}</span> : null}
      <input
        autoComplete={autoComplete}
        className={`input input-bordered w-full ${invalid ? 'input-error' : ''}`}
        inputMode={inputMode}
        maxLength={maxLength}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={field.state.value ?? ''}
      />
      <FieldError meta={field.state.meta} />
    </label>
  )
}

export function SelectField({
  field,
  label,
  options,
  placeholder = 'Selecciona',
  multiple = false,
  includeEmpty = !multiple,
  className = '',
}) {
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid
  return (
    <label className={`text-sm ${className}`}>
      {label ? <span className="mb-1 block text-slate-500">{label}</span> : null}
      <select
        className={`select select-bordered w-full ${invalid ? 'select-error' : ''}`}
        multiple={multiple}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) =>
          field.handleChange(
            multiple
              ? Array.from(event.target.selectedOptions, (option) => option.value)
              : event.target.value,
          )
        }
        value={field.state.value ?? (multiple ? [] : '')}
      >
        {includeEmpty ? <option value="">{placeholder}</option> : null}
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

export function CheckboxField({ field, label, disabled = false, className = '' }) {
  return (
    <label className={`flex items-center gap-2 text-sm ${className}`}>
      <input
        checked={Boolean(field.state.value)}
        className="checkbox checkbox-sm"
        disabled={disabled}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  )
}

export function TextAreaField({ field, label, rows = 3, className = '' }) {
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid
  return (
    <label className={`text-sm ${className}`}>
      {label ? <span className="mb-1 block text-slate-500">{label}</span> : null}
      <textarea
        className={`textarea textarea-bordered w-full ${invalid ? 'textarea-error' : ''}`}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        rows={rows}
        value={field.state.value ?? ''}
      />
      <FieldError meta={field.state.meta} />
    </label>
  )
}
