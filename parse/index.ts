import * as Fs from 'fs';
import * as Path from 'path';
import { camelCase, upperFirst } from 'lodash';
import * as rimraf from 'rimraf';

import * as Console from './helpers/console';
import GetComponents from './helpers/get-components';
import Component from './classes/component';
import ConstantStrings from './constant-strings';

const outputDirectory = Path.join(__dirname, '../', 'output');
const parseInit = () => {
    const rawComponents = GetComponents();

    const components: { [packageName: string]: Component[] } = Object.keys(rawComponents).reduce((obj, packageName) => ({...obj, [packageName]: rawComponents[packageName].map((jsonString: string) => {
            try {
                const json = JSON.parse(jsonString);
                Console.info(`Parsing ${Console.colors.yellow}${packageName}/${json.name || json.displayName}${Console.colors.reset}`);
                return new Component(jsonString);
            }
            catch (e) {
                console.log(e);
                Console.error(e);
                Console.error(jsonString);
                process.exit();
                return null;
            }
        })}), {});

    const rendered: { [packageName: string]: string } = Object.keys(components).reduce((obj, packageName) => ({... obj, [packageName]: components[packageName].map(c => {
            if (c == null) {
                return '';
            }
            Console.info(`Rendering ${Console.colors.yellow}${packageName}/${c.name}${Console.colors.reset}`);
            return c.render();
        }).join('\n')}), {});

    // Write Module files
    Object.keys(rendered).forEach(packageName => {
        Fs.writeFileSync(Path.join(outputDirectory, `${upperFirst(camelCase(packageName.replace('dx-react-', '')))}.re`), ConstantStrings + rendered[packageName]);
    });

    // Todo: Generate .rei files

};

rimraf.sync(Path.join(outputDirectory, '*.re'));
parseInit();
