import { useMemo } from 'react';

import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { DateTime } from 'luxon';

import { authClient } from '@documenso/auth/client';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import type { DataTableColumnDef } from '@documenso/ui/primitives/data-table';
import { DataTable } from '@documenso/ui/primitives/data-table';
import { Skeleton } from '@documenso/ui/primitives/skeleton';
import { TableCell } from '@documenso/ui/primitives/table';

export const SettingsSecuritySessionTable = () => {
  const { _ } = useLingui();
  const { data, isLoading, isLoadingError } = trpc.auth.getActiveSessions.useQuery();

  const results = data ?? [];

  const columns = useMemo(() => {
    return [
      {
        header: _(msg`Device`),
        accessorKey: 'userAgent',
        cell: ({ row }) => {
          const userAgent = row.original.userAgent || _(msg`Unknown`);
          return userAgent.length > 50 ? `${userAgent.substring(0, 50)}...` : userAgent;
        },
      },
      {
        header: _(msg`IP Address`),
        accessorKey: 'ipAddress',
        cell: ({ row }) => row.original.ipAddress || _(msg`Unknown`),
      },
      {
        header: _(msg`Last Active`),
        accessorKey: 'updatedAt',
        cell: ({ row }) =>
          DateTime.fromJSDate(row.original.updatedAt || row.original.createdAt).toRelative(),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Button
            variant="destructive"
            size="sm"
            onClick={async () =>
              authClient.signOutSession({
                sessionId: row.original.id,
                redirectPath: '/settings/security',
              })
            }
          >
            {_(msg`Sign Out`)}
          </Button>
        ),
      },
    ] satisfies DataTableColumnDef<(typeof results)[number]>[];
  }, []);

  return (
    <DataTable
      columns={columns}
      data={results}
      hasFilters={false}
      error={{
        enable: isLoadingError,
      }}
      skeleton={{
        enable: isLoading,
        rows: 3,
        component: (
          <>
            <TableCell>
              <Skeleton className="h-4 w-40 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20 rounded-full" />
            </TableCell>
          </>
        ),
      }}
    />
  );
};
