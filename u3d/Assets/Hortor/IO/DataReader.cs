using System.IO;
using System.Text;
using System.Linq;
using System;

namespace Hortor.IO {
    /// <summary>
    /// 高字节优先
    /// </summary>
    public class DataReader: BinaryReader {
        //private byte[] buff = new byte[8];
        public DataReader(Stream input, bool leaveOpen = false)
            : base(input, UTF8Encoding.UTF8, leaveOpen) {
        }

        public DataReader(byte[] data)
            : this(new MemoryStream(data), false) {
        }

        //public override short ReadInt16() {
        //    Read(buff, 0, 2);
        //    return (short)((buff[0] << 8) | (buff[1] << 0));
        //}

        //public override int ReadInt32() {
        //    Read(buff, 0, 4);
        //    return (buff[0] << 24) | (buff[1] << 16) | (buff[2] << 8) | (buff[3] << 0);
        //}

        //public override long ReadInt64() {
        //    Read(buff, 0, 8);
        //    return ((long)buff[0] << 56) | ((long)buff[1] << 48) | ((long)buff[2] << 40) | ((long)buff[3] << 32) | ((long)buff[4] << 24) | (long)(buff[5] << 16) | ((long)buff[6] << 8) | (long)(buff[7] << 0);
        //}

        //public override ushort ReadUInt16() {
        //    return (ushort)(ReadInt16());
        //}

        //public override uint ReadUInt32() {
        //    return (uint)(ReadInt32());
        //}

        //public override ulong ReadUInt64() {
        //    return (ulong)(ReadInt64());
        //}

        //public override unsafe float ReadSingle() {
        //    int v = ReadInt32();
        //    return *(((float*)&v));
        //}

        //public override unsafe double ReadDouble() {
        //    long v = ReadInt64();
        //    return *(((double*)&v));
        //}

        public string ReadUTF(int count) {
            return UTF8Encoding.UTF8.GetString(ReadBytes(count));
        }

        public new int Read7BitEncodedInt() {
            return base.Read7BitEncodedInt();
        }
    }
}