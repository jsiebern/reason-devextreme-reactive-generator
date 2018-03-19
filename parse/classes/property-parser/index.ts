import * as Identify from './../../helpers/identify-prop-type';

import BaseParser from './base';
import PrimitiveFactory from './_primitive';
import FunctionFactory from './_function';

export default function(propType: PropType): false | typeof BaseParser {
    if (Identify.isPrimitive(propType)) {
        return PrimitiveFactory(propType);
    }
    else if (Identify.isFunctionSignature(propType)) {
        return FunctionFactory(propType);
    }
    else {
        return false;
    }
}