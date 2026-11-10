import { pgTable, primaryKey, uuid, varchar } from 'drizzle-orm/pg-core'
import { roles } from './roles'
import { permissions } from './permissions'

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: varchar('permission_id', { length: 100 })
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
)

export type RolePermission = typeof rolePermissions.$inferSelect
