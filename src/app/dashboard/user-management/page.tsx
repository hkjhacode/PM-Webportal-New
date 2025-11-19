
'use client';
import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  } from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { USER_ROLES, DIVISIONS, STATES } from '@/lib/data';
import { Edit, Trash2, PlusCircle, X as XIcon, RotateCcw, Loader2, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, UserRole, UserRoleAssignment } from '@/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';

export default function UserManagementPage() {
  const { hasRole, user, initialized } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isAddUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editedRoles, setEditedRoles] = useState<UserRoleAssignment[]>([]);
  const [newRole, setNewRole] = useState<UserRole | ''>('');
  const [newState, setNewState] = useState('');
  const [newDivision, setNewDivision] = useState('');
  const [isResettingDev, setIsResettingDev] = useState(false);
  const [workingUserId, setWorkingUserId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [resetDisplay, setResetDisplay] = useState<{ password: string; until: number } | null>(null);
  const [remaining, setRemaining] = useState(0);

  const formatRole = (role: UserRoleAssignment) => {
    let formatted = role.role;
    if (role.state) {
      formatted += ` (${role.state}`;
      if (role.division) {
        formatted += ` - ${role.division}`;
      }
      formatted += ')';
    }
    return formatted;
  };

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.push('/');
      return;
    }
    if (!hasRole('Super Admin')) {
      router.push('/dashboard');
    }
  }, [initialized, hasRole, user, router]);

  useEffect(() => {
    if (!initialized || !user || !hasRole('Super Admin')) return;
    (async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          const list: User[] = (data.users || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email, roles: u.roles, avatarUrl: u.avatarUrl }));
          setUsers(list.filter(u => !u.roles.some(r => r.role === 'Super Admin')));
        }
      } catch {}
    })();
  }, [initialized, user, hasRole]);

  const handleAddUser = async () => {
    const nameInput = document.getElementById('name') as HTMLInputElement | null;
    const name = nameInput?.value?.trim() || '';
    if (!name) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await res.json();
      if (res.ok) {
        const newUser: User = { id: data.user.id, name: data.user.name, email: data.user.email, roles: [], avatarUrl: data.user.avatarUrl };
        setUsers(prev => [newUser, ...prev]);
        toast({ title: 'User Created', description: `Email: ${data.user.email} | Temp: ${data.tempPassword}` });
        setSelectedUser(newUser);
        setEditedRoles([]);
        setAddUserDialogOpen(false);
        setEditUserDialogOpen(true);
      } else {
        toast({ variant: 'destructive', title: 'Create Failed', description: data.error || 'Not available in demo mode.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Network Error', description: 'Could not create user.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        // Remove user from local state
        setUsers(prev => prev.filter(u => u.id !== userId));
        toast({
          variant: 'default',
          title: 'User Deleted',
          description: 'The user has been successfully deleted.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Delete Failed',
          description: data.error || 'Could not delete user.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Network Error',
        description: 'Could not delete user. Please try again.',
      });
    }
  }

  const handleResetDevUsers = async () => {
    setIsResettingDev(true);
    try {
      const res = await fetch('/api/dev/seed', { method: 'POST' });
      if (res.ok) {
        toast({ title: 'Reset Complete', description: 'Dev users and demo data refreshed.' });
      } else {
        toast({ variant: 'destructive', title: 'Reset Failed', description: 'Operation not permitted.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Network Error', description: 'Could not reset dev users.' });
    } finally {
      setIsResettingDev(false);
    }
  }

  const handleResetPassword = async (u: User) => {
    setWorkingUserId(u.id);
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset-password' }) });
      const data = await res.json();
      if (res.ok) {
        try { await navigator.clipboard.writeText(data.tempPassword); } catch {}
        const until = Date.now() + 15000;
        setResetDisplay({ password: data.tempPassword, until });
        setRemaining(15);
        toast({ title: 'Password Reset', description: `Temp password copied to clipboard` });
      } else {
        toast({ variant: 'destructive', title: 'Reset Failed', description: data.error || 'Not available in demo mode.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Network Error', description: 'Could not reset password.' });
    } finally {
      setWorkingUserId(null);
    }
  }

  useEffect(() => {
    if (!resetDisplay) return;
    const id = setInterval(() => {
      const secs = Math.max(0, Math.ceil((resetDisplay.until - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) {
        setResetDisplay(null);
        clearInterval(id);
      }
    }, 250);
    return () => clearInterval(id);
  }, [resetDisplay]);

  const handleEditUserClick = (user: User) => {
    setSelectedUser(user);
    setEditedRoles([...user.roles]);
    setEditUserDialogOpen(true);
  }

  const handleSaveUserChanges = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roles: editedRoles }) });
      const data = await res.json();
      if (res.ok) {
        setUsers(prev => prev.map(u => (u.id === selectedUser.id ? { ...u, roles: data.user.roles } : u)));
        toast({ title: 'User Updated', description: `${selectedUser.name}'s roles have been updated.` });
      } else {
        toast({ variant: 'destructive', title: 'Update Failed', description: data.error || 'Not available in demo mode.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Network Error', description: 'Could not update roles.' });
    }
    setEditUserDialogOpen(false);
    setSelectedUser(null);
  };

  const handleAddRoleToUser = () => {
    if (newRole) {
        const roleToAdd: UserRoleAssignment = { role: newRole };
        const stateSpecificRoles: UserRole[] = ['State Advisor', 'State YP', 'Division HOD', 'Division YP'];
        const divisionSpecificRoles: UserRole[] = ['Division HOD', 'Division YP'];
        
        if (stateSpecificRoles.includes(newRole) && newState) {
            roleToAdd.state = newState;
        }
        if (divisionSpecificRoles.includes(newRole) && newDivision) {
            roleToAdd.division = newDivision;
        }

        setEditedRoles([...editedRoles, roleToAdd]);
        setNewRole('');
        setNewState('');
        setNewDivision('');
    }
  }

  const handleRemoveRoleFromUser = (index: number) => {
    setEditedRoles(editedRoles.filter((_, i) => i !== index));
  }


  if (!initialized) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Loading...</p>
        </div>
    );
  }
  if (!user || !hasRole('Super Admin')) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Loading or unauthorized...</p>
        </div>
    );
  }

  const stateSpecificRoles: UserRole[] = ['State Advisor', 'State YP', 'Division HOD', 'Division YP'];
  const divisionSpecificRoles: UserRole[] = ['Division HOD', 'Division YP'];

  return (
    <div className="flex flex-col gap-6">
      {resetDisplay && (
        <div className="fixed top-4 right-4 z-50">
          <Card>
            <CardHeader>
              <CardTitle>Temporary Password</CardTitle>
              <CardDescription>Auto-dismiss in {remaining}s</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-sm break-all">{resetDisplay.password}</div>
            </CardContent>
          </Card>
        </div>
      )}
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">User Management</h1>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                    Manage user roles, states, and divisions.
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleResetDevUsers} disabled={isResettingDev}>
                {isResettingDev ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                Reset Dev Users
              </Button>
            <Dialog open={isAddUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" disabled={isCreating}>
                        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Add New User
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>
                            Fill in the details for the new user.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" placeholder="John Doe" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Email</Label>
                            <div className="col-span-3 text-sm text-muted-foreground">Auto-generated from name (e.g., first.last@gov.in)</div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Password</Label>
                            <div className="col-span-3 text-sm text-muted-foreground">Temporary password generated by system</div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleAddUser} disabled={isCreating}>{isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create User</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Current Roles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-sm text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                        {u.roles.map((r, index) => (
                            <Badge key={index} variant="secondary">
                                {formatRole(r)}
                            </Badge>
                        ))}
                        {u.roles.length === 0 && <Badge variant="outline">No Roles</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditUserClick(u)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleResetPassword(u)} disabled={workingUserId === u.id}>
                      {workingUserId === u.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                      Reset Password
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="icon" variant="destructive">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="sm:max-w-md">
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the user
                                and remove their data from our servers.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(u.id)} className="bg-destructive hover:bg-destructive/90">
                                Continue
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>Edit User: {selectedUser?.name}</DialogTitle>
                <DialogDescription>
                    Add or remove roles and assignments for this user.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                <div className="space-y-2">
                    <Label>Current Roles</Label>
                    <div className="flex flex-wrap gap-2 rounded-lg border bg-muted p-2 min-h-[40px]">
                        {editedRoles.length > 0 ? editedRoles.map((role, index) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                                {formatRole(role)}
                                <button onClick={() => handleRemoveRoleFromUser(index)} className="rounded-full hover:bg-background/50">
                                    <XIcon className="h-3 w-3" />
                                </button>
                            </Badge>
                        )) : <span className="text-sm text-muted-foreground px-2">No roles assigned.</span>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Add New Role</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                {USER_ROLES.filter(r => r !== 'Super Admin').map(role => (
                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {newRole && stateSpecificRoles.includes(newRole) && (
                             <Select value={newState} onValueChange={setNewState}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select State/UT" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATES.map(st => (
                                        <SelectItem key={st} value={st}>{st}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {newRole && divisionSpecificRoles.includes(newRole) && (
                            <>
                                <Input 
                                    value={newDivision} 
                                    onChange={(e) => setNewDivision(e.target.value)}
                                    placeholder="Enter Division (e.g., Education, Health)" 
                                    list="divisions-list"
                                />
                                <datalist id="divisions-list">
                                    {DIVISIONS.map(div => (
                                        <option key={div} value={div} />
                                    ))}
                                </datalist>
                            </>
                        )}
                    </div>
                    <div className="pt-2">
                         <Button onClick={handleAddRoleToUser} disabled={!newRole}>Add Role</Button>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditUserDialogOpen(false)}>Cancel</Button>
                <Button type="submit" onClick={handleSaveUserChanges}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
