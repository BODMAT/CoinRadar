import { useEffect, useState } from "react"

export function useTypeWriter(
    text: string,
    duration: number,
    delay: number = 0,
): string {
    const [displayed, setDisplayed] = useState("")
    useEffect(() => {
        setDisplayed("")

        const totalLength = text.length
        const interval = duration / totalLength

        let index = 0
        let intervalId: number
        const timeoutId = window.setTimeout(() => {
            intervalId = window.setInterval(() => {
                index++
                setDisplayed(text.slice(0, index))
                if (index === totalLength) clearInterval(intervalId)
            }, interval)
        }, delay)

        return () => {
            clearTimeout(timeoutId)
            clearInterval(intervalId)
        }
    }, [delay, text, duration])

    return displayed
}
