const fs = require('fs');
const path = require('path');
import Env from './env';

const exportRegex = /from '\.([a-z-\/]*)';/g;

export default function findComponents(directory = `${Env.ReactivePath}/packages/`) {
    const items = fs.readdirSync(directory);

    const packages: { [packageName: string]: string[] } = {};

    items.forEach((packageName: string) => {
        if (packageName.indexOf('dx-react') < 0) {
            return;
        }

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
            const name = path.basename(m[1]);
            const docsPath = path.join(directory, packageName, 'docs', 'reference', name + '.md');
            if (fs.existsSync(docsPath)) {
                packages[packageName].push(docsPath);
            }
        }
    });

    return packages;
}
