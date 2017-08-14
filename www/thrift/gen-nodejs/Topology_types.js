//
// Autogenerated by Thrift Compiler (0.9.3)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
var thrift = require('thrift');
var Thrift = thrift.Thrift;
var Q = thrift.Q;


var ttypes = module.exports = {};
ttypes.NodeType = {
  'CN' : 1,
  'DN' : 2
};
ttypes.PolarityType = {
  'ODD' : 1,
  'EVEN' : 2
};
ttypes.LinkType = {
  'WIRELESS' : 1,
  'ETHERNET' : 2
};
ttypes.NodeStatusType = {
  'OFFLINE' : 1,
  'ONLINE' : 2,
  'ONLINE_INITIATOR' : 3
};
GolayIdx = module.exports.GolayIdx = function(args) {
  this.txGolayIdx = null;
  this.rxGolayIdx = null;
  if (args) {
    if (args.txGolayIdx !== undefined && args.txGolayIdx !== null) {
      this.txGolayIdx = args.txGolayIdx;
    }
    if (args.rxGolayIdx !== undefined && args.rxGolayIdx !== null) {
      this.rxGolayIdx = args.rxGolayIdx;
    }
  }
};
GolayIdx.prototype = {};
GolayIdx.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.I64) {
        this.txGolayIdx = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I64) {
        this.rxGolayIdx = input.readI64();
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

GolayIdx.prototype.write = function(output) {
  output.writeStructBegin('GolayIdx');
  if (this.txGolayIdx !== null && this.txGolayIdx !== undefined) {
    output.writeFieldBegin('txGolayIdx', Thrift.Type.I64, 1);
    output.writeI64(this.txGolayIdx);
    output.writeFieldEnd();
  }
  if (this.rxGolayIdx !== null && this.rxGolayIdx !== undefined) {
    output.writeFieldBegin('rxGolayIdx', Thrift.Type.I64, 2);
    output.writeI64(this.rxGolayIdx);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

Location = module.exports.Location = function(args) {
  this.latitude = 0;
  this.longitude = 0;
  this.altitude = 0;
  this.accuracy = 40000000;
  if (args) {
    if (args.latitude !== undefined && args.latitude !== null) {
      this.latitude = args.latitude;
    }
    if (args.longitude !== undefined && args.longitude !== null) {
      this.longitude = args.longitude;
    }
    if (args.altitude !== undefined && args.altitude !== null) {
      this.altitude = args.altitude;
    }
    if (args.accuracy !== undefined && args.accuracy !== null) {
      this.accuracy = args.accuracy;
    }
  }
};
Location.prototype = {};
Location.prototype.read = function(input) {
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
      case 2:
      if (ftype == Thrift.Type.DOUBLE) {
        this.latitude = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.DOUBLE) {
        this.longitude = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.DOUBLE) {
        this.altitude = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.DOUBLE) {
        this.accuracy = input.readDouble();
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

Location.prototype.write = function(output) {
  output.writeStructBegin('Location');
  if (this.latitude !== null && this.latitude !== undefined) {
    output.writeFieldBegin('latitude', Thrift.Type.DOUBLE, 2);
    output.writeDouble(this.latitude);
    output.writeFieldEnd();
  }
  if (this.longitude !== null && this.longitude !== undefined) {
    output.writeFieldBegin('longitude', Thrift.Type.DOUBLE, 3);
    output.writeDouble(this.longitude);
    output.writeFieldEnd();
  }
  if (this.altitude !== null && this.altitude !== undefined) {
    output.writeFieldBegin('altitude', Thrift.Type.DOUBLE, 4);
    output.writeDouble(this.altitude);
    output.writeFieldEnd();
  }
  if (this.accuracy !== null && this.accuracy !== undefined) {
    output.writeFieldBegin('accuracy', Thrift.Type.DOUBLE, 5);
    output.writeDouble(this.accuracy);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

Site = module.exports.Site = function(args) {
  this.name = null;
  this.location = null;
  if (args) {
    if (args.name !== undefined && args.name !== null) {
      this.name = args.name;
    }
    if (args.location !== undefined && args.location !== null) {
      this.location = new ttypes.Location(args.location);
    }
  }
};
Site.prototype = {};
Site.prototype.read = function(input) {
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
        this.name = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRUCT) {
        this.location = new ttypes.Location();
        this.location.read(input);
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

Site.prototype.write = function(output) {
  output.writeStructBegin('Site');
  if (this.name !== null && this.name !== undefined) {
    output.writeFieldBegin('name', Thrift.Type.STRING, 1);
    output.writeString(this.name);
    output.writeFieldEnd();
  }
  if (this.location !== null && this.location !== undefined) {
    output.writeFieldBegin('location', Thrift.Type.STRUCT, 2);
    this.location.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

Node = module.exports.Node = function(args) {
  this.name = null;
  this.node_type = null;
  this.is_primary = null;
  this.mac_addr = null;
  this.pop_node = null;
  this.polarity = null;
  this.golay_idx = null;
  this.status = null;
  this.site_name = null;
  this.ant_azimuth = null;
  this.ant_elevation = null;
  this.has_cpe = null;
  if (args) {
    if (args.name !== undefined && args.name !== null) {
      this.name = args.name;
    }
    if (args.node_type !== undefined && args.node_type !== null) {
      this.node_type = args.node_type;
    }
    if (args.is_primary !== undefined && args.is_primary !== null) {
      this.is_primary = args.is_primary;
    }
    if (args.mac_addr !== undefined && args.mac_addr !== null) {
      this.mac_addr = args.mac_addr;
    }
    if (args.pop_node !== undefined && args.pop_node !== null) {
      this.pop_node = args.pop_node;
    }
    if (args.polarity !== undefined && args.polarity !== null) {
      this.polarity = args.polarity;
    }
    if (args.golay_idx !== undefined && args.golay_idx !== null) {
      this.golay_idx = new ttypes.GolayIdx(args.golay_idx);
    }
    if (args.status !== undefined && args.status !== null) {
      this.status = args.status;
    }
    if (args.site_name !== undefined && args.site_name !== null) {
      this.site_name = args.site_name;
    }
    if (args.ant_azimuth !== undefined && args.ant_azimuth !== null) {
      this.ant_azimuth = args.ant_azimuth;
    }
    if (args.ant_elevation !== undefined && args.ant_elevation !== null) {
      this.ant_elevation = args.ant_elevation;
    }
    if (args.has_cpe !== undefined && args.has_cpe !== null) {
      this.has_cpe = args.has_cpe;
    }
  }
};
Node.prototype = {};
Node.prototype.read = function(input) {
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
        this.name = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I32) {
        this.node_type = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.BOOL) {
        this.is_primary = input.readBool();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRING) {
        this.mac_addr = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.BOOL) {
        this.pop_node = input.readBool();
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.I32) {
        this.polarity = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      case 8:
      if (ftype == Thrift.Type.STRUCT) {
        this.golay_idx = new ttypes.GolayIdx();
        this.golay_idx.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 9:
      if (ftype == Thrift.Type.I32) {
        this.status = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      case 100:
      if (ftype == Thrift.Type.STRING) {
        this.site_name = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 101:
      if (ftype == Thrift.Type.DOUBLE) {
        this.ant_azimuth = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 102:
      if (ftype == Thrift.Type.DOUBLE) {
        this.ant_elevation = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 103:
      if (ftype == Thrift.Type.BOOL) {
        this.has_cpe = input.readBool();
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

Node.prototype.write = function(output) {
  output.writeStructBegin('Node');
  if (this.name !== null && this.name !== undefined) {
    output.writeFieldBegin('name', Thrift.Type.STRING, 1);
    output.writeString(this.name);
    output.writeFieldEnd();
  }
  if (this.node_type !== null && this.node_type !== undefined) {
    output.writeFieldBegin('node_type', Thrift.Type.I32, 2);
    output.writeI32(this.node_type);
    output.writeFieldEnd();
  }
  if (this.is_primary !== null && this.is_primary !== undefined) {
    output.writeFieldBegin('is_primary', Thrift.Type.BOOL, 3);
    output.writeBool(this.is_primary);
    output.writeFieldEnd();
  }
  if (this.mac_addr !== null && this.mac_addr !== undefined) {
    output.writeFieldBegin('mac_addr', Thrift.Type.STRING, 4);
    output.writeString(this.mac_addr);
    output.writeFieldEnd();
  }
  if (this.pop_node !== null && this.pop_node !== undefined) {
    output.writeFieldBegin('pop_node', Thrift.Type.BOOL, 5);
    output.writeBool(this.pop_node);
    output.writeFieldEnd();
  }
  if (this.polarity !== null && this.polarity !== undefined) {
    output.writeFieldBegin('polarity', Thrift.Type.I32, 7);
    output.writeI32(this.polarity);
    output.writeFieldEnd();
  }
  if (this.golay_idx !== null && this.golay_idx !== undefined) {
    output.writeFieldBegin('golay_idx', Thrift.Type.STRUCT, 8);
    this.golay_idx.write(output);
    output.writeFieldEnd();
  }
  if (this.status !== null && this.status !== undefined) {
    output.writeFieldBegin('status', Thrift.Type.I32, 9);
    output.writeI32(this.status);
    output.writeFieldEnd();
  }
  if (this.site_name !== null && this.site_name !== undefined) {
    output.writeFieldBegin('site_name', Thrift.Type.STRING, 100);
    output.writeString(this.site_name);
    output.writeFieldEnd();
  }
  if (this.ant_azimuth !== null && this.ant_azimuth !== undefined) {
    output.writeFieldBegin('ant_azimuth', Thrift.Type.DOUBLE, 101);
    output.writeDouble(this.ant_azimuth);
    output.writeFieldEnd();
  }
  if (this.ant_elevation !== null && this.ant_elevation !== undefined) {
    output.writeFieldBegin('ant_elevation', Thrift.Type.DOUBLE, 102);
    output.writeDouble(this.ant_elevation);
    output.writeFieldEnd();
  }
  if (this.has_cpe !== null && this.has_cpe !== undefined) {
    output.writeFieldBegin('has_cpe', Thrift.Type.BOOL, 103);
    output.writeBool(this.has_cpe);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

Link = module.exports.Link = function(args) {
  this.name = null;
  this.a_node_name = null;
  this.z_node_name = null;
  this.link_type = null;
  this.is_alive = null;
  this.linkup_attempts = null;
  this.golay_idx = null;
  this.control_superframe = null;
  if (args) {
    if (args.name !== undefined && args.name !== null) {
      this.name = args.name;
    }
    if (args.a_node_name !== undefined && args.a_node_name !== null) {
      this.a_node_name = args.a_node_name;
    }
    if (args.z_node_name !== undefined && args.z_node_name !== null) {
      this.z_node_name = args.z_node_name;
    }
    if (args.link_type !== undefined && args.link_type !== null) {
      this.link_type = args.link_type;
    }
    if (args.is_alive !== undefined && args.is_alive !== null) {
      this.is_alive = args.is_alive;
    }
    if (args.linkup_attempts !== undefined && args.linkup_attempts !== null) {
      this.linkup_attempts = args.linkup_attempts;
    }
    if (args.golay_idx !== undefined && args.golay_idx !== null) {
      this.golay_idx = new ttypes.GolayIdx(args.golay_idx);
    }
    if (args.control_superframe !== undefined && args.control_superframe !== null) {
      this.control_superframe = args.control_superframe;
    }
  }
};
Link.prototype = {};
Link.prototype.read = function(input) {
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
        this.name = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.a_node_name = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRING) {
        this.z_node_name = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.I32) {
        this.link_type = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.BOOL) {
        this.is_alive = input.readBool();
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.I64) {
        this.linkup_attempts = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.STRUCT) {
        this.golay_idx = new ttypes.GolayIdx();
        this.golay_idx.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 8:
      if (ftype == Thrift.Type.I64) {
        this.control_superframe = input.readI64();
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

Link.prototype.write = function(output) {
  output.writeStructBegin('Link');
  if (this.name !== null && this.name !== undefined) {
    output.writeFieldBegin('name', Thrift.Type.STRING, 1);
    output.writeString(this.name);
    output.writeFieldEnd();
  }
  if (this.a_node_name !== null && this.a_node_name !== undefined) {
    output.writeFieldBegin('a_node_name', Thrift.Type.STRING, 2);
    output.writeString(this.a_node_name);
    output.writeFieldEnd();
  }
  if (this.z_node_name !== null && this.z_node_name !== undefined) {
    output.writeFieldBegin('z_node_name', Thrift.Type.STRING, 3);
    output.writeString(this.z_node_name);
    output.writeFieldEnd();
  }
  if (this.link_type !== null && this.link_type !== undefined) {
    output.writeFieldBegin('link_type', Thrift.Type.I32, 4);
    output.writeI32(this.link_type);
    output.writeFieldEnd();
  }
  if (this.is_alive !== null && this.is_alive !== undefined) {
    output.writeFieldBegin('is_alive', Thrift.Type.BOOL, 5);
    output.writeBool(this.is_alive);
    output.writeFieldEnd();
  }
  if (this.linkup_attempts !== null && this.linkup_attempts !== undefined) {
    output.writeFieldBegin('linkup_attempts', Thrift.Type.I64, 6);
    output.writeI64(this.linkup_attempts);
    output.writeFieldEnd();
  }
  if (this.golay_idx !== null && this.golay_idx !== undefined) {
    output.writeFieldBegin('golay_idx', Thrift.Type.STRUCT, 7);
    this.golay_idx.write(output);
    output.writeFieldEnd();
  }
  if (this.control_superframe !== null && this.control_superframe !== undefined) {
    output.writeFieldBegin('control_superframe', Thrift.Type.I64, 8);
    output.writeI64(this.control_superframe);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

Topology = module.exports.Topology = function(args) {
  this.name = null;
  this.nodes = null;
  this.links = null;
  this.sites = null;
  if (args) {
    if (args.name !== undefined && args.name !== null) {
      this.name = args.name;
    }
    if (args.nodes !== undefined && args.nodes !== null) {
      this.nodes = Thrift.copyList(args.nodes, [ttypes.Node]);
    }
    if (args.links !== undefined && args.links !== null) {
      this.links = Thrift.copyList(args.links, [ttypes.Link]);
    }
    if (args.sites !== undefined && args.sites !== null) {
      this.sites = Thrift.copyList(args.sites, [ttypes.Site]);
    }
  }
};
Topology.prototype = {};
Topology.prototype.read = function(input) {
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
        this.name = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.LIST) {
        var _size0 = 0;
        var _rtmp34;
        this.nodes = [];
        var _etype3 = 0;
        _rtmp34 = input.readListBegin();
        _etype3 = _rtmp34.etype;
        _size0 = _rtmp34.size;
        for (var _i5 = 0; _i5 < _size0; ++_i5)
        {
          var elem6 = null;
          elem6 = new ttypes.Node();
          elem6.read(input);
          this.nodes.push(elem6);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.LIST) {
        var _size7 = 0;
        var _rtmp311;
        this.links = [];
        var _etype10 = 0;
        _rtmp311 = input.readListBegin();
        _etype10 = _rtmp311.etype;
        _size7 = _rtmp311.size;
        for (var _i12 = 0; _i12 < _size7; ++_i12)
        {
          var elem13 = null;
          elem13 = new ttypes.Link();
          elem13.read(input);
          this.links.push(elem13);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.LIST) {
        var _size14 = 0;
        var _rtmp318;
        this.sites = [];
        var _etype17 = 0;
        _rtmp318 = input.readListBegin();
        _etype17 = _rtmp318.etype;
        _size14 = _rtmp318.size;
        for (var _i19 = 0; _i19 < _size14; ++_i19)
        {
          var elem20 = null;
          elem20 = new ttypes.Site();
          elem20.read(input);
          this.sites.push(elem20);
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

Topology.prototype.write = function(output) {
  output.writeStructBegin('Topology');
  if (this.name !== null && this.name !== undefined) {
    output.writeFieldBegin('name', Thrift.Type.STRING, 1);
    output.writeString(this.name);
    output.writeFieldEnd();
  }
  if (this.nodes !== null && this.nodes !== undefined) {
    output.writeFieldBegin('nodes', Thrift.Type.LIST, 2);
    output.writeListBegin(Thrift.Type.STRUCT, this.nodes.length);
    for (var iter21 in this.nodes)
    {
      if (this.nodes.hasOwnProperty(iter21))
      {
        iter21 = this.nodes[iter21];
        iter21.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.links !== null && this.links !== undefined) {
    output.writeFieldBegin('links', Thrift.Type.LIST, 3);
    output.writeListBegin(Thrift.Type.STRUCT, this.links.length);
    for (var iter22 in this.links)
    {
      if (this.links.hasOwnProperty(iter22))
      {
        iter22 = this.links[iter22];
        iter22.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.sites !== null && this.sites !== undefined) {
    output.writeFieldBegin('sites', Thrift.Type.LIST, 4);
    output.writeListBegin(Thrift.Type.STRUCT, this.sites.length);
    for (var iter23 in this.sites)
    {
      if (this.sites.hasOwnProperty(iter23))
      {
        iter23 = this.sites[iter23];
        iter23.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

