import fs from 'fs'
import yaml from 'js-yaml'
import { parse } from 'graphql'
import { print } from 'graphql-print'
// @ts-ignore
import fsp from 'fs/promises'

export type LogOptions = {
    mode?: 'append' | 'overwrite'
    timestamp?: boolean
    dirPath?: string
    subDir?: string
}

async function exists(path: string) {
    try {
        await fsp.access(path)
        return true
    } catch {
        return false
    }
}

const getExtension = (fileName: string) => fileName.split('.').at(-1) || 'none'

export const logToFile = async (fileName_: string, object: any, options: LogOptions = {}) => {
    if (process.env.NODE_ENV === 'development') {
        let fileName = fileName_,
            subDir = options?.subDir
        const extension = getExtension(fileName)
        const { mode = 'overwrite', timestamp = false, dirPath } = options
        const envLogsDirPath = process.env.LOGS_PATH

        if (!envLogsDirPath) {
            console.warn('Please define LOGS_PATH in your .env file to enable logging')
            return
        }

        if (fileName.includes('/')) {
            subDir = fileName.split('/')[0]
            fileName = fileName.split('/')[1]
        }

        const logsDirPath = dirPath ?? (subDir ? `${envLogsDirPath}/${subDir}` : envLogsDirPath)

        if (!(await fs.existsSync(logsDirPath))) {
            fs.mkdirSync(logsDirPath, { recursive: true })
        }
        const fullPath = `${logsDirPath}/${fileName}`
        let contents
        if (typeof object === 'string') {
            contents = object
            if (['gql', 'graphql'].includes(extension)) {
                try {
                    const ast = parse(object)
                    contents = print(ast, { preserveComments: true })
                } catch (error: any) {
                    console.warn(
                        `‼️  logToFile ${fileName}: error when parsing GraphQL content (${JSON.stringify(
                            error.locations
                        )}).`
                    )
                }
            }
        } else {
            if (['yml', 'yaml'].includes(extension)) {
                contents = yaml.dump(object, { noRefs: true, skipInvalid: true })
            } else {
                contents = JSON.stringify(object, null, 2)
            }
        }
        if (!contents) {
            return
        }
        const now = new Date()
        const text = timestamp ? now.toString() + '\n---\n' + contents : contents
        if (mode === 'append') {
            const stream = fs.createWriteStream(fullPath, { flags: 'a' })
            stream.write(text + '\n')
            stream.end()
        } else {
            await fsp.writeFile(fullPath, text)
        }
    }
}
