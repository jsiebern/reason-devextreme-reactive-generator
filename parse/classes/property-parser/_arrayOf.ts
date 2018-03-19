// import * as Console from './../../helpers/console';
import { generateAny, generateRandom } from './helpers';
import Base from './base';
import * as Identify from './../../helpers/identify-prop-type';
import ResolveArgument from './resolve-argument';

const factory = (propertyType: PropType$ArrayOf) => {
    return class ArrayOfParser extends Base {
        private _propertyType: PropType$ArrayOf = propertyType;

        public executeParse() {
            const type = this._propertyType.value;

            let reasonType: false | string[] = false;

            if (Identify.isPrimitive(type) && ['string', 'number'].indexOf(type.name) > -1) {
                if (type.name === 'string') {
                    reasonType = [ 'StringArray(array(string))' ];
                }
                else if (type.name === 'number') {
                    reasonType = ['IntArray(array(int))', 'FloatArray(array(float))'];
                }
            }
            else {
                const resolvedType = this.resolveType(type);
                if (resolvedType) {
                    if (resolvedType.valid) {
                        reasonType = [ `Array(array(${resolvedType.reasonType}))` ];
                    }
                }
            }

            if (Array.isArray(reasonType)) {
                this._reasonType = `[ ${reasonType.map(s => `| \`${s}`).join('')} ]`;
            }
            else {
                this._reasonType = generateAny('invalidArrayType');
            }
            this._jsType = generateAny('arrayOf');
        }

        private resolveType(type: PropType) {
            const argumentParser = ResolveArgument(generateRandom(), true, type, this._property);
            if (argumentParser) {
                return argumentParser;
            }

            return false;
        }
    }
};

export default factory;