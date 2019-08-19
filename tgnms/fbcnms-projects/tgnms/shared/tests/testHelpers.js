/*
 * Mocks out console commands to keep test output clean
 * and to allow us to assert if they were called.
 *
 * IMPORTANT:
 * If you are debugging and adding console commands, you cannot call this
 * function in your test. If you want to spy on these commands, but still
 * see their output, use jest.spyOn.
 */
export function mockConsole() {
  const mock = {warn: jest.fn(), error: jest.fn(), log: jest.fn()};
  global.console = mock;
  return mock;
}
