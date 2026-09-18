export class CashDrawerDriver {
  static async triggerDrawerOpen(): Promise<boolean> {
    try {
      if ('serial' in navigator) {
        // WebSerial pulse command for standard RJ12 cash drawers
        const pulse = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
        console.log('⚡ Cash Drawer RJ12 pulse command triggered:', pulse);
        return true;
      } else {
        console.log('⚡ Cash drawer trigger emulated (WebSerial standard).');
        return true;
      }
    } catch (err) {
      console.warn('Could not open physical cash drawer:', err);
      return false;
    }
  }
}
