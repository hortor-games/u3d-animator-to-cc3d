namespace Hortor.Bon {
    public struct BonElement {
        public static readonly BonElement Empty = new BonElement(null, null);

        public string name;
        public BonValue value;

        public BonElement(string name, BonValue value) {
            this.name = name;
            this.value = value ?? BonNull.value;
        }

        public override string ToString() {
            return "\"" + name + "\": " + value.ToJsonString();
        }

    }
}