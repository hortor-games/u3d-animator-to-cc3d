using System.Collections;
using System.Collections.Generic;
using System.Text;
namespace Hortor.Bon {
    public class BonDocument: BonValue, IEnumerable<BonElement> {
        private List<string> keys = new List<string>();
        private Dictionary<string, BonElement> elements = new Dictionary<string, BonElement>();
        public int Count {
            get {
                return keys.Count;
            }
        }

        public BonDocument() {
        }

        public BonDocument Merge(string name, BonValue v) {
            if (v.IsNull) {
                Remove(name);
                return this;
            }
            BonElement me;
            if (!elements.TryGetValue(name, out me)) {
                this[name] = v;
                return this;
            }
            if (v.IsBonDocument && me.value.IsBonDocument) {
                var doc = me.value.AsBonDocument;
                foreach (var el in v.AsBonDocument) {
                    doc.Merge(el.name, el.value);
                }
                return this;
            }
            this[name] = v;
            return this;
        }

        public BonElement this[int index] {
            get {
                return elements[keys[index]];
            }
        }

        public override BonValue this[string name] {
            get {
                BonElement el;
                if (elements.TryGetValue(name, out el)) {
                    return el.value;
                }
                return null;
            }
            set {
                BonElement e;
                if (elements.TryGetValue(name, out e)) {
                    keys.Remove(name);
                    e.value = value == null ? BonNull.value : value;
                } else {
                    e = new BonElement(name, value);
                }
                elements[name] = e;
                keys.Add(name);
            }
        }

        public int GetInt(string name, int defaultValue = 0) {
            BonElement el;
            if (elements.TryGetValue(name, out el)) {
                return el.value.AsInt;
            }
            return defaultValue;
        }

        public long GetLong(string name, long defaultValue = 0L) {
            BonElement el;
            if (elements.TryGetValue(name, out el)) {
                return el.value.AsLong;
            }
            return defaultValue;
        }

        public float GetFloat(string name, float defaultValue = 0f) {
            BonElement el;
            if (elements.TryGetValue(name, out el)) {
                return el.value.AsFloat;
            }
            return defaultValue;
        }

        public double GetDouble(string name, double defaultValue = 0.0) {
            BonElement el;
            if (elements.TryGetValue(name, out el)) {
                return el.value.AsDouble;
            }
            return defaultValue;
        }

        public string GetString(string name, string defaultValue = null) {
            BonElement el;
            if (elements.TryGetValue(name, out el)) {
                return el.value.AsString;
            }
            return defaultValue;
        }

        public bool GetBoolean(string name, bool defaultValue = false) {
            BonElement el;
            if (elements.TryGetValue(name, out el)) {
                return el.value.AsBoolean;
            }
            return defaultValue;
        }

        public byte[] GetBinary(string name, byte[] defaultValue = null) {
            BonElement el;
            if (elements.TryGetValue(name, out el)) {
                return el.value.AsBinary;
            }
            return defaultValue;
        }

        public BonArray GetBonArray(string name, BonArray defaultValue = null) {
            BonElement el;
            if (elements.TryGetValue(name, out el)) {
                return el.value.AsBonArray;
            }
            return defaultValue;
        }

        public BonDocument GetBonDocument(string name, BonDocument defaultValue = null) {
            BonElement el;
            if (elements.TryGetValue(name, out el)) {
                return el.value.AsBonDocument;
            }
            return defaultValue;
        }

        public bool Contains(string key) {
            return elements.ContainsKey(key);
        }

        public void Add(BonElement e) {
            BonElement e2;
            if (elements.TryGetValue(e.name, out e2)) {
                keys.Remove(e2.name);
            }
            elements[e.name] = e;
            keys.Add(e.name);
        }

        public void Remove(string name) {
            BonElement e;
            if (elements.TryGetValue(name, out e)) {
                elements.Remove(name);
                keys.Remove(name);
            }
        }

        public override BonDocument AsBonDocument {
            get { return this; }
        }

        public override bool IsBonDocument {
            get { return true; }
        }

        public override string AsString => this.ToJsonString();



        private struct Enumerator: IEnumerator<BonElement> {
            private Dictionary<string, BonElement> map;
            private IEnumerator<string> keys;
            private BonElement current;
            public Enumerator(BonDocument doc) {
                this.map = doc.elements;
                this.keys = doc.keys.GetEnumerator();
                current = BonElement.Empty;
            }

            #region IEnumerator<BonElement> 成员

            public BonElement Current {
                get { return current; }
            }

            #endregion

            #region IEnumerator 成员

            object IEnumerator.Current {
                get { return current; }
            }

            public bool MoveNext() {
                if (keys.MoveNext()) {
                    current = map[keys.Current];
                    return true;
                }
                current = BonElement.Empty;
                return false;
            }

            public void Reset() {
                keys.Reset();
                current = BonElement.Empty;
            }

            #endregion

            #region IDisposable 成员

            public void Dispose() {
                keys.Dispose();
            }

            #endregion
        }

        #region IEnumerable<BonElement> 成员

        public IEnumerator<BonElement> GetEnumerator() {
            return new Enumerator(this);
        }

        #endregion

        #region IEnumerable 成员

        IEnumerator IEnumerable.GetEnumerator() {
            return new Enumerator(this);
        }

        #endregion

    }
}