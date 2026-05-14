/**
 * 数据库模块统一导出
 */
export { db, pool, checkDatabaseConnection, closeDatabaseConnection } from './client'
export type { Database } from './client'
export * from './schema'
export * as schema from './schema'
