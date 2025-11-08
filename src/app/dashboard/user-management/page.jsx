'use client';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { USERS, USER_ROLES, DIVISIONS, STATES } from '@/lib/data';
import { Edit, Trash2, PlusCircle, X as XIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
export default function UserManagementPage() {
    const { hasRole, user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isAddUserDialogOpen, setAddUserDialogOpen] = useState(false);
    const [isEditUserDialogOpen, setEditUserDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [editedRoles, setEditedRoles] = useState([]);
    const [newRole, setNewRole] = useState('');
    const [newState, setNewState] = useState('');
    const [newDivision, setNewDivision] = useState('');
    const formatRole = (role) => {
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
        if (!user) {
            router.push('/');
            return;
        }
        if (!hasRole('Super Admin')) {
            router.push('/dashboard');
        }
    }, [hasRole, user, router]);
    const handleAddUser = () => {
        toast({
            title: 'User Created',
            description: 'The new user has been successfully created.',
        });
        setAddUserDialogOpen(false);
    };
    const handleDeleteUser = () => {
        toast({
            variant: 'destructive',
            title: 'User Deleted',
            description: 'The user has been successfully deleted.',
        });
    };
    const handleEditUserClick = (user) => {
        setSelectedUser(user);
        setEditedRoles([...user.roles]);
        setEditUserDialogOpen(true);
    };
    const handleSaveUserChanges = () => {
        if (selectedUser) {
            // Here you would typically call an API to save the changes.
            // For now, we'll just show a toast.
            console.log('Saving changes for user:', selectedUser.id, 'New roles:', editedRoles);
            toast({
                title: 'User Updated',
                description: `${selectedUser.name}'s roles have been updated.`
            });
        }
        setEditUserDialogOpen(false);
        setSelectedUser(null);
    };
    const handleAddRoleToUser = () => {
        if (newRole) {
            const roleToAdd = { role: newRole };
            const stateSpecificRoles = ['State Advisor', 'State YP', 'Division HOD', 'Division YP'];
            const divisionSpecificRoles = ['Division HOD', 'Division YP'];
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
    };
    const handleRemoveRoleFromUser = (index) => {
        setEditedRoles(editedRoles.filter((_, i) => i !== index));
    };
    if (!user || !hasRole('Super Admin')) {
        return (<div className="flex h-screen items-center justify-center">
            <p>Loading or unauthorized...</p>
        </div>);
    }
    const stateSpecificRoles = ['State Advisor', 'State YP', 'Division HOD', 'Division YP'];
    const divisionSpecificRoles = ['Division HOD', 'Division YP'];
    return (<div className="flex flex-col gap-6">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">User Management</h1>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                    Manage user roles, states, and divisions.
                </CardDescription>
            </div>
            <Dialog open={isAddUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                <DialogTrigger asChild>
                    <Button size="sm">
                        <PlusCircle className="mr-2 h-4 w-4"/>
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
                            <Input id="name" placeholder="John Doe" className="col-span-3"/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">Email</Label>
                            <Input id="email" type="email" placeholder="john.d@example.com" className="col-span-3"/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right">Password</Label>
                            <Input id="password" type="password" placeholder="••••••••" className="col-span-3"/>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleAddUser}>Create User</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
              {USERS.filter(u => !u.roles.some(r => r.role === 'Super Admin')).map((u) => (<TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-sm text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                        {u.roles.map((r, index) => (<Badge key={index} variant="secondary">
                                {formatRole(r)}
                            </Badge>))}
                        {u.roles.length === 0 && <Badge variant="outline">No Roles</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditUserClick(u)}>
                      <Edit className="mr-2 h-4 w-4"/> Edit
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="icon" variant="destructive">
                                <Trash2 className="h-4 w-4"/>
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
                            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
                                Continue
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>Edit User: {selectedUser === null || selectedUser === void 0 ? void 0 : selectedUser.name}</DialogTitle>
                <DialogDescription>
                    Add or remove roles and assignments for this user.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                <div className="space-y-2">
                    <Label>Current Roles</Label>
                    <div className="flex flex-wrap gap-2 rounded-lg border bg-muted p-2 min-h-[40px]">
                        {editedRoles.length > 0 ? editedRoles.map((role, index) => (<Badge key={index} variant="secondary" className="flex items-center gap-1">
                                {formatRole(role)}
                                <button onClick={() => handleRemoveRoleFromUser(index)} className="rounded-full hover:bg-background/50">
                                    <XIcon className="h-3 w-3"/>
                                </button>
                            </Badge>)) : <span className="text-sm text-muted-foreground px-2">No roles assigned.</span>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Add New Role</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        <Select value={newRole} onValueChange={(value) => setNewRole(value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role"/>
                            </SelectTrigger>
                            <SelectContent>
                                {USER_ROLES.filter(r => r !== 'Super Admin').map(role => (<SelectItem key={role} value={role}>{role}</SelectItem>))}
                            </SelectContent>
                        </Select>
                        {newRole && stateSpecificRoles.includes(newRole) && (<Select value={newState} onValueChange={setNewState}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select State"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {STATES.map(st => (<SelectItem key={st} value={st}>{st}</SelectItem>))}
                                </SelectContent>
                            </Select>)}
                        {newRole && divisionSpecificRoles.includes(newRole) && (<Select value={newDivision} onValueChange={setNewDivision}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Division"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {DIVISIONS.map(div => (<SelectItem key={div} value={div}>{div}</SelectItem>))}
                                </SelectContent>
                            </Select>)}
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
    </div>);
}
