import * as fs from 'fs'

class CachedTextFiles {
    private caches = new Map<string, string>
    constructor(
    ) { }

    readFileSync(path: string, encoding: 'utf-8') {
        if (this.caches.has(path)) {
            return this.caches.get(path)
        }
        const text = fs.readFileSync(path, encoding)
        this.caches.set(path, text)
        return text
    }
    writeFileSync(path: string, text: string) {
        fs.writeFileSync(path, text)
        this.caches.set(path, text)
    }
    appendFileSync(path: string, text: string) {
        const currentText = this.readFileSync(path, 'utf-8')
        fs.appendFileSync(path, text)
        this.caches.set(path, currentText + text)
    }
}

export const fsc = process.env.YARLE_TEXT_CACHE === 'true' ? new CachedTextFiles() : fs
