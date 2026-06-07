const fs = require('fs');
const childProcess = require('child_process');

function createToggleModule({ toolPaths, readText, writeText }) {
  function isCursorRunning() {
    try {
      const result = childProcess.execSync(
        'powershell -NoProfile -Command "Get-Process Cursor -ErrorAction SilentlyContinue | Select-Object -First 1 Id"',
        { encoding: 'utf8', timeout: 3000 }
      );
      return result.trim().length > 0;
    } catch {
      return false;
    }
  }

  function readToggleSignal() {
    if (!fs.existsSync(toolPaths.toggleSignalPath)) {
      return { desiredState: 'zh', updatedAt: null, source: 'default' };
    }
    try {
      return JSON.parse(readText(toolPaths.toggleSignalPath));
    } catch {
      return { desiredState: 'zh', updatedAt: null, source: 'default' };
    }
  }

  function writeToggleSignal(desiredState) {
    const signal = {
      desiredState,
      updatedAt: new Date().toISOString(),
      source: 'cli-toggle',
    };
    writeText(toolPaths.toggleSignalPath, `${JSON.stringify(signal, null, 2)}\n`);
    return signal;
  }

  function runToggle(context) {
    const current = readToggleSignal();
    const nextState = current.desiredState === 'zh' ? 'en' : 'zh';
    writeToggleSignal(nextState);
    const running = isCursorRunning();
    if (nextState === 'en') {
      console.log('已发送切换信号：中文 → 英文');
    } else {
      console.log('已发送切换信号：英文 → 中文');
    }
    if (running) {
      console.log('Cursor 正在运行，约 2 秒内生效。');
    } else {
      console.log('Cursor 未运行，将在下次启动时生效。');
    }
  }

  function runDisable(context) {
    writeToggleSignal('en');
    const running = isCursorRunning();
    console.log('已发送切换信号：切换到英文');
    if (running) {
      console.log('Cursor 正在运行，约 2 秒内生效。');
    } else {
      console.log('Cursor 未运行，将在下次启动时生效。');
    }
  }

  function runEnable(context) {
    writeToggleSignal('zh');
    const running = isCursorRunning();
    console.log('已发送切换信号：切换到中文');
    if (running) {
      console.log('Cursor 正在运行，约 2 秒内生效。');
    } else {
      console.log('Cursor 未运行，将在下次启动时生效。');
    }
  }

  function runStatus(context) {
    const signal = readToggleSignal();
    const running = isCursorRunning();
    const stateLabel = signal.desiredState === 'zh' ? '中文' : '英文';
    console.log(`当前信号状态：${stateLabel}`);
    console.log(`Cursor 运行状态：${running ? '运行中' : '未运行'}`);
    if (signal.updatedAt) {
      console.log(`最后更新时间：${signal.updatedAt}`);
    }
  }

  return {
    isCursorRunning,
    readToggleSignal,
    writeToggleSignal,
    runToggle,
    runDisable,
    runEnable,
    runStatus,
  };
}

module.exports = {
  createToggleModule,
};
