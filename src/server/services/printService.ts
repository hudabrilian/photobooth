import { spawn } from 'child_process';
import path from 'path';
import { logger } from '../utils/logger';
import { PROJECT_ROOT } from '../config/env';
import type { PrintConfig } from '../types';

const defaultConfig: PrintConfig = {
  type: 'exe',
  exePath: path.join(PROJECT_ROOT, 'CatPrinterBLE.exe'),
};

export function setPrintConfig(config: Partial<PrintConfig>): void {
  Object.assign(defaultConfig, config);
}

export function printPhoto(filepath: string): Promise<void> {
  const config = defaultConfig;

  switch (config.type) {
    case 'exe':
      return printViaExe(filepath, config);
    case 'usb':
      return printViaThermalPrinter(filepath, config);
    default:
      return printViaExe(filepath, config);
  }
}

function printViaExe(filepath: string, config: PrintConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const exePath = config.exePath || 'CatPrinterBLE.exe';
    const proc = spawn(exePath, ['-p', '100', '1bpp', 'FloydSteinberg', filepath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });

    proc.on('error', (err) => reject(new Error(`Print spawn failed: ${err.message}`)));
    proc.on('exit', (code) => {
      if (code === 0) {
        if (stderr) logger.warn({ stderr }, 'Print stderr');
        logger.info({ stdout }, 'Print success');
        resolve();
      } else {
        reject(new Error(`Print failed with code ${code}: ${stderr}`));
      }
    });
  });
}

async function printViaThermalPrinter(
  filepath: string,
  config: PrintConfig
): Promise<void> {
  try {
    const { ThermalPrinter, PrinterTypes, CharacterSet } = await import(
      'node-thermal-printer'
    );

    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: config.interface || 'usb',
      width: config.width || 58,
      characterSet: CharacterSet.PC437_USA,
    });

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      throw new Error('Printer not connected');
    }

    printer.printImage(filepath);
    printer.cut();
    await printer.execute();
    logger.info('Print success via node-thermal-printer');
  } catch (error) {
    logger.error(error, 'Thermal printer failed');
    throw error;
  }
}
