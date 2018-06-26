function getNodesWithUpgradeStatus (nodes, upgradeState) {
  const upgradeStatusDump = {
    curUpgradeReq: upgradeState.curReq,

    curBatch: [],
    pendingBatches: [],
    pendingReqs: upgradeState.pendingReqs,
    // pendingReqNodes: [], // a node might appear in multiple pending requests
  };

  // node mac_addr --> node object
  const nodeNameToNode = {};
  nodes.forEach(node => {
    nodeNameToNode[node.name] = node;
  });

  // populate current batch
  const curBatchNodes = [];
  upgradeState.curBatch.filter(name => !!nodeNameToNode[name]).forEach(name => {
    curBatchNodes.push(nodeNameToNode[name]);
  });
  upgradeStatusDump.curBatch = curBatchNodes;

  // populate pending batches
  const pendingBatchNodes = [];
  upgradeState.pendingBatches.forEach((batch, batchIdx) => {
    const nodesInBatch = [];
    batch.filter(name => !!nodeNameToNode[name]).forEach(name => {
      nodesInBatch.push(nodeNameToNode[name]);
    });
    pendingBatchNodes.push(nodesInBatch);
  });
  upgradeStatusDump.pendingBatches = pendingBatchNodes;

  return upgradeStatusDump;
}

module.exports = {
  getNodesWithUpgradeStatus,
}
