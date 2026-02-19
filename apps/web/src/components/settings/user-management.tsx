'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, Trash2, Mail, Clock, Shield } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useUsers,
  useInvites,
  useInviteUser,
  useRevokeInvite,
  useUpdateUserRole,
  useRemoveUser,
} from '@/hooks/use-users';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  reviewer: 'Reviewer',
  preparer: 'Preparer',
};

const ROLE_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  reviewer: 'secondary',
  preparer: 'outline',
};

export function UserManagement() {
  const { user: clerkUser } = useUser();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: invites, isLoading: invitesLoading } = useInvites();
  const { mutate: inviteUser, isPending: isInviting } = useInviteUser();
  const { mutate: revokeInvite } = useRevokeInvite();
  const { mutate: updateRole } = useUpdateUserRole();
  const { mutate: removeUser } = useRemoveUser();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('preparer');

  function handleInvite() {
    if (!inviteEmail) return;
    inviteUser(
      { email: inviteEmail, role: inviteRole },
      {
        onSuccess: () => {
          toast.success(`Invite sent to ${inviteEmail}`);
          setInviteEmail('');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  const isLoading = usersLoading || invitesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading team members...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </CardTitle>
          <CardDescription>
            Invite a new user to your firm. They'll receive access when they sign up with the invited email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preparer">Preparer</SelectItem>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} disabled={isInviting || !inviteEmail}>
              <Mail className="mr-2 h-4 w-4" />
              {isInviting ? 'Sending...' : 'Send Invite'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            {users?.length ?? 0} member{(users?.length ?? 0) !== 1 ? 's' : ''} in your firm.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => {
                const isCurrentUser = u.clerkUserId === clerkUser?.id;
                const displayName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {displayName}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {isCurrentUser ? (
                        <Badge variant={ROLE_COLORS[u.role] ?? 'outline'}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </Badge>
                      ) : (
                        <Select
                          value={u.role}
                          onValueChange={(role) =>
                            updateRole(
                              { userId: u.id, role },
                              {
                                onSuccess: () => toast.success('Role updated'),
                                onError: (err) => toast.error(err.message),
                              },
                            )
                          }
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="preparer">Preparer</SelectItem>
                            <SelectItem value="reviewer">Reviewer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {!isCurrentUser && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove user?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove {displayName} from your firm. They will lose access to all firm data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  removeUser(u.id, {
                                    onSuccess: () => toast.success('User removed'),
                                    onError: (err) => toast.error(err.message),
                                  })
                                }
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {invites && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_COLORS[inv.role] ?? 'outline'}>
                        {ROLE_LABELS[inv.role] ?? inv.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          revokeInvite(inv.id, {
                            onSuccess: () => toast.success('Invite revoked'),
                            onError: (err) => toast.error(err.message),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
