import { useState, useEffect } from 'react'

type NumberInputProps = Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'type'
> & {
    value: number
    onChange: (value: number) => void
}

/**
 * Controlled numeric input that keeps its own text state so that erasing the
 * last digit leaves the field empty (instead of snapping back to "0" and then
 * producing values like "0456" when the user starts typing again).
 *
 * It still emits a plain `number` to the parent (empty string → 0), so callers
 * can keep storing numbers in their form state.
 */
export default function NumberInput({ value, onChange, ...rest }: NumberInputProps) {
    const [text, setText] = useState(() => String(value))

    // Sync when the external value changes to something the current text doesn't
    // represent (e.g. form reset, programmatic recalculation). Number('') === 0,
    // so an empty field is left untouched while the value is still 0.
    useEffect(() => {
        if (Number(text) !== value) setText(String(value))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value
        setText(raw)
        onChange(raw === '' ? 0 : Number(raw))
    }

    return <input type="number" value={text} onChange={handleChange} {...rest} />
}
