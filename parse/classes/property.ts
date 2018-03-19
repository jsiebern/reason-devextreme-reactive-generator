import Component from './component';
import GenerateReasonName from './../helpers/generate-reason-name';
import * as Console from './../helpers/console';
import GetPropertyParser from './property-parser';

class Property {
    // Component Reference
    private _component: Component;

    // Raw Prop Values
    private _signature: PropSignature;
    private _name: string;

    constructor(name: string, propSignature: PropSignature, componentReference: Component, autoParse: boolean = true) {
        this._component = componentReference;
        this._signature = propSignature;
        this._name = name;
        if (autoParse) {
            this.parse();
        }
    }

    // Getters
    public get name() {
        return this._name;
    }

    public get safeName() {
        return GenerateReasonName(this.name, false);
    }

    public get component() {
        return this._component;
    }

    public get signature() {
        return this._signature;
    }

    private parse() {
        if (this._signature.type != null) {
            const Parser = GetPropertyParser(this._signature.type);
            if (Parser) {
                const parser = new Parser(this);
                parser.parse();
            }
            else {
                Console.error(`Property.parse: Could not find parser for Property ${Console.colors.green}${this.component.name}/${this._name}/${this._signature.type.name}${Console.colors.reset}`);
            }
        }
        else {
            Console.error(`Property.parse: Missing type definition for Property ${Console.colors.green}${this.component.name}/${this._name}${Console.colors.reset}`);
        }
    }
}

export default Property;