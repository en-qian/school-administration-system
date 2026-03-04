import * as mysql from 'mysql2';
import { AsyncLocalStorage } from 'async_hooks';
import type { PoolConnection } from 'mysql2/promise';
import type { MainDatabase } from '../types/database';

type PrimitiveType = string | number | boolean | null;

export const connectionPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_SCHEMA,
  connectionLimit: 100,
});

export const promisePool = connectionPool.promise();

if (process.env.NODE_ENV !== 'test') {
  connectionPool.getConnection((err, connection) => {
    if (err) {
      console.error(new Date(), err);
    }
    if (connection) connection.release();
  });
}

/** Reformat sql query with normal string */
function reformatSQLQuery(strings: string): string;
/** Reformat sql query with template literals/strings */
function reformatSQLQuery(
  strings: TemplateStringsArray,
  ...others: any[]
): string;
/** Remove next lines and tabs */
function reformatSQLQuery(
  payload: string | TemplateStringsArray,
  ...others: any[]
) {
  if (typeof payload === 'string') {
    return payload.replace(/(\r\n|\n|\r|\t)/g, ' ');
  } else {
    let tmp: any[] = [payload[0]];
    others.forEach((e, i) => {
      tmp.push(e);
      tmp.push(payload[i + 1]);
    });
    return tmp.join('').replace(/(\r\n|\n|\r|\t)/g, ' ');
  }
}

export const query = (queryString: string, payload?: any) => {
  return promisePool.query(reformatSQLQuery(queryString), payload);
};

function getLastValue(input: string) {
  const values = String(input).split('.');
  return values[values.length - 1] ?? input;
}

export const transactionQueryStorage = new AsyncLocalStorage<typeof query>();

function createRunQuery<T>(_runQuery: (_query: typeof query) => T) {
  return function runQuery(_query?: typeof query | null) {
    const transactionQuery = transactionQueryStorage.getStore();
    let dbQuery = _query
      ? _query
      : _query === undefined && transactionQuery
        ? transactionQuery
        : query;
    return _runQuery(dbQuery);
  };
}

type TableRecordPayloadCustomQuery = {
  selectQueryString: string;
  wherePayloads: DatabaseValueType[];
};

type TableRecordPayload<Data extends Record<string, any>> = {
  column: keyof Data;
  /** Do this filter even there's no where condition. Default is `false` */
  allowEmptyWhereCondition?: boolean;
  /**
   * This where claus will be ignored if there's no item in `whereParams`
   *
   * @example
   * ```
   * new TableRecord('product_category_relationships', {
   *   selectColumnName: 'product_id',
   *   whereParams: { category_id: ['123', '456'], product_id: 'abc' },
   * })
   *
   * // or we can get from `getTableRecord` method inside `getSelectQuery`
   * getSelectQuery('users').getTableRecord('users.referral_by_user_id', {
   *   'users.referral_by_user_id': NotNull,
   *   'users.status': 'active'
   * });
   *
   *
   * ```
   */
  value: TableRecord<any> | TableRecordPayloadCustomQuery;
};

type QueryRecordPayload<Data extends Record<string, any>> = {
  column: keyof Data;
  /** Do this filter even there's no where condition. Default is `true` */
  allowEmptyWhereCondition?: boolean;
  /**
   * @example
   * ```
   * function getEvents(keyword?: string) {
   *   // create query first, should only select 1 column
   *   const categoryQuery = getSelectQuery('category_relationships')
   *     .leftJoin(
   *       'categories',
   *       'categories.category_id = category_relationships.category_id'
   *     )
   *     .select(
   *       { eventId: 'category_relationships.event_id' },
   *       { 'categories.name': '123' }
   *     );
   *
   *   // use it in where claus
   *   const { runQuery } = getSelectQuery('events').select('*', {
   *     _hasQueryRecord: [
   *       keyword && {
   *         column: 'events.event_id',
   *         value: categoryQuery
   *       }
   *     ],
   *   });
   * }
   * ```
   */
  value: {
    selectStatement: string;
    whereStatement: ReturnType<typeof getWhereStatement>;
  };
};

function isTableRecordPayloadCustomQuery(
  input: any
): input is TableRecordPayloadCustomQuery {
  if (
    Array.isArray(input?.wherePayloads) &&
    typeof input?.selectQueryString === 'string'
  ) {
    return true;
  }

  return false;
}

function getTableRecord<T2 extends Record<string, any>>(
  payload: SelectPayload
) {
  return function (
    columnName: keyof T2,
    options?: Partial<SelectDatabaseValue<T2>> & AdvanceFilter<T2>
  ) {
    const whereStatement = getWhereStatement(options);

    const selectStatement = `
    SELECT ${String(columnName)} 
    ${payload.queryString}
    ${whereStatement.conditions}
`;

    const data: TableRecordPayloadCustomQuery = {
      selectQueryString: selectStatement,
      wherePayloads: whereStatement.payloads,
    };

    return data;
  };
}

function joinCondition(conditions: string, relation = 'AND') {
  // conditions += conditions ? ` ${relation} ` : ' WHERE ';

  return `${conditions} ${
    conditions
      ? `
  ${relation} `
      : `
  WHERE `
  }`;
}

