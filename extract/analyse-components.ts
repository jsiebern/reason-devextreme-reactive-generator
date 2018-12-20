// @ts-ignore
import * as reactDocgen from 'react-docgen';
import findComponents from './find-components';
import findComponentDocs from './find-component-docs';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import * as Console from './../parse/helpers/console';

import DocPropsParser from './doc-props-parser';
const components = findComponents();
const componentDocs = findComponentDocs();

type apiListType = { [packageName: string]: ComponentSignature[] };
type apiListLookup = Array<{
    package: string;
    basename: string,
    importPath: string,
    lookupKey: string,
    lookupName: string,
    lookupPackage: string,
    passedComponents: string,
}>;

const getApis = (): apiListType => {
    const apis: apiListType = {};
    const lookup: apiListLookup = [];
    Object.keys(components).forEach(key => {
        apis[key] = [];
        components[key].forEach(componentPath => {
            let src = '';
            ['.js', '.jsx'].forEach(ext => {
                if (existsSync(componentPath + ext)) {
                    src = readFileSync(componentPath + ext, 'utf8');
                }
            });
            if (!src) {
                return;
            }

            if (!src.includes('withComponents')) {
                let reactAPI;
                try {
                    reactAPI = reactDocgen.parse(src);
                    reactAPI.basename = path.basename(componentPath);
                    reactAPI.importPath = `@devexpress/${key}`;
                    reactAPI.importName = reactAPI.displayName;
                    reactAPI.src = src;
                    apis[key].push(reactAPI);
                } catch (err) {
                }
            } else {
                // With Component
                const re = /withComponents\({([\s\S]*)}\)\(([a-zA-Z0-9]*)\)/;
                const matches = re.exec(src);
                if (matches) {
                    const importAsRe = new RegExp(`import { ([a-zA-Z0-9]*) as ${matches[2].split('With')[0]}B?a?s?e? } from '(.*)';`);
                    const importAsMatches = importAsRe.exec(src);
                    if (importAsMatches) {
                        lookup.push({
                            package: key,
                            basename: path.basename(componentPath),
                            importPath: `@devexpress/${key}`,
                            lookupKey: key,
                            lookupName: importAsMatches[1],
                            lookupPackage: importAsMatches[2],
                            passedComponents: matches[1],
                        });
                    }
                }
            }
        });
    });
    lookup.forEach(l => {
        if (typeof apis[l.lookupKey].find(a => a.basename === l.basename) !== 'undefined') {
            return;
        }

        const key = l.lookupPackage.replace('@devexpress/', '');
        const getFrom = apis[key].find(api => api.importName === l.lookupName);
        if (getFrom) {
            const re = /\.components = ([\s\S]*);/i;
            const matches = re.exec(getFrom.src || '');
            if (!matches) {
                return;
            }
            const components = Object.keys(eval(`(${matches[1]})`)).map(c => c.toLowerCase());
            apis[l.lookupKey].push({
                ...getFrom,
                basename: l.basename,
                importPath: l.importPath,
                props: Object.keys(getFrom.props).reduce((prev, key) => {
                    const prop = getFrom.props[key];
                    prev[key] = {
                        ...prop,
                        required: !components.includes(key.toLowerCase()),
                    };
                    return prev;
                }, {}),
            });
        }
    });

    return apis;
};

const mergeDocsIntoApis = (apis: apiListType) => {
    Object.keys(apis).forEach(packageName => {
        if (!componentDocs[packageName].length) {
            return;
        }
        const list = apis[packageName];
        if (list.length) {
            const docPaths = componentDocs[packageName];
            const dependencyResolver = (linkName: string, linkIdentifier: string): false | DocPropsParser => {
                const identParts = linkIdentifier.split('#');
                if (identParts[0].indexOf('.md') > -1) {
                    const depDoc = docPaths.find(d => d.indexOf(identParts[0]) > -1);
                    if (depDoc != null) {
                        return new DocPropsParser(readFileSync(depDoc, 'utf8'), dependencyResolver);
                    }
                }

                return false;
            };
            list.forEach((api, i) => {
                const doc = docPaths.find(docPath => path.basename(docPath).replace('.md', '') === api.basename);
                if (doc != null) {
                    Console.info(`mergeDocsIntoApis: Parsing file: ${doc}`);
                    const docContents = readFileSync(doc, 'utf8');

                    // Detect doc props
                    const parser = new DocPropsParser(docContents, dependencyResolver);
                    const props = parser.props;

                    props.forEach(prop => {
                        let found = false;
                        Object.keys(apis[packageName][i].props).forEach(propKey => {
                            if (!found && prop.name === propKey) {
                                found = true;
                            }
                        });

                        if (found) {
                            apis[packageName][i].props[prop.name].type = prop.parsedType;
                            apis[packageName][i].props[prop.name].description = prop.description;
                            apis[packageName][i].props[prop.name].required = !prop.optional;
                            apis[packageName][i].props[prop.name].defaultValue = {
                                value: prop.def || '',
                                computed: false,
                            };
                        }
                        else {
                            apis[packageName][i].props[prop.name] = {
                                type: prop.parsedType,
                                description: prop.description,
                                required: !prop.optional,
                                defaultValue: {
                                    value: prop.def || '',
                                    computed: false,
                                },
                            };
                        }
                    });
                }
                else {
                    Console.error(`mergeDocsIntoApis: Could not find matching doc file for ${api.basename}`);
                }
            });
        }
    });

    return apis;
};

const mergeUiGrids = (apis: apiListType) => {
    const mergeFrom = apis['dx-react-grid'];
    const mergeTo: apiListType = {
        'dx-react-grid-bootstrap3': apis['dx-react-grid-bootstrap3'],
        'dx-react-grid-bootstrap4': apis['dx-react-grid-bootstrap4'],
        'dx-react-grid-material-ui': apis['dx-react-grid-material-ui'],
    };

    Object.keys(mergeTo).forEach(packageName => {
        mergeTo[packageName] = mergeTo[packageName].map(component => {
            const from = mergeFrom.find(mergeComponent => mergeComponent.basename === component.basename);
            if (from != null) {
                component.props = Object.keys(from.props).reduce((obj, propKey) => {
                    const fromProp = from.props[propKey];
                    if (component.props == null || component.props[propKey] == null || !component.props[propKey].required) {
                        fromProp.required = false;
                    }
                    return { ...obj, [propKey]: fromProp };
                }, {});
            }

            return component;
        });
    });

    return apis;
};

export default function () {
    let apis = getApis();
    apis = mergeDocsIntoApis(apis);
    apis = mergeUiGrids(apis);

    return apis;
}