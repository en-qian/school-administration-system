import fs from 'fs';
import csv from 'csv-parser';
import { CsvItem } from 'CsvItem';
import crypto from 'crypto';

export const convertToArray = <T>(input: T | T[]) => {
  return Array.isArray(input) ? input : [input];
};

export const generateId = (segmentLength: number, split?: boolean) => {
  const segments = 5;

  const remainder = segmentLength % 5;

  segmentLength =
    remainder <= 5 - remainder
      ? segmentLength - remainder
      : segmentLength + (5 - remainder);

  const CHARS =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const generateSegment = (length: number) =>
    new Array(length)
      .fill('')
      .map(() => CHARS[Math.floor(Math.random() * CHARS.length)])
      .join('');

  return new Array(segments)
    .fill('')
    .map(() => generateSegment(segmentLength / segments))
    .join(split ? '-' : '');
};

export const hashPassword = (password: string) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

export const convertCsvToJson = (filePath: string): Promise<CsvItem[]> => {
  const results: CsvItem[] = [];
  const stream = fs.createReadStream(filePath).pipe(csv());

  return new Promise((resolve, reject) => {
    stream.on('data', (data: CsvItem) => results.push(data));
    stream.on('end', () => resolve(results));
    stream.on('error', err => reject(err));
  });
};
