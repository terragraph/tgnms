//
// Autogenerated by Thrift Compiler
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
var Thrift = require('thrift').Thrift;
var ttypes = module.exports = {};

var Lsdb_ttypes = require('./Lsdb_types')
var IpPrefix_ttypes = require('./IpPrefix_types')

ttypes.AggrMessageType = {
'GET_STATUS_DUMP' : 101,
'GET_ROUTING_ADJ' : 102,
'STATUS_DUMP' : 201,
'ROUTING_ADJ' : 202,
'STATUS_REPORT' : 401,
'STATS_REPORT' : 402,
'GET_ALERTS_CONFIG' : 501,
'GET_ALERTS_CONFIG_RESP' : 502,
'SET_ALERTS_CONFIG' : 503,
'ACK' : 601
};
ttypes.AggrAlertComparator = {
'ALERT_GT' : 0,
'ALERT_GTE' : 1,
'ALERT_LT' : 2,
'ALERT_LTE' : 3
};
ttypes.AggrAlertLevel = {
'ALERT_INFO' : 0,
'ALERT_WARNING' : 1,
'ALERT_CRITICAL' : 2
};
AggrGetStatusDump = module.exports.AggrGetStatusDump = function(args) {
};
AggrGetStatusDump.prototype = {};
AggrGetStatusDump.prototype.read = function(input) {
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
    input.skip(ftype);
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

AggrGetStatusDump.prototype.write = function(output) {
  output.writeStructBegin('AggrGetStatusDump');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

AggrStatusDump = module.exports.AggrStatusDump = function(args) {
  this.adjacencyMap = null;
  this.statusReports = null;
  if (args) {
    if (args.adjacencyMap !== undefined) {
      this.adjacencyMap = args.adjacencyMap;
    }
    if (args.statusReports !== undefined) {
      this.statusReports = args.statusReports;
    }
  }
};
AggrStatusDump.prototype = {};
AggrStatusDump.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.MAP) {
        var _size0 = 0;
        var _rtmp34;
        this.adjacencyMap = {};
        var _ktype1 = 0;
        var _vtype2 = 0;
        _rtmp34 = input.readMapBegin();
        _ktype1 = _rtmp34.ktype;
        _vtype2 = _rtmp34.vtype;
        _size0 = _rtmp34.size;
        for (var _i5 = 0; _i5 < _size0; ++_i5)
        {
          var key6 = null;
          var val7 = null;
          key6 = input.readString();
          val7 = new Lsdb_ttypes.AdjacencyDatabase();
          val7.read(input);
          this.adjacencyMap[key6] = val7;
        }
        input.readMapEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.MAP) {
        var _size8 = 0;
        var _rtmp312;
        this.statusReports = {};
        var _ktype9 = 0;
        var _vtype10 = 0;
        _rtmp312 = input.readMapBegin();
        _ktype9 = _rtmp312.ktype;
        _vtype10 = _rtmp312.vtype;
        _size8 = _rtmp312.size;
        for (var _i13 = 0; _i13 < _size8; ++_i13)
        {
          var key14 = null;
          var val15 = null;
          key14 = input.readString();
          val15 = new ttypes.AggrStatusReport();
          val15.read(input);
          this.statusReports[key14] = val15;
        }
        input.readMapEnd();
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

AggrStatusDump.prototype.write = function(output) {
  output.writeStructBegin('AggrStatusDump');
  if (this.adjacencyMap !== null && this.adjacencyMap !== undefined) {
    output.writeFieldBegin('adjacencyMap', Thrift.Type.MAP, 1);
    output.writeMapBegin(Thrift.Type.STRING, Thrift.Type.STRUCT, Thrift.objectLength(this.adjacencyMap));
    for (var kiter16 in this.adjacencyMap)
    {
      if (this.adjacencyMap.hasOwnProperty(kiter16))
      {
        var viter17 = this.adjacencyMap[kiter16];
        output.writeString(kiter16);
        viter17.write(output);
      }
    }
    output.writeMapEnd();
    output.writeFieldEnd();
  }
  if (this.statusReports !== null && this.statusReports !== undefined) {
    output.writeFieldBegin('statusReports', Thrift.Type.MAP, 2);
    output.writeMapBegin(Thrift.Type.STRING, Thrift.Type.STRUCT, Thrift.objectLength(this.statusReports));
    for (var kiter18 in this.statusReports)
    {
      if (this.statusReports.hasOwnProperty(kiter18))
      {
        var viter19 = this.statusReports[kiter18];
        output.writeString(kiter18);
        viter19.write(output);
      }
    }
    output.writeMapEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

AggrStatusReport = module.exports.AggrStatusReport = function(args) {
  this.timeStamp = null;
  this.ipv6Address = null;
  this.routes = null;
  if (args) {
    if (args.timeStamp !== undefined) {
      this.timeStamp = args.timeStamp;
    }
    if (args.ipv6Address !== undefined) {
      this.ipv6Address = args.ipv6Address;
    }
    if (args.routes !== undefined) {
      this.routes = args.routes;
    }
  }
};
AggrStatusReport.prototype = {};
AggrStatusReport.prototype.read = function(input) {
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
        this.timeStamp = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.ipv6Address = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.LIST) {
        var _size20 = 0;
        var _rtmp324;
        this.routes = [];
        var _etype23 = 0;
        _rtmp324 = input.readListBegin();
        _etype23 = _rtmp324.etype;
        _size20 = _rtmp324.size;
        for (var _i25 = 0; _i25 < _size20; ++_i25)
        {
          var elem26 = null;
          elem26 = new IpPrefix_ttypes.UnicastRoute();
          elem26.read(input);
          this.routes.push(elem26);
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

AggrStatusReport.prototype.write = function(output) {
  output.writeStructBegin('AggrStatusReport');
  if (this.timeStamp !== null && this.timeStamp !== undefined) {
    output.writeFieldBegin('timeStamp', Thrift.Type.I64, 1);
    output.writeI64(this.timeStamp);
    output.writeFieldEnd();
  }
  if (this.ipv6Address !== null && this.ipv6Address !== undefined) {
    output.writeFieldBegin('ipv6Address', Thrift.Type.STRING, 2);
    output.writeString(this.ipv6Address);
    output.writeFieldEnd();
  }
  if (this.routes !== null && this.routes !== undefined) {
    output.writeFieldBegin('routes', Thrift.Type.LIST, 3);
    output.writeListBegin(Thrift.Type.STRUCT, this.routes.length);
    for (var iter27 in this.routes)
    {
      if (this.routes.hasOwnProperty(iter27))
      {
        iter27 = this.routes[iter27];
        iter27.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

AggrStat = module.exports.AggrStat = function(args) {
  this.key = null;
  this.timestamp = null;
  this.value = null;
  if (args) {
    if (args.key !== undefined) {
      this.key = args.key;
    }
    if (args.timestamp !== undefined) {
      this.timestamp = args.timestamp;
    }
    if (args.value !== undefined) {
      this.value = args.value;
    }
  }
};
AggrStat.prototype = {};
AggrStat.prototype.read = function(input) {
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
        this.key = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I64) {
        this.timestamp = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.DOUBLE) {
        this.value = input.readDouble();
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

AggrStat.prototype.write = function(output) {
  output.writeStructBegin('AggrStat');
  if (this.key !== null && this.key !== undefined) {
    output.writeFieldBegin('key', Thrift.Type.STRING, 1);
    output.writeString(this.key);
    output.writeFieldEnd();
  }
  if (this.timestamp !== null && this.timestamp !== undefined) {
    output.writeFieldBegin('timestamp', Thrift.Type.I64, 2);
    output.writeI64(this.timestamp);
    output.writeFieldEnd();
  }
  if (this.value !== null && this.value !== undefined) {
    output.writeFieldBegin('value', Thrift.Type.DOUBLE, 3);
    output.writeDouble(this.value);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

AggrStatsReport = module.exports.AggrStatsReport = function(args) {
  this.stats = null;
  if (args) {
    if (args.stats !== undefined) {
      this.stats = args.stats;
    }
  }
};
AggrStatsReport.prototype = {};
AggrStatsReport.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.LIST) {
        var _size28 = 0;
        var _rtmp332;
        this.stats = [];
        var _etype31 = 0;
        _rtmp332 = input.readListBegin();
        _etype31 = _rtmp332.etype;
        _size28 = _rtmp332.size;
        for (var _i33 = 0; _i33 < _size28; ++_i33)
        {
          var elem34 = null;
          elem34 = new ttypes.AggrStat();
          elem34.read(input);
          this.stats.push(elem34);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

AggrStatsReport.prototype.write = function(output) {
  output.writeStructBegin('AggrStatsReport');
  if (this.stats !== null && this.stats !== undefined) {
    output.writeFieldBegin('stats', Thrift.Type.LIST, 1);
    output.writeListBegin(Thrift.Type.STRUCT, this.stats.length);
    for (var iter35 in this.stats)
    {
      if (this.stats.hasOwnProperty(iter35))
      {
        iter35 = this.stats[iter35];
        iter35.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

AggrAlertConf = module.exports.AggrAlertConf = function(args) {
  this.id = null;
  this.key = null;
  this.threshold = null;
  this.comp = null;
  this.level = null;
  this.node_mac = null;
  if (args) {
    if (args.id !== undefined) {
      this.id = args.id;
    }
    if (args.key !== undefined) {
      this.key = args.key;
    }
    if (args.threshold !== undefined) {
      this.threshold = args.threshold;
    }
    if (args.comp !== undefined) {
      this.comp = args.comp;
    }
    if (args.level !== undefined) {
      this.level = args.level;
    }
    if (args.node_mac !== undefined) {
      this.node_mac = args.node_mac;
    }
  }
};
AggrAlertConf.prototype = {};
AggrAlertConf.prototype.read = function(input) {
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
        this.id = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.key = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.DOUBLE) {
        this.threshold = input.readDouble();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.I32) {
        this.comp = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.I32) {
        this.level = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.STRING) {
        this.node_mac = input.readString();
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

AggrAlertConf.prototype.write = function(output) {
  output.writeStructBegin('AggrAlertConf');
  if (this.id !== null && this.id !== undefined) {
    output.writeFieldBegin('id', Thrift.Type.STRING, 1);
    output.writeString(this.id);
    output.writeFieldEnd();
  }
  if (this.key !== null && this.key !== undefined) {
    output.writeFieldBegin('key', Thrift.Type.STRING, 2);
    output.writeString(this.key);
    output.writeFieldEnd();
  }
  if (this.threshold !== null && this.threshold !== undefined) {
    output.writeFieldBegin('threshold', Thrift.Type.DOUBLE, 3);
    output.writeDouble(this.threshold);
    output.writeFieldEnd();
  }
  if (this.comp !== null && this.comp !== undefined) {
    output.writeFieldBegin('comp', Thrift.Type.I32, 4);
    output.writeI32(this.comp);
    output.writeFieldEnd();
  }
  if (this.level !== null && this.level !== undefined) {
    output.writeFieldBegin('level', Thrift.Type.I32, 5);
    output.writeI32(this.level);
    output.writeFieldEnd();
  }
  if (this.node_mac !== null && this.node_mac !== undefined) {
    output.writeFieldBegin('node_mac', Thrift.Type.STRING, 6);
    output.writeString(this.node_mac);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

AggrAlertConfList = module.exports.AggrAlertConfList = function(args) {
  this.alerts = null;
  if (args) {
    if (args.alerts !== undefined) {
      this.alerts = args.alerts;
    }
  }
};
AggrAlertConfList.prototype = {};
AggrAlertConfList.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.LIST) {
        var _size36 = 0;
        var _rtmp340;
        this.alerts = [];
        var _etype39 = 0;
        _rtmp340 = input.readListBegin();
        _etype39 = _rtmp340.etype;
        _size36 = _rtmp340.size;
        for (var _i41 = 0; _i41 < _size36; ++_i41)
        {
          var elem42 = null;
          elem42 = new ttypes.AggrAlertConf();
          elem42.read(input);
          this.alerts.push(elem42);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

AggrAlertConfList.prototype.write = function(output) {
  output.writeStructBegin('AggrAlertConfList');
  if (this.alerts !== null && this.alerts !== undefined) {
    output.writeFieldBegin('alerts', Thrift.Type.LIST, 1);
    output.writeListBegin(Thrift.Type.STRUCT, this.alerts.length);
    for (var iter43 in this.alerts)
    {
      if (this.alerts.hasOwnProperty(iter43))
      {
        iter43 = this.alerts[iter43];
        iter43.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

AggrMessage = module.exports.AggrMessage = function(args) {
  this.mType = null;
  this.value = null;
  if (args) {
    if (args.mType !== undefined) {
      this.mType = args.mType;
    }
    if (args.value !== undefined) {
      this.value = args.value;
    }
  }
};
AggrMessage.prototype = {};
AggrMessage.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.I32) {
        this.mType = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.value = input.readString();
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

AggrMessage.prototype.write = function(output) {
  output.writeStructBegin('AggrMessage');
  if (this.mType !== null && this.mType !== undefined) {
    output.writeFieldBegin('mType', Thrift.Type.I32, 1);
    output.writeI32(this.mType);
    output.writeFieldEnd();
  }
  if (this.value !== null && this.value !== undefined) {
    output.writeFieldBegin('value', Thrift.Type.STRING, 2);
    output.writeString(this.value);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

AggrAck = module.exports.AggrAck = function(args) {
  this.success = null;
  this.message = null;
  if (args) {
    if (args.success !== undefined) {
      this.success = args.success;
    }
    if (args.message !== undefined) {
      this.message = args.message;
    }
  }
};
AggrAck.prototype = {};
AggrAck.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.BOOL) {
        this.success = input.readBool();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.message = input.readString();
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

AggrAck.prototype.write = function(output) {
  output.writeStructBegin('AggrAck');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.BOOL, 1);
    output.writeBool(this.success);
    output.writeFieldEnd();
  }
  if (this.message !== null && this.message !== undefined) {
    output.writeFieldBegin('message', Thrift.Type.STRING, 2);
    output.writeString(this.message);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};
