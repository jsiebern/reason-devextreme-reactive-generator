import Base from './base';
import ResolveArgument from './resolve-argument';
import GenerateReasonName from '../../helpers/generate-reason-name';
import { upperFirst } from 'lodash';
import { generateAny } from './helpers';

const factory = (propertyType: PropType$Shape) => {
    return class ShapeParser extends Base {
        private _propertyType: PropType$Shape = propertyType;
        private _moduleName = upperFirst(this.property.safeName);

        public executeParse() {
            const shapeArgs = this.resolveShape();
            if (shapeArgs.length) {
                const anyTypes = shapeArgs.reduce((arr, arg) => {
                    let any;
                    const anyReg = new RegExp(/('any_[a-z0-9]{4})/g);
                    while ((any = anyReg.exec(arg.type)) !== null) {
                        // @ts-ignore
                        arr.push(`${any[0]}`);
                    }

                    if (arg.type.includes('Js.t({..})')) {
                        // @ts-ignore
                        arr.push('\'a');
                        arg.type = arg.type.replace('Js.t({..})', 'Js.t({..}) as \'a');
                    }
                    return arr;
                }, []).join(',');
                this._module = `
                    module ${this._moduleName} {
                        [@bs.deriving abstract]
                        type t${anyTypes ? `(${anyTypes})` : ''} = {
                            ${shapeArgs.map(arg => `
                                ${!arg.required ? '[@bs.optional]' : ''}
                                ${arg.key !== arg.keySafe ? `[@bs.as "${arg.key}"]` : ''}
                                ${arg.keySafe}: ${arg.type === 'Js.t({..})' ? 'Js.t({..} as \'a)' : arg.type}
                            `).join(',')}
                        };
                        let make = t;

                        let unwrap = (obj: ${this.property.signature.required ? `t${anyTypes ? `(${anyTypes})` : ''}` : `option(t${anyTypes ? `(${anyTypes})` : ''})`}) => {
                            ${this.property.signature.required ? `
                                let unwrappedMap = Js.Dict.empty();
                                ${shapeArgs.map(arg => arg.required ? `
                                    unwrappedMap
                                        -> Js.Dict.set(
                                            "${arg.key}",
                                            ${arg.wrapJs(`obj -> ${arg.keySafe}Get`)}
                                            -> toJsUnsafe
                                        );
                                ` : `
                                    switch (${arg.wrapJs(`obj -> ${arg.keySafe}Get`)}) {
                                        | Some(v) =>
                                            unwrappedMap
                                                -> Js.Dict.set(
                                                    "${arg.key}",
                                                    v
                                                    -> toJsUnsafe
                                                );
                                        | None => ()    
                                    };
                                `).join('')}
                                unwrappedMap;
                            ` : `
                                switch (obj) {
                                    | Some(obj) =>
                                        let unwrappedMap = Js.Dict.empty();
                                        ${shapeArgs.map(arg => arg.required ? `
                                            unwrappedMap
                                                -> Js.Dict.set(
                                                    "${arg.key}",
                                                    ${arg.wrapJs(`obj -> ${arg.keySafe}Get`)}
                                                    -> toJsUnsafe
                                                );
                                        ` : `
                                            switch (${arg.wrapJs(`obj -> ${arg.keySafe}Get`)}) {
                                                | Some(v) =>
                                                    unwrappedMap
                                                        -> Js.Dict.set(
                                                            "${arg.key}",
                                                            v
                                                            -> toJsUnsafe
                                                        );
                                                | None => ()    
                                            };
                                        `).join('')}
                                        Some(unwrappedMap);
                                    | None => None
                                };
                            `}
                            
                        };
                    };
                `;

                this._wrapJs = (name) => `${this._moduleName}.unwrap(${name})`;
                this._reasonType = `${this._moduleName}.t`;
                if (anyTypes) {
                    this._reasonType = `${this._moduleName}.t(${anyTypes})`;
                }
                this._jsType = generateAny();
            }
            else {
                this._valid = false;
            }
        }

        private resolveShape() {
            const shapes: { key: string, keySafe: string, type: string, wrapJs: (k: string) => string, jsType: string, required: boolean }[] = [];

            Object.keys(this._propertyType.value).forEach(key => {
                const type = this._propertyType.value[key];
                const argumentParser = ResolveArgument(key, type.required, type, this._property);
                if (argumentParser && argumentParser.valid) {
                    shapes.push({
                        key,
                        keySafe: GenerateReasonName(key, false),
                        type: argumentParser.reasonType,
                        wrapJs: argumentParser.wrapJs,
                        jsType: argumentParser.jsType,
                        required: type.required,
                    });
                }
            });

            return shapes;
        }
    };
};

export default factory;