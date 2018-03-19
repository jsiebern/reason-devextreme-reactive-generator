import Property from './../property';

class PropertyParserBase {
    protected _property: Property;

    protected _reasonType: string = '';
    protected _jsType: string = '';
    protected _wrapJs: (safeName: string) => string = (safeName: string) => safeName;
    protected _module: string = '';
    protected _valid: boolean = true;

    constructor(property: Property) {
        this._property = property;
    }

    // Getters
    protected get property() {
        return this._property;
    }

    protected  get component() {
        return this._property.component;
    }

    protected get required() {
        return this._property.signature.required;
    }

    public get reasonType() {
        return this._reasonType;
    }

    // Parse functions
    public parse() {
        this.executeParse();
        this.writeToComponent();
    }

    public executeParse() {}

    protected writeToComponent() {
        if (this._valid && this._reasonType) {
            let Make = `~${this.property.safeName}: ${this._reasonType},`;
            let MakeProps = `~${this.property.safeName}: ${this._jsType ? this._jsType : this._reasonType},`;
            let WrapJs = `~${this.property.safeName}=${this._wrapJs(this.property.safeName)},`;

            // Optional
            if (!this.property.signature.required) {
                Make = `~${this.property.safeName}: option(${this._reasonType})=?,`;
                MakeProps = `${MakeProps.replace(',', '=?')},`;
                WrapJs = `${WrapJs.replace('=', '=?')}`;
            }

            this.component.addToSection('Make', Make);
            this.component.addToSection('MakeProps', MakeProps);
            this.component.addToSection('WrapJs', WrapJs);
            this.component.addToSection('Module', this._module);
        }
    }
}

export default PropertyParserBase;