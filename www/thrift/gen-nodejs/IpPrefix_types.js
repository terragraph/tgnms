//
// Autogenerated by Thrift Compiler
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
var Thrift = require('thrift').Thrift;
var ttypes = module.exports = {};
ttypes.AddressType = {
'VUNSPEC' : 0,
'V4' : 1,
'V6' : 2
};
Address = module.exports.Address = function(args) {
  this.addr = null;
  this.type = null;
  this.port = 0;
  if (args) {
    if (args.addr !== undefined) {
      this.addr = args.addr;
    }
    if (args.type !== undefined) {
      this.type = args.type;
    }
    if (args.port !== undefined) {
      this.port = args.port;
    }
  }
};
Address.prototype = {};
Address.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRING) {
        this.addr = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I32) {
        this.type = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.I64) {
        this.port = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

Address.prototype.write = function(output) {
  output.writeStructBegin('Address');
  if (this.addr !== null && this.addr !== undefined) {
    output.writeFieldBegin('addr', Thrift.Type.STRING, 1);
    output.writeString(this.addr);
    output.writeFieldEnd();
  }
  if (this.type !== null && this.type !== undefined) {
    output.writeFieldBegin('type', Thrift.Type.I32, 2);
    output.writeI32(this.type);
    output.writeFieldEnd();
  }
  if (this.port !== null && this.port !== undefined) {
    output.writeFieldBegin('port', Thrift.Type.I64, 3);
    output.writeI64(this.port);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

BinaryAddress = module.exports.BinaryAddress = function(args) {
  this.addr = null;
  this.port = 0;
  this.ifName = '';
  if (args) {
    if (args.addr !== undefined) {
      this.addr = args.addr;
    }
    if (args.port !== undefined) {
      this.port = args.port;
    }
    if (args.ifName !== undefined) {
      this.ifName = args.ifName;
    }
  }
};
BinaryAddress.prototype = {};
BinaryAddress.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRING) {
        this.addr = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I64) {
        this.port = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRING) {
        this.ifName = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

BinaryAddress.prototype.write = function(output) {
  output.writeStructBegin('BinaryAddress');
  if (this.addr !== null && this.addr !== undefined) {
    output.writeFieldBegin('addr', Thrift.Type.STRING, 1);
    output.writeString(this.addr);
    output.writeFieldEnd();
  }
  if (this.port !== null && this.port !== undefined) {
    output.writeFieldBegin('port', Thrift.Type.I64, 2);
    output.writeI64(this.port);
    output.writeFieldEnd();
  }
  if (this.ifName !== null && this.ifName !== undefined) {
    output.writeFieldBegin('ifName', Thrift.Type.STRING, 3);
    output.writeString(this.ifName);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

IpPrefix = module.exports.IpPrefix = function(args) {
  this.prefixAddress = null;
  this.prefixLength = null;
  if (args) {
    if (args.prefixAddress !== undefined) {
      this.prefixAddress = args.prefixAddress;
    }
    if (args.prefixLength !== undefined) {
      this.prefixLength = args.prefixLength;
    }
  }
};
IpPrefix.prototype = {};
IpPrefix.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.prefixAddress = new ttypes.BinaryAddress();
        this.prefixAddress.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I16) {
        this.prefixLength = input.readI16();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

IpPrefix.prototype.write = function(output) {
  output.writeStructBegin('IpPrefix');
  if (this.prefixAddress !== null && this.prefixAddress !== undefined) {
    output.writeFieldBegin('prefixAddress', Thrift.Type.STRUCT, 1);
    this.prefixAddress.write(output);
    output.writeFieldEnd();
  }
  if (this.prefixLength !== null && this.prefixLength !== undefined) {
    output.writeFieldBegin('prefixLength', Thrift.Type.I16, 2);
    output.writeI16(this.prefixLength);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

UnicastRoute = module.exports.UnicastRoute = function(args) {
  this.dest = null;
  this.nexthops = null;
  if (args) {
    if (args.dest !== undefined) {
      this.dest = args.dest;
    }
    if (args.nexthops !== undefined) {
      this.nexthops = args.nexthops;
    }
  }
};
UnicastRoute.prototype = {};
UnicastRoute.prototype.read = function(input) {
  input.readStructBegin();
  while (true)
  {
    var ret = input.readFieldBegin();
    var fname = ret.fname;
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.dest = new ttypes.IpPrefix();
        this.dest.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.LIST) {
        var _size0 = 0;
        var _rtmp34;
        this.nexthops = [];
        var _etype3 = 0;
        _rtmp34 = input.readListBegin();
        _etype3 = _rtmp34.etype;
        _size0 = _rtmp34.size;
        for (var _i5 = 0; _i5 < _size0; ++_i5)
        {
          var elem6 = null;
          elem6 = new ttypes.BinaryAddress();
          elem6.read(input);
          this.nexthops.push(elem6);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

UnicastRoute.prototype.write = function(output) {
  output.writeStructBegin('UnicastRoute');
  if (this.dest !== null && this.dest !== undefined) {
    output.writeFieldBegin('dest', Thrift.Type.STRUCT, 1);
    this.dest.write(output);
    output.writeFieldEnd();
  }
  if (this.nexthops !== null && this.nexthops !== undefined) {
    output.writeFieldBegin('nexthops', Thrift.Type.LIST, 2);
    output.writeListBegin(Thrift.Type.STRUCT, this.nexthops.length);
    for (var iter7 in this.nexthops)
    {
      if (this.nexthops.hasOwnProperty(iter7))
      {
        iter7 = this.nexthops[iter7];
        iter7.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};
