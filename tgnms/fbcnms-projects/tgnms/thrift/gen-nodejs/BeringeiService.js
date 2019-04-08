//
// Autogenerated by Thrift Compiler (0.9.3)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
const thrift = require('thrift');
const Thrift = thrift.Thrift;
const Q = thrift.Q;

const beringei_data_ttypes = require('./beringei_data_types');


const ttypes = require('./beringei_types');
//HELPER FUNCTIONS AND STRUCTURES

BeringeiService_getData_args = function(args) {
  this.req = null;
  if (args) {
    if (args.req !== undefined && args.req !== null) {
      this.req = new beringei_data_ttypes.GetDataRequest(args.req);
    }
  }
};
BeringeiService_getData_args.prototype = {};
BeringeiService_getData_args.prototype.read = function(input) {
  input.readStructBegin();
  while (true) {
    const ret = input.readFieldBegin();
    const fname = ret.fname;
    const ftype = ret.ftype;
    const fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.req = new beringei_data_ttypes.GetDataRequest();
        this.req.read(input);
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

BeringeiService_getData_args.prototype.write = function(output) {
  output.writeStructBegin('BeringeiService_getData_args');
  if (this.req !== null && this.req !== undefined) {
    output.writeFieldBegin('req', Thrift.Type.STRUCT, 1);
    this.req.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

BeringeiService_getData_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = new beringei_data_ttypes.GetDataResult(args.success);
    }
  }
};
BeringeiService_getData_result.prototype = {};
BeringeiService_getData_result.prototype.read = function(input) {
  input.readStructBegin();
  while (true) {
    const ret = input.readFieldBegin();
    const fname = ret.fname;
    const ftype = ret.ftype;
    const fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 0:
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new beringei_data_ttypes.GetDataResult();
        this.success.read(input);
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

BeringeiService_getData_result.prototype.write = function(output) {
  output.writeStructBegin('BeringeiService_getData_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

BeringeiService_putDataPoints_args = function(args) {
  this.req = null;
  if (args) {
    if (args.req !== undefined && args.req !== null) {
      this.req = new beringei_data_ttypes.PutDataRequest(args.req);
    }
  }
};
BeringeiService_putDataPoints_args.prototype = {};
BeringeiService_putDataPoints_args.prototype.read = function(input) {
  input.readStructBegin();
  while (true) {
    const ret = input.readFieldBegin();
    const fname = ret.fname;
    const ftype = ret.ftype;
    const fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.req = new beringei_data_ttypes.PutDataRequest();
        this.req.read(input);
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

BeringeiService_putDataPoints_args.prototype.write = function(output) {
  output.writeStructBegin('BeringeiService_putDataPoints_args');
  if (this.req !== null && this.req !== undefined) {
    output.writeFieldBegin('req', Thrift.Type.STRUCT, 1);
    this.req.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

BeringeiService_putDataPoints_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = new beringei_data_ttypes.PutDataResult(args.success);
    }
  }
};
BeringeiService_putDataPoints_result.prototype = {};
BeringeiService_putDataPoints_result.prototype.read = function(input) {
  input.readStructBegin();
  while (true) {
    const ret = input.readFieldBegin();
    const fname = ret.fname;
    const ftype = ret.ftype;
    const fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 0:
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new beringei_data_ttypes.PutDataResult();
        this.success.read(input);
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

BeringeiService_putDataPoints_result.prototype.write = function(output) {
  output.writeStructBegin('BeringeiService_putDataPoints_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

BeringeiService_getShardDataBucket_args = function(args) {
  this.begin1 = null;
  this.end1 = null;
  this.shardId = null;
  this.offset = null;
  this.limit = null;
  if (args) {
    if (args.begin1 !== undefined && args.begin1 !== null) {
      this.begin1 = args.begin1;
    }
    if (args.end1 !== undefined && args.end1 !== null) {
      this.end1 = args.end1;
    }
    if (args.shardId !== undefined && args.shardId !== null) {
      this.shardId = args.shardId;
    }
    if (args.offset !== undefined && args.offset !== null) {
      this.offset = args.offset;
    }
    if (args.limit !== undefined && args.limit !== null) {
      this.limit = args.limit;
    }
  }
};
BeringeiService_getShardDataBucket_args.prototype = {};
BeringeiService_getShardDataBucket_args.prototype.read = function(input) {
  input.readStructBegin();
  while (true) {
    const ret = input.readFieldBegin();
    const fname = ret.fname;
    const ftype = ret.ftype;
    const fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 1:
      if (ftype == Thrift.Type.I64) {
        this.begin1 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I64) {
        this.end1 = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.I64) {
        this.shardId = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.I32) {
        this.offset = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.I32) {
        this.limit = input.readI32();
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

BeringeiService_getShardDataBucket_args.prototype.write = function(output) {
  output.writeStructBegin('BeringeiService_getShardDataBucket_args');
  if (this.begin1 !== null && this.begin1 !== undefined) {
    output.writeFieldBegin('begin1', Thrift.Type.I64, 1);
    output.writeI64(this.begin1);
    output.writeFieldEnd();
  }
  if (this.end1 !== null && this.end1 !== undefined) {
    output.writeFieldBegin('end1', Thrift.Type.I64, 2);
    output.writeI64(this.end1);
    output.writeFieldEnd();
  }
  if (this.shardId !== null && this.shardId !== undefined) {
    output.writeFieldBegin('shardId', Thrift.Type.I64, 3);
    output.writeI64(this.shardId);
    output.writeFieldEnd();
  }
  if (this.offset !== null && this.offset !== undefined) {
    output.writeFieldBegin('offset', Thrift.Type.I32, 4);
    output.writeI32(this.offset);
    output.writeFieldEnd();
  }
  if (this.limit !== null && this.limit !== undefined) {
    output.writeFieldBegin('limit', Thrift.Type.I32, 5);
    output.writeI32(this.limit);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

BeringeiService_getShardDataBucket_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = new beringei_data_ttypes.GetShardDataBucketResult(args.success);
    }
  }
};
BeringeiService_getShardDataBucket_result.prototype = {};
BeringeiService_getShardDataBucket_result.prototype.read = function(input) {
  input.readStructBegin();
  while (true) {
    const ret = input.readFieldBegin();
    const fname = ret.fname;
    const ftype = ret.ftype;
    const fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 0:
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new beringei_data_ttypes.GetShardDataBucketResult();
        this.success.read(input);
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

BeringeiService_getShardDataBucket_result.prototype.write = function(output) {
  output.writeStructBegin('BeringeiService_getShardDataBucket_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

BeringeiService_getLastUpdateTimes_args = function(args) {
  this.req = null;
  if (args) {
    if (args.req !== undefined && args.req !== null) {
      this.req = new beringei_data_ttypes.GetLastUpdateTimesRequest(args.req);
    }
  }
};
BeringeiService_getLastUpdateTimes_args.prototype = {};
BeringeiService_getLastUpdateTimes_args.prototype.read = function(input) {
  input.readStructBegin();
  while (true) {
    const ret = input.readFieldBegin();
    const fname = ret.fname;
    const ftype = ret.ftype;
    const fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.req = new beringei_data_ttypes.GetLastUpdateTimesRequest();
        this.req.read(input);
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

BeringeiService_getLastUpdateTimes_args.prototype.write = function(output) {
  output.writeStructBegin('BeringeiService_getLastUpdateTimes_args');
  if (this.req !== null && this.req !== undefined) {
    output.writeFieldBegin('req', Thrift.Type.STRUCT, 1);
    this.req.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

BeringeiService_getLastUpdateTimes_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = new beringei_data_ttypes.GetLastUpdateTimesResult(args.success);
    }
  }
};
BeringeiService_getLastUpdateTimes_result.prototype = {};
BeringeiService_getLastUpdateTimes_result.prototype.read = function(input) {
  input.readStructBegin();
  while (true) {
    const ret = input.readFieldBegin();
    const fname = ret.fname;
    const ftype = ret.ftype;
    const fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 0:
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new beringei_data_ttypes.GetLastUpdateTimesResult();
        this.success.read(input);
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

BeringeiService_getLastUpdateTimes_result.prototype.write = function(output) {
  output.writeStructBegin('BeringeiService_getLastUpdateTimes_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

BeringeiServiceClient = exports.Client = function(output, pClass) {
    this.output = output;
    this.pClass = pClass;
    this._seqid = 0;
    this._reqs = {};
};
BeringeiServiceClient.prototype = {};
BeringeiServiceClient.prototype.seqid = function() { return this._seqid; };
BeringeiServiceClient.prototype.new_seqid = function() { return this._seqid += 1; };
BeringeiServiceClient.prototype.getData = function(req, callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    const _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_getData(req);
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_getData(req);
  }
};

BeringeiServiceClient.prototype.send_getData = function(req) {
  const output = new this.pClass(this.output);
  output.writeMessageBegin('getData', Thrift.MessageType.CALL, this.seqid());
  const args = new BeringeiService_getData_args();
  args.req = req;
  args.write(output);
  output.writeMessageEnd();
  return this.output.flush();
};

BeringeiServiceClient.prototype.recv_getData = function(input, mtype, rseqid) {
  const callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    const x = new Thrift.TApplicationException();
    x.read(input);
    input.readMessageEnd();
    return callback(x);
  }
  const result = new BeringeiService_getData_result();
  result.read(input);
  input.readMessageEnd();

  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('getData failed: unknown result');
};
BeringeiServiceClient.prototype.putDataPoints = function(req, callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    const _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_putDataPoints(req);
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_putDataPoints(req);
  }
};

BeringeiServiceClient.prototype.send_putDataPoints = function(req) {
  const output = new this.pClass(this.output);
  output.writeMessageBegin('putDataPoints', Thrift.MessageType.CALL, this.seqid());
  const args = new BeringeiService_putDataPoints_args();
  args.req = req;
  args.write(output);
  output.writeMessageEnd();
  return this.output.flush();
};

BeringeiServiceClient.prototype.recv_putDataPoints = function(input, mtype, rseqid) {
  const callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    const x = new Thrift.TApplicationException();
    x.read(input);
    input.readMessageEnd();
    return callback(x);
  }
  const result = new BeringeiService_putDataPoints_result();
  result.read(input);
  input.readMessageEnd();

  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('putDataPoints failed: unknown result');
};
BeringeiServiceClient.prototype.getShardDataBucket = function(begin1, end1, shardId, offset, limit, callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    const _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_getShardDataBucket(begin1, end1, shardId, offset, limit);
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_getShardDataBucket(begin1, end1, shardId, offset, limit);
  }
};

BeringeiServiceClient.prototype.send_getShardDataBucket = function(begin1, end1, shardId, offset, limit) {
  const output = new this.pClass(this.output);
  output.writeMessageBegin('getShardDataBucket', Thrift.MessageType.CALL, this.seqid());
  const args = new BeringeiService_getShardDataBucket_args();
  args.begin1 = begin1;
  args.end1 = end1;
  args.shardId = shardId;
  args.offset = offset;
  args.limit = limit;
  args.write(output);
  output.writeMessageEnd();
  return this.output.flush();
};

BeringeiServiceClient.prototype.recv_getShardDataBucket = function(input, mtype, rseqid) {
  const callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    const x = new Thrift.TApplicationException();
    x.read(input);
    input.readMessageEnd();
    return callback(x);
  }
  const result = new BeringeiService_getShardDataBucket_result();
  result.read(input);
  input.readMessageEnd();

  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('getShardDataBucket failed: unknown result');
};
BeringeiServiceClient.prototype.getLastUpdateTimes = function(req, callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    const _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_getLastUpdateTimes(req);
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_getLastUpdateTimes(req);
  }
};

BeringeiServiceClient.prototype.send_getLastUpdateTimes = function(req) {
  const output = new this.pClass(this.output);
  output.writeMessageBegin('getLastUpdateTimes', Thrift.MessageType.CALL, this.seqid());
  const args = new BeringeiService_getLastUpdateTimes_args();
  args.req = req;
  args.write(output);
  output.writeMessageEnd();
  return this.output.flush();
};

BeringeiServiceClient.prototype.recv_getLastUpdateTimes = function(input, mtype, rseqid) {
  const callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    const x = new Thrift.TApplicationException();
    x.read(input);
    input.readMessageEnd();
    return callback(x);
  }
  const result = new BeringeiService_getLastUpdateTimes_result();
  result.read(input);
  input.readMessageEnd();

  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('getLastUpdateTimes failed: unknown result');
};
BeringeiServiceProcessor = exports.Processor = function(handler) {
  this._handler = handler;
};
BeringeiServiceProcessor.prototype.process = function(input, output) {
  const r = input.readMessageBegin();
  if (this['process_' + r.fname]) {
    return this['process_' + r.fname].call(this, r.rseqid, input, output);
  } else {
    input.skip(Thrift.Type.STRUCT);
    input.readMessageEnd();
    const x = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN_METHOD, 'Unknown function ' + r.fname);
    output.writeMessageBegin(r.fname, Thrift.MessageType.EXCEPTION, r.rseqid);
    x.write(output);
    output.writeMessageEnd();
    output.flush();
  }
};

BeringeiServiceProcessor.prototype.process_getData = function(seqid, input, output) {
  const args = new BeringeiService_getData_args();
  args.read(input);
  input.readMessageEnd();
  if (this._handler.getData.length === 1) {
    Q.fcall(this._handler.getData, args.req)
      .then(result => {
        var result = new BeringeiService_getData_result({success: result});
        output.writeMessageBegin('getData', Thrift.MessageType.REPLY, seqid);
        result.write(output);
        output.writeMessageEnd();
        output.flush();
      }, err => {
        const result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin('getData', Thrift.MessageType.EXCEPTION, seqid);
        result.write(output);
        output.writeMessageEnd();
        output.flush();
      });
  } else {
    this._handler.getData(args.req, (err, result) => {
      if (err == null) {
        var result = new BeringeiService_getData_result((err != null ? err : {success: result}));
        output.writeMessageBegin('getData', Thrift.MessageType.REPLY, seqid);
      } else {
        var result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin('getData', Thrift.MessageType.EXCEPTION, seqid);
      }
      result.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};

BeringeiServiceProcessor.prototype.process_putDataPoints = function(seqid, input, output) {
  const args = new BeringeiService_putDataPoints_args();
  args.read(input);
  input.readMessageEnd();
  if (this._handler.putDataPoints.length === 1) {
    Q.fcall(this._handler.putDataPoints, args.req)
      .then(result => {
        var result = new BeringeiService_putDataPoints_result({success: result});
        output.writeMessageBegin('putDataPoints', Thrift.MessageType.REPLY, seqid);
        result.write(output);
        output.writeMessageEnd();
        output.flush();
      }, err => {
        const result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin('putDataPoints', Thrift.MessageType.EXCEPTION, seqid);
        result.write(output);
        output.writeMessageEnd();
        output.flush();
      });
  } else {
    this._handler.putDataPoints(args.req, (err, result) => {
      if (err == null) {
        var result = new BeringeiService_putDataPoints_result((err != null ? err : {success: result}));
        output.writeMessageBegin('putDataPoints', Thrift.MessageType.REPLY, seqid);
      } else {
        var result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin('putDataPoints', Thrift.MessageType.EXCEPTION, seqid);
      }
      result.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};

BeringeiServiceProcessor.prototype.process_getShardDataBucket = function(seqid, input, output) {
  const args = new BeringeiService_getShardDataBucket_args();
  args.read(input);
  input.readMessageEnd();
  if (this._handler.getShardDataBucket.length === 5) {
    Q.fcall(this._handler.getShardDataBucket, args.begin1, args.end1, args.shardId, args.offset, args.limit)
      .then(result => {
        var result = new BeringeiService_getShardDataBucket_result({success: result});
        output.writeMessageBegin('getShardDataBucket', Thrift.MessageType.REPLY, seqid);
        result.write(output);
        output.writeMessageEnd();
        output.flush();
      }, err => {
        const result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin('getShardDataBucket', Thrift.MessageType.EXCEPTION, seqid);
        result.write(output);
        output.writeMessageEnd();
        output.flush();
      });
  } else {
    this._handler.getShardDataBucket(args.begin1, args.end1, args.shardId, args.offset, args.limit, (err, result) => {
      if (err == null) {
        var result = new BeringeiService_getShardDataBucket_result((err != null ? err : {success: result}));
        output.writeMessageBegin('getShardDataBucket', Thrift.MessageType.REPLY, seqid);
      } else {
        var result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin('getShardDataBucket', Thrift.MessageType.EXCEPTION, seqid);
      }
      result.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};

BeringeiServiceProcessor.prototype.process_getLastUpdateTimes = function(seqid, input, output) {
  const args = new BeringeiService_getLastUpdateTimes_args();
  args.read(input);
  input.readMessageEnd();
  if (this._handler.getLastUpdateTimes.length === 1) {
    Q.fcall(this._handler.getLastUpdateTimes, args.req)
      .then(result => {
        var result = new BeringeiService_getLastUpdateTimes_result({success: result});
        output.writeMessageBegin('getLastUpdateTimes', Thrift.MessageType.REPLY, seqid);
        result.write(output);
        output.writeMessageEnd();
        output.flush();
      }, err => {
        const result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin('getLastUpdateTimes', Thrift.MessageType.EXCEPTION, seqid);
        result.write(output);
        output.writeMessageEnd();
        output.flush();
      });
  } else {
    this._handler.getLastUpdateTimes(args.req, (err, result) => {
      if (err == null) {
        var result = new BeringeiService_getLastUpdateTimes_result((err != null ? err : {success: result}));
        output.writeMessageBegin('getLastUpdateTimes', Thrift.MessageType.REPLY, seqid);
      } else {
        var result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin('getLastUpdateTimes', Thrift.MessageType.EXCEPTION, seqid);
      }
      result.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};

