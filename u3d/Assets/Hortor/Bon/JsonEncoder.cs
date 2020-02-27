using Hortor.IO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Hortor.Bon {
    public class JsonEncoder {
        private readonly StringBuilder sb = new StringBuilder();
        private int indent;
        private bool format;

        public JsonEncoder(bool format = false) {
            this.Reset(format);
        }

        public void Reset(bool format = false) {
            this.sb.Clear();
            this.indent = 0;
            this.format = format;
        }

        public void WriteIndent() {
            this.sb.Append(string.Join("", Enumerable.Repeat(" ", this.indent)));
        }
        public void Encode(int v) {
            this.sb.Append(v);
        }
        public void Encode(long v) {
            this.sb.Append(v);
        }
        public void Encode(float v) {
            this.sb.Append(v);
        }
        public void Encode(double v) {
            this.sb.Append(v);
        }
        public void Encode(string v) {
            sb.Append("\"");
            for (int i = 0; i < v.Length; i++) {
                char c = v[i];
                switch (c) {
                    case '"': sb.Append(@"\"""); continue;
                    case '\\': sb.Append(@"\\"); continue;
                    case '\b': sb.Append(@"\b"); continue;
                    case '\f': sb.Append(@"\f"); continue;
                    case '\n': sb.Append(@"\n"); continue;
                    case '\r': sb.Append(@"\r"); continue;
                    case '\t': sb.Append(@"\t"); continue;
                    default: {
                        int ci = (int)c;
                        if (ci < 32 || ci > 126 && ci < 256) {
                            sb.AppendFormat(@"\u{0:x4}", ci);
                        } else {
                            sb.Append(c);
                        }
                        continue;
                    }
                }
            }
            sb.Append("\"");
        }
        public void Encode(bool v) {
            this.sb.Append(v ? "true" : "false");
        }
        public void EncodeNull() {
            this.sb.Append("null");
        }
        public void Encode(DateTime v) {
            this.Encode(v.ToString());
        }
        public void Encode(byte[] v) {
            this.Encode(Convert.ToBase64String(v));
        }

        public void Encode(BonValue v) {
            switch (v) {
                default: EncodeNull(); return;
                case BonInt vv: Encode(vv.value); return;
                case BonLong vv: Encode(vv.value); return;
                case BonFloat vv: Encode(vv.value); return;
                case BonDouble vv: Encode(vv.value); return;
                case BonBoolean vv: Encode(vv.value); return;
                case BonString vv: Encode(vv.value); return;
                case BonBinary vv: Encode(vv.value); return;
                case BonDateTime vv: Encode(vv.value); return;
                case BonArray vv: Encode(vv); return;
                case BonDocument vv: Encode(vv); return;
            }
        }

        public void Encode(BonArray v) {
            if (this.format) {
                sb.Append('[');
                int c = v.Count;
                if (c > 0) {
                    sb.Append('\n');
                    this.indent += 2;
                    for (int i = 0; i < c; i++) {
                        if (i > 0) {
                            sb.Append(",\n");
                        }
                        WriteIndent();
                        Encode(v[i]);
                    }
                    sb.Append('\n');
                    this.indent -= 2;
                    WriteIndent();
                }
                sb.Append(']');
            } else {
                sb.Append("[");
                int c = v.Count;
                for (int i = 0; i < c; i++) {
                    if (i > 0) {
                        sb.Append(",");
                    }
                    Encode(v[i]);
                }
                sb.Append("]");
            }
        }

        public void Encode(BonDocument v) {
            if (this.format) {
                sb.Append('{');
                int c = v.Count;
                if (c > 0) {
                    sb.Append('\n');
                    this.indent += 2;
                    for (int i = 0; i < c; i++) {
                        var elem = v[i];
                        if (i > 0) {
                            sb.Append(",\n");
                        }
                        WriteIndent();
                        sb.Append('\"');
                        sb.Append(elem.name);
                        sb.Append("\":");
                        Encode(elem.value);
                    }
                    sb.Append('\n');
                    this.indent -= 2;
                    WriteIndent();
                }
                sb.Append('}');
            } else {
                sb.Append('{');
                int c = v.Count;
                for (int i = 0; i < c; i++) {
                    var elem = v[i];
                    if (i > 0) {
                        sb.Append(',');
                    }
                    sb.Append('\"');
                    sb.Append(elem.name);
                    sb.Append("\":");
                    Encode(elem.value);
                }
                sb.Append('}');
            }
        }

        public string Result() {
            return this.sb.ToString();
        }

    }
}