function getWhereStatement<Data extends Record<string, any>>(
  options?: Partial<SelectDatabaseValue<Data>> & AdvanceFilter<Data>,
  _relation?: {
    relation?: ConditionRelation;
    orderBy?: 'ASC' | 'DESC';
    sortBy?: keyof Data;
    limit?: number;
    offset?: number;
  }
) {
  let pagination = '';
  let conditions = '';
  let payloads: DatabaseValueType[] = [];

  const relation = _relation?.relation ?? 'AND';
  const orderBy = _relation?.orderBy;
  const sortBy = _relation?.sortBy;

  let sorting = sortBy ? `ORDER BY ${String(sortBy)} ${orderBy ?? 'ASC'}` : '';

  for (let _k in options) {
    const k = _k as keyof typeof options;

    if (k === '_hasTableRecord') {
      const value = options[k] as
        | TableRecordPayload<Data>
        | (TableRecordPayload<Data> | undefined)[];

      const values = Array.isArray(value) ? value : [value];

      for (const value of values) {
        if (!value) continue;

        const _payload = value.value;
        if (isTableRecordPayloadCustomQuery(_payload)) {
          const { selectQueryString, wherePayloads } = _payload;
          conditions = joinCondition(conditions, relation);
          conditions += ` ${String(value.column)} IN (${selectQueryString} ) `;
          payloads = [...payloads, ...wherePayloads];
        } else {
          const payload = _payload.getPayload();

          const tableName: string = payload.tableName;
          const columnName: string = payload.selectColumnName as string;
          const whereStatement = getWhereStatement(payload.whereParams);

          const { allowEmptyWhereCondition = false } = value;
          const isEmptyCondition = !Boolean(whereStatement.conditions.trim());
          if (isEmptyCondition && !allowEmptyWhereCondition) continue;

          conditions = joinCondition(conditions, relation);
          conditions += ` ${String(value.column)} IN (
    SELECT ${columnName} 
    FROM ${tableName} 
    ${whereStatement.conditions}
    ) `;
          payloads = [...payloads, ...whereStatement.payloads];
        }
      }

      continue;
    } else if (k === '_hasQueryRecord') {
      const value = options[k] as
        | QueryRecordPayload<Data>
        | (QueryRecordPayload<Data> | string | undefined)[];

      const values = Array.isArray(value) ? value : [value];

      for (const value of values) {
        if (!value) continue;
        if (typeof value === 'string') continue;

        const { selectStatement, whereStatement } = value.value;
        const { allowEmptyWhereCondition = true } = value;
        const isEmptyCondition = !Boolean(whereStatement.conditions.trim());
        if (isEmptyCondition && !allowEmptyWhereCondition) continue;

        conditions = joinCondition(conditions, relation);
        conditions += ` ${String(value.column)} IN (${selectStatement}) `;
        payloads = [...payloads, ...whereStatement.payloads];
      }

      continue;
    } else if (k === '_keyword') {
      const value = options[k] as KeywordParams<Data> | undefined;
      if (value === undefined) continue;
      if (!value.value) continue;

      let fields = Array.isArray(value.fields) ? value.fields : [value.fields];
      fields = fields.filter(field => Boolean(field));

      if (fields.length === 0) continue;

      const { getPattern } = value;

      const values: (string | undefined)[] = Array.isArray(value.value)
        ? value.value
        : [value.value];

      let keywordConditions: { conditions: string; payloads: any[] }[] = [];

      for (const value of values) {
        if (!value) continue;
        if (typeof value !== 'string') continue;

        const keywordCondition = getSearchCondition(fields as string[], value, {
          getPattern,
        });

        if (keywordCondition) {
          keywordConditions = [
            ...keywordConditions,
            {
              conditions: keywordCondition.conditions,
              payloads: keywordCondition.payloads,
            },
          ];
        }
      }

      if (keywordConditions.length > 0) {
        conditions = joinCondition(conditions, relation);
        if (keywordConditions.length === 1) {
          const keywordCondition = keywordConditions[0]!;
          conditions += keywordCondition.conditions;
          payloads = [...payloads, ...keywordCondition.payloads];
        } else {
          const keywordCondition = keywordConditions
            .map(kc => kc.conditions)
            .join(' OR ');

          conditions += ` (${keywordCondition}) `;
          payloads = [
            ...payloads,
            // @ts-ignore
            ...keywordConditions.flatMap(kc => kc.payloads),
          ];
        }
      }

      continue;
    } else if (k === '_customFilter') {
      const value = options[k];
      if (value === undefined) continue;

      conditions = joinCondition(conditions, relation);
      conditions += ` (${value}) `;

      continue;
    } else if (String(k).startsWith('_')) {
      // ignore key that start with underscore
      continue;
    }

    const value = (options as Partial<SelectDatabaseValue<Data>>)[k];

    if (value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;

    if (value === null) {
      conditions = joinCondition(conditions, relation);
      conditions += ` ${String(k)} IS NULL `;
    } else if (value === NotNull || value instanceof NotNull) {
      conditions = joinCondition(conditions, relation);
      conditions += ` ${String(k)} IS NOT NULL `;
    } else if (Array.isArray(value)) {
      conditions = joinCondition(conditions, relation);
      const placeholders = getQueryPlaceholder(value.length);
      conditions += ` ${String(k)} IN (${placeholders}) `;
      payloads = [...payloads, ...value];
    } else if (typeof value === 'object') {
      const specialOperatorTypes = [
        'not',
        'not_null',
      ] satisfies SpecialOperator<any>['type'][];

      if (specialOperatorTypes.includes(value.type)) {
        const _value = value as SpecialOperator<string | number>;

        if (_value.type === 'not') {
          const v = _value.value;
          if (Array.isArray(v)) {
            if (v.length === 0) {
              // ignore
            } else if (v.length === 1) {
              conditions = joinCondition(conditions, relation);
              conditions += ` ${String(k)} != ? `;
              payloads = [...payloads, ...v];
            } else {
              conditions = joinCondition(conditions, relation);
              const placeholders = getQueryPlaceholder(v.length);
              conditions += ` ${String(k)} NOT IN (${placeholders}) `;
              payloads = [...payloads, ...v];
            }
          } else {
            if (v !== undefined) {
              conditions = joinCondition(conditions, relation);
              conditions += ` ${String(k)} != ? `;
              payloads.push(v);
            }
          }
        } else if (_value.type === 'not_null') {
          conditions = joinCondition(conditions, relation);
          conditions += ` ${String(k)} IS NOT NULL `;
        }
      } else {
        const _value = value as DateOperator;

        let startAt: Date | undefined;
        let endAt: Date | undefined;
        if (_value.type === 'earlier') {
          endAt = _value.value;
        }
        if (_value.type === 'latter') {
          startAt = _value.value;
        }
        if (_value.type === 'between') {
          startAt = _value.value[0];
          endAt = _value.value[1];
        }

        if (startAt) {
          conditions = joinCondition(conditions, relation);
          conditions += ` ${String(k)} >= ? `;
          payloads.push(startAt);
        }

        if (endAt) {
          conditions = joinCondition(conditions, relation);
          conditions += ` ${String(k)} <= ? `;
          payloads.push(endAt);
        }
      }
    } else {
      conditions = joinCondition(conditions, relation);
      conditions += ` ${String(k)} = ? `;
      payloads.push(value as any);
    }
  }

  if (typeof _relation !== 'string') {
    if (_relation?.limit) {
      pagination += ` LIMIT ? `;
      payloads.push(_relation.limit);

      if (_relation?.offset) {
        pagination += ` OFFSET ? `;
        payloads.push(_relation.offset);
      }
    }
  }

  return { conditions, sorting, pagination, payloads };
}

export type PoolQuery = (
  query: string,
  payload?: any[]
) => ReturnType<PoolConnection['query']>;
export type QueryFunction<T> = (poolQuery: PoolQuery) => Promise<T>;
export async function runTransaction<T>(queryFunction: QueryFunction<T>) {
  const connection = await promisePool.getConnection();
  await connection.beginTransaction();

  try {
    const query: PoolQuery = (rawQueryString, payload = []) => {
      const queryString = reformatSQLQuery(rawQueryString);
      return connection.query(queryString, payload);
    };

    const result = await transactionQueryStorage.run(query, () =>
      queryFunction(query)
    );

    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    // Throw the error again so others can catch it
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * This function is generating update queries and corresponding payloads to update database column optionally.
 * The update query will be like `columnName = ?`.
 * If the value in `obj` is `undefined`, it will not update the corresponding database column.
 * @param obj Object with optional key
 */
export const getOptionalUpdateQueries =
  <T1 extends { [k: string]: any }>(obj: T1) =>
  <T2>(
    keyMappings: { [k in keyof Required<T1>]: keyof T2 },
    casting?: {
      [k in keyof Partial<T1>]: (value: T1[k]) => PrimitiveType | Date;
    }
  ) => {
    let payloads: (PrimitiveType | Date)[] = [];
    let queries: string[] = [];

    for (let k in obj) {
      const key = k as keyof T1;
      const columnName = keyMappings[key];

      if (columnName === undefined || obj[key] === undefined) continue;

      queries.push(`${columnName as string} = ? `);
      if (casting && casting[k]) {
        payloads.push(casting[k]!(obj[k]));
      } else {
        payloads.push(obj[key]);
      }
    }

    return { queries, payloads };
  };

const reservedOperators = ['NOW()'] as const;
type CustomWhereFilter = string;
type ReservedOperator = (typeof reservedOperators)[number];
type GetUpdateData<
  T extends ExcludeDefaultField<MainDatabase[keyof MainDatabase]>,
> = {
  [k in keyof T]?: T[k] extends Date | null
    ? (Date | null) | ReservedOperator
    : T[k];
};
type AdvanceFilter<T extends Record<string, any>> = {
  _keyword?: KeywordParams<T>;
  /** Please make sure the value is sanitized */
  _customFilter?: CustomWhereFilter;
  _hasTableRecord?:
    | TableRecordPayload<T>
    | (TableRecordPayload<T> | undefined)[];
  _hasQueryRecord?:
    | QueryRecordPayload<T>
    | (QueryRecordPayload<T> | string | undefined)[];
};

export const getUpdateQuery = <T1 extends TableName>(
  tableName: T1,
  data: GetUpdateData<ExcludeDefaultField<MainDatabase[T1]>>,
  options: Partial<SelectDatabaseValue<MainDatabase[T1]>>,
  relation: 'AND' | 'OR' = 'AND'
) => {
  let payloads: any[] = [];
  let queries: string[] = [];
  let hasUpdateField = false;

  for (let k in data) {
    const columnName = k as keyof typeof data;
    const value = data[columnName];
    if (value === undefined) continue;

    hasUpdateField = true;
    if (reservedOperators.includes(value as any)) {
      queries.push(`${columnName as string} = ${value} `);
    } else {
      queries.push(`${columnName as string} = ? `);
      payloads.push(value);
    }
  }

  const whereStatement = getWhereStatement(options, { relation });
  payloads.push(...whereStatement.payloads);

  const queryString = `
    UPDATE ${tableName} 
    SET ${queries.join(', ')} 
    ${whereStatement.conditions}
  `;

  const runQuery = createRunQuery(async query => {
    // insert items cannot be empty
    if (!hasUpdateField) return;
    return await query(queryString, payloads);
  });

  return { queryString, payloads, runQuery };
};

export class NotNull {}

export class TableRecord<T extends keyof MainDatabase> {
  private _payload: {
    tableName: T;
    selectColumnName: keyof MainDatabase[T];
    whereParams: Parameters<typeof getWhereStatement<MainDatabase[T]>>[0];
  };

  constructor(
    tableName: T,
    payload: {
      selectColumnName: keyof MainDatabase[T];
      whereParams: Parameters<typeof getWhereStatement<MainDatabase[T]>>[0];
    }
  ) {
    this._payload = { tableName, ...payload };
  }

  getPayload() {
    return this._payload;
  }
}

type SpecialOperator<T> =
  | { type: 'not_null' }
  | { type: 'not'; value: T | T[] };
type TableName = keyof MainDatabase;
type DatabaseValueType = string | number | Date | null;
type AddNotNull<T> = null extends T ? T | NotNull : T;
type AddOperator<T> = SpecialOperator<T> | T;
type ExcludeDefaultField<T> = Omit<T, 'created_at' | 'updated_at' | 'id'>;
type DateOperator =
  | { type: 'latter'; value: Date | undefined }
  | { type: 'earlier'; value: Date | undefined }
  | { type: 'between'; value: [Date | undefined, Date | undefined] };
type SelectDatabaseValue<T extends Record<string, any>> = {
  [K in keyof T as T[K] extends Date | null ? never : K]:
    | AddNotNull<AddOperator<T[K]>>
    | T[K][];
} & {
  [K in keyof T as T[K] extends Date | null ? K : never]: null extends T[K]
    ? DateOperator | null | NotNull
    : DateOperator;
};

export const getInsertQuery = <T1 extends TableName>(
  tableName: T1,
  data:
    | ExcludeDefaultField<MainDatabase[T1]>
    | ExcludeDefaultField<MainDatabase[T1]>[]
) => {
  let fields: string[] = [];
  let values = [];
  let payloads: DatabaseValueType[] = [];

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      const currentData = data[i];
      if (!currentData) continue;

      let localValues: any[] = [];

      if (i === 0) {
        // inject fields only in first item in array
        Object.entries(currentData).forEach(([key, value]) => {
          fields.push(key);
          localValues.push(value);
        });
      } else {
        Object.entries(currentData).forEach(([key, value]) => {
          localValues.push(value);
        });
      }

      values.push(` (${Array(localValues.length).fill('?').join(', ')}) `);
      payloads = [...payloads, ...localValues];
    }
  } else {
    Object.entries(data).forEach(([key, value]) => {
      fields.push(key);
      payloads.push(value as DatabaseValueType);
    });

    values = [` (${Array(fields.length).fill('?').join(', ')}) `];
  }

  const fieldString = fields.join(', ');
  const valueString = values.join(', ');

  const queryString = ` INSERT INTO ${tableName} (${fieldString}) VALUES ${valueString}`;

  const runQuery = createRunQuery(async query => {
    // insert items cannot be empty
    if (payloads.length === 0) return;
    return await query(queryString, payloads);
  });

  return { queryString, payloads, runQuery };
};

export const getDeleteQuery = <T1 extends TableName>(
  tableName: T1,
  options: Partial<SelectDatabaseValue<MainDatabase[T1]>>,
  relation: 'AND' | 'OR' = 'AND'
) => {
  const { conditions, payloads } = getWhereStatement(options, {
    relation: relation,
  });

  const queryString = ` DELETE FROM ${tableName} ${conditions} `;

  const runQuery = createRunQuery(query => query(queryString, payloads));

  return { queryString, payloads, runQuery };
};

type ConditionRelation = 'AND' | 'OR';
type KeywordParams<T extends Record<string, any>> = {
  /** We can use `QueryRecordPayload` inside this field. `value` will be ignore if field is `QueryRecordPayload`. */
  fields: keyof T | (keyof T | QueryRecordPayload<T> | undefined)[];
  value: string | undefined | (string | undefined)[];
  getPattern?: (input: string) => SearchPattern;
};
export const getBasicSelectQuery = <T1 extends TableName>(
  tableName: T1,
  options: Partial<SelectDatabaseValue<MainDatabase[T1]>> & {
    _keyword?: KeywordParams<MainDatabase[T1]>;
  },
  _relation?: {
    relation?: ConditionRelation;
    sortBy?: keyof MainDatabase[T1];
    orderBy?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }
) => {
  const { pagination, conditions, payloads, sorting } = getWhereStatement(
    options,
    _relation
  );

  const queryString = ` 
    SELECT * 
    FROM ${tableName} 
    ${conditions} 
    ${sorting}
    ${pagination}
  `;

  const runQuery = createRunQuery(async query => {
    const result = (
      await query(queryString, payloads)
    )[0] as MainDatabase[T1][];
    return result;
  });

  return { queryString, payloads, runQuery };
};

export const getBasicCountQuery = <T1 extends TableName>(
  tableName: T1,
  options: Partial<SelectDatabaseValue<MainDatabase[T1]>> & {
    _keyword?: KeywordParams<MainDatabase[T1]>;
    _count_field?: keyof MainDatabase[T1] | 'id' | '*';
  },
  relation: ConditionRelation = 'AND'
) => {
  const { conditions, payloads } = getWhereStatement(options, {
    relation: relation,
  });

  const countField = options['_count_field'] || '*';

  const queryString = ` 
    SELECT COUNT(${String(countField)}) AS total
    FROM ${tableName} 
    ${conditions} 
  `;

  const runQuery = createRunQuery(async query => {
    type Result = { total: number };
    const result = (await query(queryString, payloads))[0] as Result[];
    const total = result[0]?.total || 0;
    return total;
  });

  return { queryString, payloads, runQuery };
};

export const getBasicSumQuery = <T1 extends TableName>(
  tableName: T1,
  options: Partial<SelectDatabaseValue<MainDatabase[T1]>> & {
    _keyword?: KeywordParams<MainDatabase[T1]>;
    _sum_field?: keyof MainDatabase[T1];
  },
  relation: ConditionRelation = 'AND'
) => {
  const { conditions, payloads } = getWhereStatement(options, {
    relation: relation,
  });

  const sumField = options['_sum_field'] || 'id';

  const queryString = ` 
    SELECT SUM(${String(sumField)}) AS total
    FROM ${tableName} 
    ${conditions} 
  `;

  const runQuery = createRunQuery(async query => {
    type Result = { total: number };
    const result = (await query(queryString, payloads))[0] as Result[];
    const total = Number(result[0]?.total || 0);
    return total;
  });

  return { queryString, payloads, runQuery };
};

type StringOnly<T> = T extends string ? T : never;
type StringOnlyKey<T extends Record<string, any>> = keyof {
  [K in keyof T as T[K] extends string | null ? K : never]: any;
};
export const getGroupCountQuery = <
  T1 extends TableName,
  T2 extends StringOnlyKey<MainDatabase[T1]>,
  T3 extends StringOnly<MainDatabase[T1][T2]>,
>(
  tableName: T1,
  options: {
    groupByField: T2;
    countField?: keyof MainDatabase[T1];
  },
  /**
   * It is used to filter the value of `groupByField` and return
   * the total of it. (it can be accessed by `data` key)
   */
  values: T3[]
) => {
  const { groupByField, countField = 'id' } = options;

  const queryString = ` 
    SELECT COUNT(${String(countField)}) AS total, ${String(groupByField)}
    FROM ${tableName} 
    GROUP BY ${String(groupByField)}
  `;

  const runQuery = createRunQuery(async query => {
    type Result = { total: number } & Record<T2, MainDatabase[T1][T2]>;
    const result = (await query(queryString))[0] as Result[];

    const total = result.reduce((a, v) => a + v.total, 0);

    const data: Record<string, number> = {};

    values.forEach(value => {
      const count =
        result.find(
          a => a[getLastValue(String(groupByField)) as keyof typeof a] === value
        )?.total || 0;
      data[value as string] = count;
    });

    return { total, data: data as Record<T3, number> };
  });

  return { runQuery };
};

export const getQueryPlaceholder = (
  count: number,
  placeholder = '?',
  join = ', '
) => {
  return Array(count).fill(placeholder).join(join);
};

/**
 * Get the equality query condition result from the value provided.
 * It can be used at the top level of the model.
 *
 * @param columnName Column of the table to be filtered
 * @param value Value can be `string` or `null` or `string[]`. If `undefined` provided, it will return `null`.
 * @returns Condition result. `null` means this condition should not be applied.
 *
 * @example
 *
 * let conditions = '';
 * let payloads: any[] = [];
 *
 * const roleCondition = getEqualityCondition('users.role', options?.role);
 * if (roleCondition) {
 *    conditions += conditions ? ' AND ' : ' WHERE ';
 *    conditions += roleCondition.conditions;
 *    payloads = [...payloads, ...roleCondition.payloads];
 * }
 */
export const getEqualityCondition = <T extends string | number>(
  columnName: string,
  value?: T | null | T[]
) => {
  if (value === undefined) return null;

  let conditions = '';
  let payloads: T[] = [];

  if (Array.isArray(value)) {
    if (value.length > 0) {
      const placeholders = getQueryPlaceholder(value.length);
      conditions += ` ${columnName} IN (${placeholders}) `;
      payloads = [...payloads, ...value];
    }
  } else {
    if (value === null) {
      conditions += ` ${columnName} IS NULL `;
    } else {
      conditions += ` ${columnName} = ? `;
      payloads.push(value);
    }
  }

  // no conditions
  if (!conditions) return null;

  return { conditions, payloads };
};

export type SearchPattern =
  | `%${string}%`
  | `%${string}`
  | `${string}%`
  | `${string}%${string}`;
/**
 * Get the search query condition result from the columns & value provided.
 * It can be used at the top level of the model.
 * @param columnName Columns to be searched
 * @param value Keyword to be searched
 * @param options Additional options, can be used to map column name or change search pattern
 * @returns Condition result. `null` means this condition should not be applied.
 *
 * @example
 *
 * let conditions = '';
 * let payloads: any[] = [];
 *
 * const keywordCondition = getSearchCondition(
 *   options.keywordSearchFields,
 *   options.keyword,
 *   {
 *     getColumnName: input => fieldsMapping[input],
 *     getPattern: input => `${input}%`,
 *   }
 * );
 * if (keywordCondition) {
 *   conditions += conditions ? ' AND ' : ' WHERE ';
 *   conditions += keywordCondition.conditions;
 *   payloads = [...payloads, ...keywordCondition.payloads];
 * }
 *
 */
export const getSearchCondition = <T1 extends string, T2 extends string>(
  columnName?:
    | T1
    | QueryRecordPayload<Record<string, any>>
    | (T1 | QueryRecordPayload<Record<string, any>> | undefined)[],
  value?: T2,
  options?: {
    getPattern?: (input: T2) => SearchPattern;
    getColumnName?: (input: T1) => string;
  }
) => {
  if (columnName === undefined) return null;
  if (value === undefined) return null;

  const getPattern = options?.getPattern || ((input: T2) => `%${input}%`);
  const getColumnName = options?.getColumnName || ((input: T1) => input);

  let conditions = '';
  let payloads: any[] = [];

  const columnNames = Array.isArray(columnName) ? columnName : [columnName];

  for (const columnName of columnNames) {
    if (!columnName) continue;

    if (conditions) {
      conditions += ' OR ';
    }

    if (typeof columnName === 'string') {
      conditions += ` ${getColumnName(columnName)} LIKE ? `;
      payloads.push(getPattern(value));
    } else if (typeof columnName === 'object') {
      const value = columnName;
      const { selectStatement, whereStatement } = value.value;

      conditions += ` ${String(value.column)} IN (${selectStatement}) `;
      payloads = [...payloads, ...whereStatement.payloads];
    }
  }

  if (conditions) {
    conditions = ` ( ${conditions} ) `;
  }

  // Old code, no longer needed
  // if (Array.isArray(columnName)) {
  //   if (columnName.length > 0) {
  //     const searchCondition = columnName
  //       .map(cn => ` ${getColumnName(cn)} LIKE ? `)
  //       .join(' OR ');
  //     conditions += ` ( ${searchCondition} ) `;
  //     columnName.forEach(() => payloads.push(getPattern(value)));
  //   }
  // } else {
  //   conditions += ` ${getColumnName(columnName)} LIKE ? `;
  //   payloads.push(getPattern(value));
  // }

  // no conditions
  if (!conditions) return null;

  return { conditions, payloads };
};

export function parseJSON<T>(
  JSONString: string,
  postProcess?: (JSONObject: T) => T
): T;
export function parseJSON<T>(
  JSONString: string | null,
  postProcess?: (JSONObject: T) => T
): T | null;
export function parseJSON<T>(
  JSONString: string | null,
  postProcess?: (JSONObject: T) => T
): T | null {
  if (!JSONString) return null;
  let data = JSON.parse(JSONString) as T;
  if (postProcess) {
    data = postProcess(data);
  }
  return data;
}

export function stringifyJSON(input: Record<string, any>): string;
export function stringifyJSON(
  input: Record<string, any> | undefined
): string | undefined;
export function stringifyJSON(
  input: Record<string, any> | undefined
): string | undefined {
  if (input === undefined) return undefined;
  return JSON.stringify(input);
}

type AppendObjectKey<T1 extends Record<string, any>, N1 extends string> = {
  [K in keyof T1 as K extends string ? `${N1}.${K}` : never]: T1[K];
};

type GetCondition<T1, T2> = `${keyof T1 extends string
  ? keyof T1
  : never} = ${keyof T2 extends string ? keyof T2 : never}`;

type SelectPayload = { queryString: string };

export function getSelectQuery<T1 extends TableName, N1 extends string = T1>(
  mainTableName: T1,
  alias?: N1
) {
  let payload: SelectPayload = {
    queryString: `FROM ${mainTableName} AS ${alias || mainTableName} `,
  };

  function getMethods<Data extends Record<string, any>>(
    payload: SelectPayload
  ) {
    return {
      select: select<Data>(payload),
      /** `runQuery` return `number` */
      selectSum: selectSum<Data>(payload),
      /** `runQuery` return `number` */
      selectCount: selectCount<Data>(payload),
      selectUnique: selectUnique<Data>(payload),
      /**
       * `runQuery` returns
       *
       * ```
       * { sum: number; count: number }
       * ```
       */
      selectSummary: selectSummary<Data>(payload),
      /**
       * `runQuery` returns
       *
       * ```
       * {
       *    total: number;
       *    data: Record<string, number>;
       * }
       * ```
       */
      selectGroupCount: selectGroupCount<Data>(payload),
      /**
       * `runQuery` returns
       *
       * ```
       * {
       *    total: number;
       *    data: Record<string, {
       *      sum: number;
       *      count: number
       *    }>;
       * }
       * ```
       */
      selectGroupSummary: selectGroupSummary<Data>(payload),
      leftJoin: leftJoin<Data>(payload),
      getTableRecord: getTableRecord<Data>(payload),
    };
  }

  function mainTableSelect<T2 extends Record<string, any>>(
    payload: SelectPayload
  ) {
    return function <T3 extends Record<string, keyof MainDatabase[T1]> | '*'>(
      fieldsMapping: T3,
      options?: Partial<SelectDatabaseValue<T2>> & AdvanceFilter<T2>,
      _relation?: {
        relation?: ConditionRelation;
        sortBy?: keyof T2;
        orderBy?: 'ASC' | 'DESC';
        limit?: number;
        offset?: number;
      }
    ) {
      const whereStatement = getWhereStatement(options, _relation);

      const columns =
        typeof fieldsMapping === 'string'
          ? ['*']
          : Object.entries(fieldsMapping).map(
              ([key, value]) => `${String(value)} AS ${key}`
            );

      const selectStatement = `
  SELECT 
    ${columns.join(', \n  ')} 
  ${payload.queryString}
  ${whereStatement.conditions}
  ${whereStatement.sorting}
  ${whereStatement.pagination}
  `;

      const runQuery = createRunQuery(async query => {
        type Data =
          T3 extends Record<string, string>
            ? {
                [K in keyof T3]: T3[K] extends keyof MainDatabase[T1]
                  ? MainDatabase[T1][T3[K]]
                  : never;
              }
            : MainDatabase[T1];
        const result = (
          await query(selectStatement, whereStatement.payloads)
        )[0] as Data[];
        return result;
      });

      return { runQuery, selectStatement, whereStatement };
    };
  }

  function select<T2 extends Record<string, any>>(payload: SelectPayload) {
    return function <T3 extends Record<string, keyof T2>>(
      fieldsMapping: T3,
      options?: Partial<SelectDatabaseValue<T2>> & AdvanceFilter<T2>,
      _relation?: {
        relation?: ConditionRelation;
        sortBy?: keyof T2;
        orderBy?: 'ASC' | 'DESC';
        limit?: number;
        offset?: number;
      }
    ) {
      const whereStatement = getWhereStatement(options, _relation);

      const columns = Object.entries(fieldsMapping).map(
        ([key, value]) => `${String(value)} AS ${key}`
      );

      const selectStatement = `
  SELECT 
    ${columns.join(', \n  ')} 
  ${payload.queryString}
  ${whereStatement.conditions}
  ${whereStatement.sorting}
  ${whereStatement.pagination}
  `;

      const runQuery = createRunQuery(async query => {
        type Data = { [K in keyof T3]: T2[T3[K]] };
        const result = (
          await query(selectStatement, whereStatement.payloads)
        )[0] as Data[];
        return result;
      });

      return { runQuery, selectStatement, whereStatement };
    };
  }

  function selectSum<T1 extends Record<string, any>>(payload: SelectPayload) {
    return function (
      options: Partial<SelectDatabaseValue<T1>> &
        AdvanceFilter<T1> & { _sum_field: keyof T1 },
      _relation?: { relation?: ConditionRelation }
    ) {
      const relation = _relation?.relation || 'AND';
      const sumField = options['_sum_field'];
      const whereStatement = getWhereStatement(options, { relation: relation });

      const selectStatement = `
  SELECT SUM(${String(sumField)}) AS total
  ${payload.queryString}
  ${whereStatement.conditions}
  `;

      const runQuery = createRunQuery(async query => {
        type Result = { total: number };
        const result = (
          await query(selectStatement, whereStatement.payloads)
        )[0] as Result[];
        const total = Number(result[0]?.total) || 0;
        return total;
      });

      return { runQuery, selectStatement, whereStatement };
    };
  }

  function selectCount<T1 extends Record<string, any>>(payload: SelectPayload) {
    return function (
      options: Partial<SelectDatabaseValue<T1>> &
        AdvanceFilter<T1> & { _count_field?: keyof T1 | 'id' | '*' },
      _relation?: { relation?: ConditionRelation }
    ) {
      const relation = _relation?.relation || 'AND';
      const countField = options['_count_field'] || '*';
      const whereStatement = getWhereStatement(options, { relation: relation });

      const selectStatement = `
  SELECT COUNT(${String(countField)}) AS total
  ${payload.queryString}
  ${whereStatement.conditions}
  `;

      const runQuery = createRunQuery(async query => {
        type Result = { total: number };
        const result = (
          await query(selectStatement, whereStatement.payloads)
        )[0] as Result[];
        const total = Number(result[0]?.total) || 0;
        return total;
      });

      return { runQuery, selectStatement, whereStatement };
    };
  }

  function selectSummary<T1 extends Record<string, any>>(
    payload: SelectPayload
  ) {
    return function (
      options: Partial<SelectDatabaseValue<T1>> &
        AdvanceFilter<T1> & {
          _sum_field: keyof T1;
          _count_field?: keyof T1 | 'id' | '*';
        },
      _relation?: { relation?: ConditionRelation }
    ) {
      const relation = _relation?.relation || 'AND';
      const sumField = options['_sum_field'];
      const countField = options['_count_field'] || '*';
      const whereStatement = getWhereStatement(options, { relation: relation });

      const fields = [
        `SUM(${String(sumField)}) AS sum_value`,
        `COUNT(${String(countField)}) AS count_value`,
      ];

      const selectStatement = `
  SELECT ${fields.join(', ')}
  ${payload.queryString}
  ${whereStatement.conditions}
  `;

      const runQuery = createRunQuery(async query => {
        type Result = { sum_value: number; count_value: number };
        const result = (
          await query(selectStatement, whereStatement.payloads)
        )[0] as Result[];
        const sum = Number(result[0]?.sum_value) || 0;
        const count = Number(result[0]?.count_value) || 0;
        return { sum, count };
      });

      return { runQuery, selectStatement, whereStatement };
    };
  }

  function selectGroupCount<T1 extends Record<string, any>>(
    payload: SelectPayload
  ) {
    return function <
      T2 extends StringOnlyKey<T1>,
      T3 extends StringOnly<T1[T2]>,
    >(
      options: Partial<SelectDatabaseValue<T1>> &
        AdvanceFilter<T1> & {
          _count_field?: keyof T1 | 'id' | '*';
          _group_by_field: T2;
        },
      values: T3[],
      _relation?: { relation?: ConditionRelation }
    ) {
      const relation = _relation?.relation || 'AND';
      const countField = options['_count_field'] || '*';
      const groupByField = options['_group_by_field'];
      const whereStatement = getWhereStatement(options, { relation: relation });

      const selectStatement = `
  SELECT COUNT(${String(countField)}) AS total, ${String(groupByField)}
  ${payload.queryString}
  ${whereStatement.conditions}
  GROUP BY ${String(groupByField)}
  `;

      const runQuery = createRunQuery(async query => {
        type Result = { total: number } & Record<T2, T1[T2]>;
        const result = (
          await query(selectStatement, whereStatement.payloads)
        )[0] as Result[];

        const total = result.reduce((a, v) => a + v.total, 0);

        const data: Record<string, number> = {};

        values.forEach(value => {
          const count =
            result.find(
              a =>
                a[getLastValue(String(groupByField)) as keyof typeof a] ===
                value
            )?.total || 0;
          data[value as string] = count;
        });

        return { total, data: data as Record<T3, number> };
      });

      return { runQuery, selectStatement, whereStatement };
    };
  }

  function selectGroupSummary<T1 extends Record<string, any>>(
    payload: SelectPayload
  ) {
    return function <
      T2 extends StringOnlyKey<T1>,
      T3 extends StringOnly<T1[T2]>,
    >(
      options: Partial<SelectDatabaseValue<T1>> &
        AdvanceFilter<T1> & {
          _count_field?: keyof T1 | 'id' | '*';
          _sum_field: keyof T1;
          _group_by_field: T2;
        },
      values?: T3[],
      _relation?: { relation?: ConditionRelation }
    ) {
      const relation = _relation?.relation || 'AND';
      const sumField = options['_sum_field'];
      const countField = options['_count_field'] || '*';
      const groupByField = options['_group_by_field'];
      const whereStatement = getWhereStatement(options, { relation: relation });

      const fields = [
        `${String(groupByField)} AS field_name`,
        `SUM(${String(sumField)}) AS sum_value`,
        `COUNT(${String(countField)}) AS count_value`,
      ];

      const selectStatement = `
  SELECT ${fields.join(', ')}
  ${payload.queryString}
  ${whereStatement.conditions}
  GROUP BY ${String(groupByField)}
  `;

      const runQuery = createRunQuery(async query => {
        type Result = {
          field_name: string;
          sum_value: number;
          count_value: number;
        };
        const result = (
          await query(selectStatement, whereStatement.payloads)
        )[0] as Result[];

        const data: Record<string, { sum: number; count: number }> = {};

        let totalCount = 0;
        let totalSum = 0;

        if (values && values.length > 0) {
          values.forEach(value => {
            const matchedRow = result.find(a => a.field_name === value);
            const sum = Number(matchedRow?.sum_value) || 0;
            const count = Number(matchedRow?.count_value) || 0;

            totalSum += sum;
            totalCount += count;

            data[value as string] = { sum, count };
          });
        } else {
          result.forEach(data => {
            totalSum += Number(data.sum_value);
            totalCount += Number(data.count_value);
          });
        }

        return {
          totalCount,
          totalSum,
          queryResult: result,
          data: data as Record<T3, { sum: number; count: number }>,
        };
      });

      return { runQuery, selectStatement, whereStatement };
    };
  }

  function selectUnique<T1 extends Record<string, any>>(
    payload: SelectPayload
  ) {
    return function <T2 extends StringOnlyKey<T1>>(
      options: Partial<SelectDatabaseValue<T1>> &
        AdvanceFilter<T1> & { _group_by_field: T2 },
      _relation?: {
        relation?: ConditionRelation;
        sortBy?: keyof T1;
        orderBy?: 'ASC' | 'DESC';
        limit?: number;
        offset?: number;
      }
    ) {
      const groupByField = options['_group_by_field'];
      const whereStatement = getWhereStatement(options, _relation);

      const selectStatement = `
  SELECT ${String(groupByField)}
  ${payload.queryString}
  ${whereStatement.conditions}
  GROUP BY ${String(groupByField)}
  ${whereStatement.sorting}
  ${whereStatement.pagination}
  `;

      const runQuery = createRunQuery(async query => {
        const result = (
          await query(selectStatement, whereStatement.payloads)
        )[0] as Record<T2, T1[T2]>[];

        const data = result.map(value => {
          const values = String(groupByField).split('.');
          const tmp = values[values.length - 1];
          // use the column name as object key
          return value[tmp as keyof typeof value];
        });
        return data;
      });

      return { runQuery, selectStatement, whereStatement };
    };
  }

  function leftJoin<T1 extends Record<string, any>>(payload: SelectPayload) {
    return function <T2 extends TableName, N2 extends string = T2>(
      table: { tableName: T2; alias: N2 } | T2,
      condition:
        | GetCondition<AppendObjectKey<MainDatabase[T2], N2>, T1>
        | GetCondition<AppendObjectKey<MainDatabase[T2], N2>, T1>[]
    ) {
      const conditions = Array.isArray(condition) ? condition : [condition];
      const tableName = typeof table === 'string' ? table : table.tableName;
      const alias = typeof table === 'string' ? table : table.alias;

      payload.queryString += `
  LEFT JOIN ${tableName} AS ${alias}
    ON (${conditions.join(' AND ')}) `;

      type ReturnObject = T1 & AppendObjectKey<MainDatabase[T2], N2>;
      const methods = getMethods<ReturnObject>(payload);
      return methods;
    };
  }

  type InitData = AppendObjectKey<MainDatabase[T1], N1>;

  return {
    ...getMethods<InitData>(payload),
    select: mainTableSelect<InitData>(payload),
    // selectSum: selectSum<InitData>(payload),
    // selectCount: selectCount<InitData>(payload),
    // /** test 2 */
    // selectSummary: selectSummary<InitData>(payload),
    // selectGroupCount: selectGroupCount<InitData>(payload),
    // selectGroupSummary: selectGroupSummary<InitData>(payload),
    // leftJoin: leftJoin<InitData>(payload),
  };
}

export default query;
