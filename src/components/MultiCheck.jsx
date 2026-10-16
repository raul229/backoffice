export default function MultiCheck({ label, options, selected, onChange, disabled = false }) {
  return (
    <fieldset className="mb-3 text-sm" disabled={disabled}>
      {label ? <legend className="mb-1 text-slate-500">{label}</legend> : null}
      <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
        {options.map((opt) => {
          const checked = selected.includes(opt.value)
          return (
            <label
              key={opt.value}
              className={`rounded-full px-2 py-1 text-xs ${
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              } ${checked ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}
            >
              <input
                className="sr-only"
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  if (disabled) return
                  if (checked) onChange(selected.filter((v) => v !== opt.value))
                  else onChange([...selected, opt.value])
                }}
              />
              {opt.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
