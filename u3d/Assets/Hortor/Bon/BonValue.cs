using Hortor.Bon;
using System;
using System.IO;
using System.Text;
namespace Hortor.Bon {
    public enum BonTypes {
        Null = 0,
        Int = 1,
        Long = 2,
        Float = 3,
        Double = 4,
        String = 5,
        Boolean = 6,
        Binary = 7,
        Document = 8,
        Array = 9,
        DateTime = 10,
        StringRef = 99,
    }


    public abstract class BonValue {
        internal static readonly DateTime UTC_ZERO = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        public virtual BonValue this[string name] {
            get {
                return null;
            }
            set {
            }
        }
        public virtual bool AsBoolean => false;
        public virtual double AsDouble => 0.0;
        public virtual int AsInt => 0;
        public virtual float AsFloat => 0f;
        public virtual long AsLong => 0L;
        public virtual BonDocument AsBonDocument => null;
        public virtual BonArray AsBonArray => null;
        public virtual string AsString => null;
        public virtual DateTime AsDateTime => UTC_ZERO;

        public override string ToString() {
            return AsString;
        }

        public virtual byte[] AsBinary => null;

        public virtual bool IsBoolean => false;
        public virtual bool IsDouble => false;
        public virtual bool IsFloat => false;
        public virtual bool IsInt => false;
        public virtual bool IsLong => false;
        public virtual bool IsString => false;
        public virtual bool IsBonDocument => false;
        public virtual bool IsBonArray => false;
        public virtual bool IsNull => false;
        public virtual bool IsBinary => false;

        public virtual bool IsDateTime => false;



        public static implicit operator BonValue(string value) {
            if (value == null) {
                return BonNull.value;
            }
            return new BonString(value);
        }

        public static implicit operator BonValue(byte[] value) {
            if (value == null) {
                return BonNull.value;
            }
            return new BonBinary(value);
        }

        public static implicit operator BonValue(int value) {
            return new BonInt(value);
        }

        public static implicit operator BonValue(long value) {
            return new BonLong(value);
        }

        public static implicit operator BonValue(float value) {
            return new BonFloat(value);
        }

        public static implicit operator BonValue(double value) {
            return new BonDouble(value);
        }

        public static implicit operator BonValue(bool value) {
            return new BonBoolean(value);
        }

        public static implicit operator BonValue(DateTime value) {
            return new BonDateTime(value);
        }
    }
}