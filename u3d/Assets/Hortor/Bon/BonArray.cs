using System.Collections.Generic;
using System.Text;
namespace Hortor.Bon {
    public class BonArray: BonValue, IEnumerable<BonValue> {
        private readonly List<BonValue> values = new List<BonValue>();

        public BonArray() {
        }

        public BonValue this[int index] {
            get {
                return values[index];
            }
            set {
                for (int i = values.Count; i <= index; i++) {
                    values.Add(BonNull.value);
                }
                values[index] = value == null ? BonNull.value : value;
            }
        }

        public int Count {
            get {
                return values.Count;
            }
        }

        public void Add(BonValue v) {
            values.Add(v == null ? BonNull.value : v);
        }

        public void RemoveAt(int index) {
            values.RemoveAt(index);
        }

        public override bool IsBonArray => true;

        public override BonArray AsBonArray => this;

        public override string AsString => this.ToJsonString();


        #region IEnumerable<BonValue> 成员

        public IEnumerator<BonValue> GetEnumerator() {
            return values.GetEnumerator();
        }

        #endregion

        #region IEnumerable 成员

        System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() {
            return values.GetEnumerator();
        }

        #endregion

    }
}