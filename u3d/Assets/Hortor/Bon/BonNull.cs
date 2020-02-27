using System;
using System.IO;
using System.Text;
namespace Hortor.Bon {
    public class BonNull: BonValue {
        public static readonly BonNull value = new BonNull();
        private BonNull() {
        }
        public override bool IsNull {
            get { return true; }
        }

    }
}