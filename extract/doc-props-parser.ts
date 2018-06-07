import * as he from 'he';
import { isPrimitive } from '../parse/helpers/identify-prop-type';
import * as Console from './../parse/helpers/console';

type docSection = { [sectionName: string]: string };
type docDependencyResolver = (linkName: string, linkIdentifier: string) => DocPropsParser | false;

export default class DocPropsParser {
    private _rawDoc: string;
    private _docSections: docSection;
    private _props: docProp[] = [];
    private _dependencyResolver: docDependencyResolver | null;

    constructor(doc: string, dependencyResolver: docDependencyResolver | null = null) {
        this._dependencyResolver = dependencyResolver;
        this._rawDoc = doc;
        this.extractSections();
        this._props = this.extractProps('Properties');
    }

    public get props() {
        this.parseProps();
        return this._props;
    }

    parseProps = () => {
        this._props = this._props.map(prop => {
            prop.parsedType = this.parsePropType(prop.type);
            return prop;
        });
    };

    parsePropType = (propType: docProp['type']): PropType => {
        const typeTests = {
            func: /\((.*)\) => (.*)/g,
            componentType: /ComponentType<\[([a-zA-Z.]*)].+>/g,
            array: /Array<(.*)>/g,
            union: /[a-zA-Z0-9']* \| [a-zA-Z0-9']*/g,
            primitive: /string|number|boolean|void|ReactNode|any|object|Object|ReactInstance/g,
            link: /\[([a-zA-Z0-9_.]*)]\((.*)\)/g,
            specificObject: /{ [a-zA-Z0-9?]*: (.*),? }/g,
            genericObject: /{ \[[a-zA-Z_]*: .+]:.+ }/g,
            literal: /'(.*)'/g,
        };

        // Function
        let match;
        if (match = typeTests.func.exec(propType)) {
            let functionArgString = match[1];
            const returnType = match[2];
            const argRegex = /([a-zA-Z0-9?]+|\[[a-zA-Z0-9_.]*]\(.*\)): ({.+}|[^{,]+),?/g;

            const functionArgs = [];
            while ((match = argRegex.exec(functionArgString)) != null) {
                const argName = typeTests.link.exec(match[1].trim());
                const argNameFinal = argName != null ? argName[1] : match[1].trim();

                functionArgs.push({
                    name: argNameFinal.replace('?', ''),
                    type: this.parsePropType(match[2].trim()),
                    required: (argNameFinal.indexOf('?') === -1),
                });
            }

            return {
                name: 'signature',
                type: 'function',
                raw: propType,
                signature: {
                    arguments: functionArgs,
                    return: this.parsePropType(returnType),
                },
            };
        }
        // Array
        else if (match = typeTests.array.exec(propType)) {
            const arrayType = match[1];
            return {
                name: 'arrayOf',
                value: this.parsePropType(arrayType),
            };
        }
        // Generic Object
        else if (typeTests.genericObject.test(propType)) {
            return {
                name: 'Object',
            };
        }
        // Specific Object
        else if (typeTests.specificObject.test(propType)) {
            const objParts = propType.substr(2,propType.length - 4).split(',');

            const props: docProp[] = [];
            let match;
            objParts.forEach(p => {
                if (match = /([a-zA-Z0-9?]*):(.*)/g.exec(p)) {
                    const pName = match[1];
                    const pType = match[2];
                    props.push({
                        name: pName.trim().replace('?', ''),
                        type: pType.trim(),
                        optional: pName.indexOf('?') > -1,
                        description: '',
                    });
                }
            });

            return this.shapeFromProps(props);
        }
        // Component Type
        else if (match = typeTests.componentType.exec(propType)) {
            const sectionName = match[1];
            const inputProps = this.extractInputProps(sectionName);
            const propsObject = this.shapeFromProps(inputProps);

            return {
                name: 'signature',
                type: 'function',
                raw: propType,
                signature: {
                    arguments: [{
                        name: 'props',
                        type: propsObject,
                    }],
                    return: { name: 'Element' }
                },
            };
        }
        // Link (Localization Message)
        else if (match = typeTests.link.exec(propType)) {
            const linkName = match[1];
            const linkIdentifier = match[2];
            if (linkIdentifier === '#localization-messages') {
                const localizeProps = this.extractProps('Localization Messages');
                return this.shapeFromProps(localizeProps);
            }

            if (this._docSections[linkName] != null) {
                // Prevent recursion and mark as any
                if (this._docSections[linkName].indexOf(`[${linkName}]`) > -1) {
                    return {
                        name: 'any',
                    };
                }
                const inputProps = this.extractInputProps(linkName);
                return this.shapeFromProps(inputProps);
            }
            else if (this._dependencyResolver != null) {
                const parser = this._dependencyResolver(linkName, linkIdentifier);
                if (parser !== false) {
                    return parser.parsePropType(propType);
                }
            }
        }
        // Union
        else if (typeTests.union.test(propType)) {
            return {
                name: 'union',
                value: propType.split('|').map(pt => this.parsePropType(pt.trim())),
            };
        }
        // Primitive
        else if (typeTests.primitive.test(propType)) {
            if (propType === 'ReactNode') {
                propType = 'Element';
            }
            if (propType === 'ReactInstance') {
                propType = 'any';
            }
            const primitiveType = {
                name: propType,
            };
            if (isPrimitive(primitiveType)) {
                return primitiveType;
            }
        }
        else if (match = typeTests.literal.exec(propType)) {
            return {
                name: 'literal',
                value: match[1],
            };
        }

        Console.warn(`DocPropsParser: Could not parse type ${propType}, declaring as any`);
        return {
            name: 'any',
        };
    };

    shapeFromProps = (props: docProp[]): PropType$Shape => {
        return {
            name: 'shape',
            value: props.reduce((obj, prop) => ({
                ...obj,
                [prop.name]: {...(prop.parsedType != null ? prop.parsedType : this.parsePropType(prop.type)), required: !prop.optional}
            }), {}),
        };
    };

    extractInputProps = (sectionName: string): docProp[] => {
        let inputProps: docProp[] = [];
        if (this._docSections[sectionName] != null) {
            const sectionContent = this._docSections[sectionName];
            const propsString = this.getDocTableRows(sectionContent);
            const propsRegex = new RegExp(/^(.*)\|(.*)\|(.*)$/mg);
            let propsMatch;
            while ((propsMatch = propsRegex.exec(propsString)) !== null) {
                const propsMatchDecoded = propsMatch.map(s => he.decode(s));
                const prop: docProp = {
                    name: propsMatchDecoded[1].trim().replace('?', ''),
                    type: propsMatchDecoded[2].trim(),
                    parsedType: this.parsePropType(propsMatchDecoded[2].trim()),
                    description: propsMatchDecoded[3].trim(),
                    optional: propsMatchDecoded[1].indexOf('?') > -1,
                };
                inputProps.push(prop);
            }

            // Extension
            const inputExtension = this.getDocTableExtension(sectionContent);
            if (inputExtension) {
                const linkName = inputExtension[0];
                const linkIdentifier = inputExtension[1];
                let mergeProps: docProp[] = [];
                if (this._docSections[linkName] != null) {
                    mergeProps = this.extractInputProps(linkName);
                }
                else if (this._dependencyResolver != null) {
                    const parser = this._dependencyResolver(linkName, linkIdentifier);
                    if (parser) {
                        mergeProps = parser.extractInputProps(linkName);
                    }
                }
                inputProps.forEach(existing => {
                    let found = false;
                    mergeProps.forEach((merge, i)=> {
                        if (!found && existing.name === merge.name) {
                            found = true;
                            mergeProps[i] = existing;
                        }
                    });
                    if (!found) {
                        mergeProps.push(existing);
                    }
                });

                inputProps = mergeProps;
            }
        }
        return inputProps;
    };

    getDocTableExtension = (sectionContent: string): false | string[] => {
        const extensionTest = /^Extends \[([a-zA-Z0-9_.]*)]\((.*)\)$/gm;
        let match;
        if (match = extensionTest.exec(sectionContent)) {
            return [match[1], match[2]];
        }

        return false;
    };

    getDocTableRows = (sectionContent: string): string => {
        let capture = false;
        let retContent = '';
        sectionContent.split('\n').forEach(line => {
            if (line.indexOf('--') === 0) {
                capture = true;
            }
            else if (capture) {
                retContent += `${line}\n`;
            }
        });

        return retContent.trim();
    };

    extractProps = (sectionName: string) => {
        const props: docProp[] = [];
        if (this._docSections[sectionName] != null) {
            const propertiesString = this.getDocTableRows(this._docSections[sectionName]);
            const propsRegex = /^(.*)\|(.*)\|(.*)\|(.*)$/mg;
            let propsMatch;
            while ((propsMatch = propsRegex.exec(propertiesString)) !== null) {
                propsMatch = propsMatch.map(s => he.decode(s));
                const prop: docProp = {
                    name: propsMatch[1].trim().replace('?', ''),
                    type: propsMatch[2].trim(),
                    def: propsMatch[3].trim(),
                    description: propsMatch[4].trim(),
                    optional: propsMatch[1].indexOf('?') > -1,
                };
                props.push(prop);
            }
        }

        return props;
    };

    extractSections = () => {
        const lines = this._rawDoc.split('\n');
        this._docSections = {};
        let currentSection: string;
        lines.forEach(line => {
            if (line.indexOf('#') === 0) {
                currentSection = line.replace(/#/g, '').trim();
                return;
            }
            if (this._docSections[currentSection] == null) {
                this._docSections[currentSection] = '';
            }

            this._docSections[currentSection] += `${line}\n`;
        });
    };
}