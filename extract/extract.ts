import * as Console from './../parse/helpers/console';
import ensureFolderExists from './ensure-folder-exists';
import * as rimraf from 'rimraf';
import { kebabCase } from 'lodash';
import * as path from 'path';
// @ts-ignore
import { readFileSync, existsSync, writeFileSync } from 'fs';

import analyse from './analyse-components';

// Extract Packages
const apis = analyse();

// Write JSON files
const outputDirectory = path.join(__dirname, '../', 'output', 'json');
rimraf.sync(outputDirectory);
ensureFolderExists(outputDirectory, 0o744, err => {
    if (err) {
        console.log(err);
        return;
    }
    Object.keys(apis).forEach(key => {
        const folder = path.join(outputDirectory, key);
        ensureFolderExists(folder, 0o744, err => {
            if (err) {
                console.log(err);
                return;
            }

            apis[key].forEach(obj => {
                Console.info(`writeJSON: Writing file ${key}/${kebabCase(obj.displayName)}.json`);

                writeFileSync(path.resolve(folder, `${kebabCase(obj.displayName)}.json`), JSON.stringify(obj));
            });
        });
    });
});