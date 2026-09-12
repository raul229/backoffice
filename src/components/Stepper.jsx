import { steps } from '../lib/constants'

export default function Stepper({ currentStep }) {
  return (
    <ul className="steps steps-vertical lg:steps-horizontal w-full">
      {steps.map((step, index) => (
        <li key={step} className={`step ${index <= currentStep ? 'step-primary' : ''}`}>
          {step}
        </li>
      ))}
    </ul>
  )
}
