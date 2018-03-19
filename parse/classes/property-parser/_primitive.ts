import * as Console from './../../helpers/console';
import { generateAny, generateRandom } from './helpers';
import Base from './base';

const factory = (propertyType: PropType$Primitive) => {
    return class PrimitiveParser extends Base {
        private _propertyType: PropType$Primitive = propertyType;

        public executeParse() {
            switch (this._propertyType.name) {

                // -- String
                case 'string':
                case 'String':
                    this._reasonType = 'string';
                    break;

                // -- Boolean
                case 'bool':
                case 'boolean':
                    this._reasonType = 'bool';
                    this._jsType = 'Js.boolean';
                    if (this.required) {
                        this._wrapJs = (name) => `Js.Boolean.to_js_boolean(${name})`;
                    }
                    else {
                        this._wrapJs = (name) => `Js.Option.map([@bs] ((v) => Js.Boolean.to_js_boolean(v)), ${name})`;
                    }
                    break;

                // -- Number
                case 'number':
                    this._reasonType = '[ | `Int(int) | `Float(float) ]';
                    this._jsType = `'number_${Math.random().toString(36).substr(2, 1)}`;

                    if (this.required) {
                        this._wrapJs = (name) => `unwrapValue(${name})`;
                    }
                    else {
                        this._wrapJs = (name) => `Js.Option.map([@bs] ((v) => unwrapValue(v)), ${name})`;
                    }
                    break;

                // React Element
                case 'node':
                case 'Node':
                case 'element':
                case 'Element':
                case 'ComponentType<object>':
                case 'Element<any>':
                    this._reasonType = 'ReasonReact.reactElement';
                    break;

                // Generic Object
                case 'object':
                case 'Object':
                    this._reasonType = 'Js.t({..})';
                    break;

                // Function without Signature / Any
                case 'Function':
                case 'func':
                case 'any':
                    // Todo: Analyse default value for 'func' (might be () => unit)
                    this._reasonType = generateAny();
                    break;

                // Generic array
                case 'array':
                    this._reasonType = `[ | \`ArrayGeneric(array(${generateAny()})) ]`;
                    this._jsType = `'arrayGeneric_${generateRandom()}`;
                    break;

                // Void return types
                case 'void':
                    this._reasonType = 'unit';
                    break;

                // Unhandled
                default:
                    this._valid = false;
                    Console.warn(`PrimitiveParser: Primitive type ${Console.colors.red}${JSON.stringify(this._propertyType.name)}${Console.colors.yellow} does not map to anything`);
            }
        }
    }
};

export default factory;