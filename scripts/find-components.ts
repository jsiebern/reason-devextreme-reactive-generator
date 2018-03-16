const fs = require('fs');
const path = require('path');
import Env from './env';

const exportRegex = /from '\.([a-z-\/]*)';/g;

// Returns the component source in a flat array.
// function findComponents(directory = path.resolve(__dirname, '../../../../src'), components = []) {
export default function findComponents(directory = `${Env.ReactivePath}/packages/`) {
    const items = fs.readdirSync(directory);

    const packages: { [packageName: string]: string[] } = {};

    items.forEach((packageName: string) => {
        const indexPath = path.resolve(directory, packageName, 'src');
        const indexFilePath = path.resolve(indexPath, 'index.js');
        if (!fs.existsSync(indexFilePath)) {
            return;
        }
        const indexFile = fs.readFileSync(indexFilePath, 'utf8');
        let m;

        packages[packageName] = [];
        while ((m = exportRegex.exec(indexFile)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === exportRegex.lastIndex) {
                exportRegex.lastIndex++;
            }

            // The result can be accessed through the `m`-variable.
            packages[packageName].push(path.join(indexPath, m[1]));
        }
    });

    return packages;
}
