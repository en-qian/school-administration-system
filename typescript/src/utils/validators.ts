import moment from 'moment';

type ValueType = 'string' | 'number' | 'Date' | 'Array';

export const isValidPasswordFormat = (
  password: string,
  passwordLength: number
) => {
  const regex = new RegExp(
    `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[?@!$]).{${passwordLength},}$`
  );
  return regex.test(password);
};

export const isString = (input: any): input is string => {
  return typeof input === 'string';
};

export const isNumber = (input: any): input is number => {
  return typeof input === 'number' && !Number.isNaN(input);
};

export const isInteger = (input: any): input is number => {
  if (typeof input !== 'number') return false;
  if (Number.isNaN(input)) return false;
  return Math.floor(input) === input;
};

export const isTwoDecimal = (input: any): boolean => {
  if (typeof input !== 'number') return false;
  if (Number.isNaN(input)) return false;
  return /^\d+(\.\d{1,2})?$/.test(input.toString());
};

export const isDate = (input: any): input is Date => {
  return input instanceof Date && input.toString() !== 'Invalid Date';
};

export const isValidDateTime = (dateTimeString: string): boolean => {
  const format = 'YYYY-MM-DD hh:mm:ss A';
  return moment(dateTimeString, format, true).isValid();
};

export const isArray = <T extends { [key: string]: any }>(
  input: any,
  sample?: T
): input is Array<T> => {
  if (!Array.isArray(input)) return false;
  if (!sample) return true;

  const isInterfaceMatch = isInterface(sample);
  for (let i = 0; i < input.length; i++) {
    if (!isInterfaceMatch(input[i])) {
      return false;
    }
  }

  return true;
};

export const isInterface = (sample: { [key: string]: any }) => (input: any) => {
  if (input === null || input === undefined) return false;
  try {
    for (let k in sample) {
      if (
        Number.isNaN(input[k]) ||
        typeof sample[k] !== typeof input[k] ||
        isArray(sample[k]) !== isArray(input)
      ) {
        return false;
      }
    }
    return true;
  } catch (err) {
    return false;
  }
};

export const isEmail = (input: any): input is string => {
  const regex =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(input);
};

/**
 * @param minLength Minimum length.
 * @param type (Optional) Additional type checking.
 */
export const min =
  (minLength: number, type?: Exclude<ValueType, 'Date'>) => (input: any) => {
    if (
      (type === 'string' && !isString(input)) ||
      (type === 'number' && !isNumber(input)) ||
      (type === 'Array' && !isArray(input))
    )
      return false;

    if (isString(input)) return input.length >= minLength;
    if (isNumber(input)) return input >= minLength;
    if (isArray(input)) return input.length >= minLength;
    return false;
  };

/**
 * @param maxLength Maximum length.
 * @param type (Optional) Additional type checking.
 */
export const max =
  (maxLength: number, type?: Exclude<ValueType, 'Date'>) => (input: any) => {
    // type checker if type is provided
    if (
      (type === 'string' && !isString(input)) ||
      (type === 'number' && !isNumber(input)) ||
      (type === 'Array' && !isArray(input))
    )
      return false;

    if (isString(input)) return input.length <= maxLength;
    if (isNumber(input)) return input <= maxLength;
    if (isArray(input)) return input.length <= maxLength;
    return false;
  };

export const isValidIPv4 = (ip: string): boolean => {
  const ipv4Pattern =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Pattern.test(ip);
};

export const isValidIPv6 = (ip: string): boolean => {
  const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}(?:[0-9a-fA-F]{1,4}|:)$/;
  return ipv6Pattern.test(ip);
};

export const isValidIP = (ip: string): boolean => {
  return isValidIPv4(ip) || isValidIPv6(ip);
};

export const isPhoneNumber = (input: any): input is string => {
  const regex = /^([\d ()+-]){5,15}$/;
  return regex.test(input);
};

type HashAlgorithm = 'sha256' | 'sha512';

export const isValidHash =
  (algorithm: HashAlgorithm) =>
  (input: any): boolean => {
    const regex =
      algorithm === 'sha512' ? /^[a-fA-F0-9]{128}$/ : /^[a-fA-F0-9]{64}$/;
    return regex.test(input);
  };

export const hasKey =
  <T extends Record<string, any>>(sample: T) =>
  (input: any): input is keyof T => {
    return Object.keys(sample).includes(input);
  };

export const isSQLInjectionString = (input: any) => {
  const sqlInjectionPattern = /[\;\'\"=\(\)]/;

  return sqlInjectionPattern.test(input);
};
