import * as path from 'path';

import Result from '../common/result';
import FileHandler from '../io/fileHandler';
import { EOL } from 'os';

export default class GlobalUsingFinder {
    public static async find(projectFilePath: string, frameworkVersion: string): Promise<Result<string[]>> {
        const projectFolder = path.dirname(projectFilePath);
        const buildFolder = path.resolve(projectFolder, 'obj', 'Debug', frameworkVersion);

        const buildFolderExists = FileHandler.fileExists(buildFolder);
        if (!buildFolderExists) {
            return Result.error<string[]>('FindObjPathError', `Impossible to find obj folder ${buildFolder}`);
        }

        let globalUsingFilePath;
        try {
            globalUsingFilePath = await FileHandler.readDirectory(buildFolder);
        } catch (e) {
            const readingDirectoryError = e as Error;

            return Result.error<string[]>('ReadObjDirectoryError', readingDirectoryError.toString());
        }

        const globalUsingPath = globalUsingFilePath?.find(fp => fp.includes('GlobalUsings.g.cs'));

        if (!globalUsingPath) {
            return Result.error<string[]>('FileNotFoundError', 'GlobalUsings.g.cs not found');
        }

        const globalUsingsContent = await FileHandler.read(path.resolve(buildFolder, globalUsingPath));
        const globalUsings = globalUsingsContent.split(EOL)
            .filter(g => g.startsWith('global'))
            .map(g => g.replace('global using global::', ''))
            .map(g => g.replace(';', ''));

        return Result.ok<string[]>(globalUsings);
    }
}
