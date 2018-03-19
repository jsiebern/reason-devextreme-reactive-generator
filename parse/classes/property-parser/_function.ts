import * as Console from './../../helpers/console';
import Base from './base';
import ResolveArgument from './resolve-argument';

const factory = (propertyType: PropType$FunctionSignature) => {
    return class FunctionParser extends Base {
        private _propertyType: PropType$FunctionSignature = propertyType;

        public executeParse() {
            const signature = this._propertyType.signature;

            const returnParser = ResolveArgument(`${this._property.name}Return`, true, signature.return, this._property);

            if (returnParser) {
                this._reasonType = `unit => ${returnParser.reasonType}`;
            }
        }


    };
};

export default factory;