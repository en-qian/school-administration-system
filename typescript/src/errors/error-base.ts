import ErrorCodes from '../const/error-code';

type ERROR_CODE = keyof typeof ErrorCodes;

// Make error base throwable with fully typed options
class ErrorBase extends Error {
  private errorCode: ERROR_CODE;
  private httpStatusCode: number;

  constructor(errorCode: ERROR_CODE, message: string, httpStatusCode?: number) {
    super(message);

    this.errorCode = errorCode;
    this.httpStatusCode = httpStatusCode ?? ErrorCodes[errorCode];
  }

  public getMessage(): string {
    return this.message;
  }

  public getErrorCode(): ERROR_CODE {
    return this.errorCode;
  }

  public getHttpStatusCode(): number {
    return this.httpStatusCode;
  }
}

export default ErrorBase;
