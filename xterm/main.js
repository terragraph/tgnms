var term,
    protocol,
    socketURL,
    socket,
    pid,
    charWidth,
    charHeight;

var terminalContainer = document.getElementById('terminal-container'),
    colsElement = document.getElementById('cols'),
    rowsElement = document.getElementById('rows');

function setTerminalSize () {
  var cols = parseInt(colsElement.value),
      rows = parseInt(rowsElement.value),
      width = (cols * charWidth).toString() + 'px',
      height = (rows * charHeight).toString() + 'px';

  terminalContainer.style.width = width;
  terminalContainer.style.height = height;
  term.resize(cols, rows);
}

colsElement.addEventListener('change', setTerminalSize);
rowsElement.addEventListener('change', setTerminalSize);

createTerminal();

function createTerminal() {
  // Clean terminal
  while (terminalContainer.children.length) {
    terminalContainer.removeChild(terminalContainer.children[0]);
  }
  term = new Terminal();
  term.on('resize', function (size) {
    if (!pid) {
      return;
    }
    var cols = size.cols,
        rows = size.rows,
        url = '/terminals/' + pid + '/size?cols=' + cols + '&rows=' + rows;

    fetch(url, {method: 'POST'});
  });
  protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
  socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + '/terminals/';

  console.log(socketURL);
  term.open(terminalContainer);
  term.fit();

  var initialGeometry = term.proposeGeometry(),
      cols = initialGeometry.cols,
      rows = initialGeometry.rows;

  colsElement.value = cols;
  rowsElement.value = rows;

  fetch('/terminals?cols=' + cols + '&rows=' + rows, {method: 'POST'}).then(function (res) {

    charWidth = Math.ceil(term.element.offsetWidth / cols);
    charHeight = Math.ceil(term.element.offsetHeight / rows);

    res.text().then(function (pid) {
      window.pid = pid;
      socketURL += pid;
      socket = new WebSocket(socketURL);
      socket.onopen = runRealTerminal;
    });
  });
}


function runRealTerminal() {
  term.attach(socket);
  term._initialized = true;
}
