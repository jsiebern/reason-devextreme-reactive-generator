import * as Path from 'path';
import * as Fs from 'fs';

const GetComponents = (): { [packageName: string]: string[] } => {
    const packages = [
        'dx-react-core',
        'dx-react-grid',
        'dx-react-grid-bootstrap3',
        'dx-react-grid-bootstrap4',
        'dx-react-grid-material-ui',
    ];
    const dir = Path.join(__dirname, '../', '../', 'output', 'json');

    const getJsonFiles = (path: string) => {
        const items = Fs.readdirSync(path);
        return items.filter(item => item.lastIndexOf('.json') === item.length - 5).map(item => Fs.readFileSync(Path.join(path, item), 'utf8'));
    };
    return packages.reduce((obj, packageName) => ({...obj, [packageName]: getJsonFiles(Path.join(dir, packageName))}), {});
};

export default GetComponents;