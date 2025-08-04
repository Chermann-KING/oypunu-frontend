import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private logLevel: LogLevel = environment.production ? LogLevel.ERROR : LogLevel.DEBUG;

  constructor() {
    if (!environment.production) {
      this.info('🔧 Logger Service initialized in development mode');
    }
  }

  error(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.ERROR, '❌', message, ...optionalParams);
  }

  warn(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.WARN, '⚠️', message, ...optionalParams);
  }

  info(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.INFO, '📋', message, ...optionalParams);
  }

  debug(message: string, ...optionalParams: any[]): void {
    this.log(LogLevel.DEBUG, '🔍', message, ...optionalParams);
  }

  private log(level: LogLevel, emoji: string, message: string, ...optionalParams: any[]): void {
    if (level <= this.logLevel) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${emoji} ${message}`;
      
      switch (level) {
        case LogLevel.ERROR:
          console.error(logMessage, ...optionalParams);
          break;
        case LogLevel.WARN:
          console.warn(logMessage, ...optionalParams);
          break;
        case LogLevel.INFO:
          console.info(logMessage, ...optionalParams);
          break;
        case LogLevel.DEBUG:
          console.log(logMessage, ...optionalParams);
          break;
      }
    }
  }
}