import Base from './base';
import ResolveArgument from './resolve-argument';
import GenerateReasonName from '../../helpers/generate-reason-name';

const factory = (propertyType: PropType$Shape) => {
    return class ShapeParser extends Base {
        private _propertyType: PropType$Shape = propertyType;
        private _typeName = this.property.safeName;

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

                    if (arg.type === 'Js.t({..})') {
                        // @ts-ignore
                        arr.push('\'a');
                    }
                    return arr;
                }, []).join(',');
                this._module = `
                    [@bs.deriving abstract]
                    type ${this._typeName}${anyTypes ? `(${anyTypes})` : ''} = {
                        ${shapeArgs.map(arg => `
                            ${!arg.required ? '[@bs.optional] ' : ''}
                            ${arg.key !== arg.keySafe ? `[@bs.as "${arg.key}"]` : ''}
                            ${arg.keySafe}: ${arg.type === 'Js.t({..})' ? 'Js.t({..} as \'a)' : arg.type}
                        `).join(',')}
                    };
                `;

                this._reasonType = this._typeName;
                if (anyTypes) {
                    this._reasonType = `${this._reasonType}(${anyTypes})`;
                }
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